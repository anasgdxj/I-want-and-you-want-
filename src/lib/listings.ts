import { LISTING_IMAGES_BUCKET, supabase } from './supabase';
import { getDemoState, setDemoState } from './demoStore';
import { fileToDataUrl } from './image';
import { getErrorMessage, normalizeArabic } from './utils';
import type {
  Condition,
  Listing,
  ListingFilters,
  ListingImage,
  ListingStatus,
  OfferType,
} from '../types';

export const PAGE_SIZE = 12;

export interface CreateListingInput {
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  city: string;
  neighborhood: string | null;
  offer_type: OfferType;
  price_syp: number | null;
  swap_preference: string | null;
  accepts_cash_diff: boolean;
  condition: Condition;
  contact_name: string;
  contact_phone: string;
  images: File[];
}

export interface UpdateListingInput {
  title: string;
  description: string | null;
  category: string;
  city: string;
  neighborhood: string | null;
  offer_type: OfferType;
  price_syp: number | null;
  swap_preference: string | null;
  accepts_cash_diff: boolean;
  condition: Condition;
}

function sortListingImages(images: ListingImage[] | undefined): ListingImage[] {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchListingsPage(
  filters: ListingFilters,
  page: number,
  pageSize = PAGE_SIZE,
): Promise<{ items: Listing[]; hasMore: boolean }> {
  if (!supabase) {
    const state = getDemoState();
    const normalizedQ = normalizeArabic(filters.query);

    const filtered = state.listings
      .filter((l) => l.status === 'active')
      .filter((l) => {
        if (filters.city && l.city !== filters.city) return false;
        if (filters.category && l.category !== filters.category) return false;
        if (filters.offerType && l.offer_type !== filters.offerType) return false;
        if (filters.minPrice != null && (l.price_syp === null || l.price_syp < filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice != null && (l.price_syp === null || l.price_syp > filters.maxPrice)) {
          return false;
        }
        if (normalizedQ) {
          const hay = normalizeArabic(
            `${l.title} ${l.description ?? ''} ${l.neighborhood ?? ''} ${l.swap_preference ?? ''}`,
          );
          return hay.includes(normalizedQ);
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const start = page * pageSize;
    const slice = filtered.slice(start, start + pageSize);
    return { items: slice, hasMore: start + pageSize < filtered.length };
  }

  let query = supabase
    .from('listings')
    .select(
      '*, images:listing_images(*), owner:profiles!listings_owner_id_fkey(id, full_name, city, avatar_url, rating_avg, rating_count, created_at)',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.city) query = query.eq('city', filters.city);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.offerType) query = query.eq('offer_type', filters.offerType);
  if (filters.minPrice != null) query = query.gte('price_syp', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('price_syp', filters.maxPrice);

  const normalizedQ = normalizeArabic(filters.query);
  // عند وجود نص بحث عربي نجلب دفعة أوسع لتطبيق التطبيع العربي الدقيق
  const from = normalizedQ ? 0 : page * pageSize;
  const to = normalizedQ ? 199 : from + pageSize;

  const { data, error } = await query.range(from, to);
  if (error) throw new Error(getErrorMessage(error));

  let rows = ((data ?? []) as Listing[]).map((item) => ({
    ...item,
    images: sortListingImages(item.images),
  }));

  if (normalizedQ) {
    rows = rows.filter((l) => {
      const hay = normalizeArabic(
        `${l.title} ${l.description ?? ''} ${l.neighborhood ?? ''} ${l.swap_preference ?? ''}`,
      );
      return hay.includes(normalizedQ);
    });
    const start = page * pageSize;
    const paged = rows.slice(start, start + pageSize);
    return { items: paged, hasMore: start + pageSize < rows.length };
  }

  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!supabase) {
    const state = getDemoState();
    const found = state.listings.find((l) => l.id === id);
    if (!found) return null;
    const owner = state.profiles.find((p) => p.id === found.owner_id) ?? null;
    return { ...found, owner };
  }

  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, images:listing_images(*), owner:profiles!listings_owner_id_fkey(id, full_name, city, avatar_url, rating_avg, rating_count, created_at)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(getErrorMessage(error));
  if (!data) return null;
  const listing = data as Listing;
  return { ...listing, images: sortListingImages(listing.images) };
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  if (!supabase) {
    return getDemoState()
      .listings.filter((l) => l.owner_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*, images:listing_images(*)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return ((data ?? []) as Listing[]).map((item) => ({
    ...item,
    images: sortListingImages(item.images),
  }));
}

export async function uploadUserImage(userId: string, file: File, subfolder = 'listings'): Promise<string> {
  if (!supabase) {
    return fileToDataUrl(file);
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = `${userId}/${subfolder}/${safeName}`;

  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });

  if (error) throw new Error(getErrorMessage(error));
  return path;
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  if (!supabase) {
    const id = `demo-listing-${Date.now()}`;
    const now = new Date().toISOString();
    const uploadedPaths = await Promise.all(
      input.images.map((img) => uploadUserImage(input.owner_id, img)),
    );
    const images: ListingImage[] = uploadedPaths.map((storagePath, index) => ({
      id: `demo-img-${Date.now()}-${index}`,
      listing_id: id,
      storage_path: storagePath,
      sort_order: index,
    }));

    const created: Listing = {
      id,
      owner_id: input.owner_id,
      created_at: now,
      updated_at: now,
      title: input.title.trim(),
      description: input.description,
      category: input.category,
      city: input.city,
      neighborhood: input.neighborhood,
      offer_type: input.offer_type,
      price_syp: input.price_syp,
      swap_preference: input.swap_preference,
      accepts_cash_diff: input.accepts_cash_diff,
      condition: input.condition,
      contact_name: input.contact_name.trim(),
      status: 'active',
      images,
    };

    setDemoState((prev) => ({
      ...prev,
      listings: [created, ...prev.listings],
      phonesByListing: {
        ...prev.phonesByListing,
        [id]: input.contact_phone.trim(),
      },
    }));
    return created;
  }

  const { data: createdRow, error: rpcError } = await supabase.rpc('create_listing_with_contact', {
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_city: input.city,
    p_neighborhood: input.neighborhood,
    p_offer_type: input.offer_type,
    p_price_syp: input.price_syp,
    p_swap_preference: input.swap_preference,
    p_accepts_cash_diff: input.accepts_cash_diff,
    p_condition: input.condition,
    p_contact_name: input.contact_name,
    p_contact_phone: input.contact_phone,
  });

  if (rpcError) throw new Error(getErrorMessage(rpcError));
  const listing = createdRow as Listing;

  if (input.images.length > 0) {
    const uploadedPaths = await Promise.all(
      input.images.map((file) => uploadUserImage(input.owner_id, file)),
    );
    const imageRows = uploadedPaths.map((storagePath, idx) => ({
      listing_id: listing.id,
      storage_path: storagePath,
      sort_order: idx,
    }));
    const { data: savedImages, error: imgError } = await supabase
      .from('listing_images')
      .insert(imageRows)
      .select();

    if (imgError) throw new Error(getErrorMessage(imgError));
    listing.images = (savedImages ?? []) as ListingImage[];
  } else {
    listing.images = [];
  }

  return listing;
}

export async function updateListingDetails(id: string, updates: UpdateListingInput): Promise<Listing> {
  if (!supabase) {
    let updated: Listing | null = null;
    setDemoState((prev) => ({
      ...prev,
      listings: prev.listings.map((l) => {
        if (l.id !== id) return l;
        updated = { ...l, ...updates, updated_at: new Date().toISOString() };
        return updated;
      }),
    }));
    if (!updated) throw new Error('لم يتم العثور على الإعلان');
    return updated;
  }

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select('*, images:listing_images(*)')
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as Listing;
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      listings: prev.listings.map((l) =>
        l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l,
      ),
    }));
    return;
  }

  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if (error) throw new Error(getErrorMessage(error));
}

export async function deleteListing(id: string): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      listings: prev.listings.filter((l) => l.id !== id),
      favorites: prev.favorites.filter((f) => f.listing_id !== id),
    }));
    return;
  }

  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) throw new Error(getErrorMessage(error));
}

export async function revealListingPhone(listingId: string, isAuthenticated: boolean): Promise<string> {
  if (!isAuthenticated) {
    throw new Error('يرجى تسجيل الدخول أولاً لإظهار رقم الهاتف');
  }

  if (!supabase) {
    const phone = getDemoState().phonesByListing[listingId];
    if (!phone) throw new Error('رقم الهاتف غير متوفر لهذا الإعلان');
    return phone;
  }

  const { data, error } = await supabase.rpc('reveal_listing_phone', {
    p_listing_id: listingId,
  });
  if (error) throw new Error(getErrorMessage(error));
  return String(data);
}

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  if (!supabase) {
    return getDemoState()
      .favorites.filter((f) => f.user_id === userId)
      .map((f) => f.listing_id);
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);

  if (error) throw new Error(getErrorMessage(error));
  return ((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id);
}

export async function fetchFavoriteListings(userId: string): Promise<Listing[]> {
  if (!supabase) {
    const state = getDemoState();
    const ids = new Set(state.favorites.filter((f) => f.user_id === userId).map((f) => f.listing_id));
    return state.listings.filter((l) => ids.has(l.id) && l.status === 'active');
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('listing:listings(*, images:listing_images(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));

  const results: Listing[] = [];
  for (const row of (data ?? []) as unknown as { listing: Listing | null }[]) {
    if (row.listing) {
      results.push({
        ...row.listing,
        images: sortListingImages(row.listing.images),
      });
    }
  }
  return results;
}

export async function toggleFavorite(userId: string, listingId: string, currentlyFav: boolean): Promise<boolean> {
  if (!supabase) {
    setDemoState((prev) => {
      if (currentlyFav) {
        return {
          ...prev,
          favorites: prev.favorites.filter((f) => !(f.user_id === userId && f.listing_id === listingId)),
        };
      }
      return {
        ...prev,
        favorites: [
          {
            id: `demo-fav-${Date.now()}`,
            user_id: userId,
            listing_id: listingId,
            created_at: new Date().toISOString(),
          },
          ...prev.favorites,
        ],
      };
    });
    return !currentlyFav;
  }

  if (currentlyFav) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    if (error) throw new Error(getErrorMessage(error));
    return false;
  } else {
    const { error } = await supabase.from('favorites').insert({
      user_id: userId,
      listing_id: listingId,
    });
    if (error) throw new Error(getErrorMessage(error));
    return true;
  }
}

export async function submitReport(listingId: string, reporterId: string, reason: string): Promise<void> {
  const cleaned = reason.trim();
  if (cleaned.length < 3) {
    throw new Error('الرجاء كتابة سبب البلاغ بوضوح');
  }

  if (!supabase) {
    setDemoState((prev) => {
      const exists = prev.reports.some(
        (r) => r.listing_id === listingId && r.reporter_id === reporterId,
      );
      if (exists) {
        throw new Error('لقد أرسلت بلاغاً عن هذا الإعلان مسبقاً');
      }
      return {
        ...prev,
        reports: [
          {
            id: `demo-report-${Date.now()}`,
            listing_id: listingId,
            reporter_id: reporterId,
            reason: cleaned,
            status: 'open',
            created_at: new Date().toISOString(),
          },
          ...prev.reports,
        ],
      };
    });
    return;
  }

  const { error } = await supabase.from('reports').insert({
    listing_id: listingId,
    reporter_id: reporterId,
    reason: cleaned,
  });
  if (error) throw new Error(getErrorMessage(error));
}
