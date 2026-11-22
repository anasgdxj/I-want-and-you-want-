import { supabase } from './supabase';
import { getDemoState, setDemoState } from './demoStore';
import { getErrorMessage } from './utils';
import type { Listing, ListingImage, Profile, UserRating } from '../types';

function sortListingImages(images: ListingImage[] | undefined): ListingImage[] {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchPublicUserProfile(userId: string): Promise<{
  profile: Profile | null;
  listings: Listing[];
  ratings: UserRating[];
}> {
  if (!supabase) {
    const state = getDemoState();
    const profile = state.profiles.find((p) => p.id === userId) ?? null;
    const listings = state.listings
      .filter((l) => l.owner_id === userId && l.status === 'active')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const ratings = state.userRatings
      .filter((r) => r.rated_user_id === userId)
      .map((r) => ({
        ...r,
        rater: state.profiles.find((p) => p.id === r.rater_id) ?? null,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { profile, listings, ratings };
  }

  const [profileRes, listingsRes, ratingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('listings')
      .select('*, images:listing_images(*)')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_ratings')
      .select('*, rater:profiles!user_ratings_rater_id_fkey(id, full_name, city, avatar_url)')
      .eq('rated_user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (profileRes.error) throw new Error(getErrorMessage(profileRes.error));
  if (listingsRes.error) throw new Error(getErrorMessage(listingsRes.error));
  if (ratingsRes.error) throw new Error(getErrorMessage(ratingsRes.error));

  const listings = ((listingsRes.data ?? []) as Listing[]).map((item) => ({
    ...item,
    images: sortListingImages(item.images),
  }));

  return {
    profile: (profileRes.data as Profile | null) ?? null,
    listings,
    ratings: (ratingsRes.data ?? []) as UserRating[],
  };
}

export async function checkCanRateUser(
  raterId: string | undefined,
  ratedUserId: string,
): Promise<boolean> {
  if (!raterId || raterId === ratedUserId) return false;

  if (!supabase) {
    const state = getDemoState();
    const hadConversation = state.conversations.some(
      (c) =>
        (c.buyer_id === raterId && c.seller_id === ratedUserId) ||
        (c.seller_id === raterId && c.buyer_id === ratedUserId),
    );
    if (hadConversation) return true;

    const hadAcceptedSwap = state.swapOffers.some((s) => {
      if (s.status !== 'accepted' && s.status !== 'completed') return false;
      const listing = state.listings.find((l) => l.id === s.listing_id);
      if (!listing) return false;
      return (
        (s.proposer_id === raterId && listing.owner_id === ratedUserId) ||
        (listing.owner_id === raterId && s.proposer_id === ratedUserId)
      );
    });
    return hadAcceptedSwap;
  }

  const { data, error } = await supabase.rpc('can_rate_user', {
    p_rater_id: raterId,
    p_rated_user_id: ratedUserId,
  });

  if (error) return false;
  return Boolean(data);
}

export async function submitUserRating(input: {
  raterId: string;
  ratedUserId: string;
  rating: number;
  comment: string | null;
}): Promise<UserRating> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error('يرجى اختيار تقييم من 1 إلى 5 نجوم');
  }

  if (!supabase) {
    const allowed = await checkCanRateUser(input.raterId, input.ratedUserId);
    if (!allowed) {
      throw new Error('يمكن التقييم فقط بعد محادثة فعلية أو إتمام مقايضة مع هذا المستخدم');
    }

    const now = new Date().toISOString();
    let savedRating: UserRating | null = null;

    setDemoState((prev) => {
      const existing = prev.userRatings.find(
        (r) => r.rater_id === input.raterId && r.rated_user_id === input.ratedUserId,
      );
      const nextRatings = existing
        ? prev.userRatings.map((r) => {
            if (r.id !== existing.id) return r;
            savedRating = {
              ...r,
              rating: input.rating,
              comment: input.comment,
              updated_at: now,
            };
            return savedRating;
          })
        : [
            (savedRating = {
              id: `demo-rating-${Date.now()}`,
              rater_id: input.raterId,
              rated_user_id: input.ratedUserId,
              rating: input.rating,
              comment: input.comment,
              created_at: now,
              updated_at: now,
            }),
            ...prev.userRatings,
          ];

      const userRatingsForTarget = nextRatings.filter(
        (r) => r.rated_user_id === input.ratedUserId,
      );
      const count = userRatingsForTarget.length;
      const avg =
        count > 0
          ? Number(
              (
                userRatingsForTarget.reduce((acc, r) => acc + r.rating, 0) / count
              ).toFixed(2),
            )
          : 0;

      return {
        ...prev,
        userRatings: nextRatings,
        profiles: prev.profiles.map((p) =>
          p.id === input.ratedUserId
            ? { ...p, rating_avg: avg, rating_count: count }
            : p,
        ),
      };
    });

    if (!savedRating) throw new Error('تعذر حفظ التقييم');
    return savedRating;
  }

  const { data, error } = await supabase
    .from('user_ratings')
    .upsert(
      {
        rater_id: input.raterId,
        rated_user_id: input.ratedUserId,
        rating: input.rating,
        comment: input.comment,
      },
      { onConflict: 'rater_id,rated_user_id' },
    )
    .select('*, rater:profiles!user_ratings_rater_id_fkey(id, full_name, city, avatar_url)')
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as UserRating;
}
