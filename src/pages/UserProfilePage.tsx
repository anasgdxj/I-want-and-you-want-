import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Calendar, Loader2, MapPin, Package, ShieldCheck, User } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import { ListingGridSkeleton } from '../components/ListingSkeleton';
import { StarRatingDisplay, StarRatingInput } from '../components/StarRating';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { checkCanRateUser, fetchPublicUserProfile, submitUserRating } from '../lib/ratings';
import { getPublicImageUrl } from '../lib/supabase';
import { formatArabicDate, getErrorMessage } from '../lib/utils';
import type { Listing, Profile, UserRating } from '../types';

export default function UserProfilePage({ userId }: { userId: string }) {
  const { user, favoriteIds, toggleFavorite } = useAuth();
  const { goBack, navigate } = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [canRate, setCanRate] = useState(false);

  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, eligible] = await Promise.all([
        fetchPublicUserProfile(userId),
        checkCanRateUser(user?.id, userId),
      ]);
      setProfile(data.profile);
      setListings(data.listings);
      setRatings(data.ratings);
      setCanRate(eligible);

      if (user) {
        const existingMine = data.ratings.find((r) => r.rater_id === user.id);
        if (existingMine) {
          setRatingValue(existingMine.rating);
          setComment(existingMine.comment ?? '');
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmitRating = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmittingRating(true);
    setError(null);
    setRatingSuccess(null);
    try {
      await submitUserRating({
        raterId: user.id,
        ratedUserId: userId,
        rating: ratingValue,
        comment: comment.trim() || null,
      });
      setRatingSuccess('تم حفظ تقييمك الموثّق بنجاح');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
        <ListingGridSkeleton count={3} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-200/60 dark:text-stone-200"
        >
          <ArrowRight size={18} />
          <span>رجوع</span>
        </button>
        <EmptyState
          icon={<User size={28} />}
          title="الملف الشخصي غير موجود"
          description="تعذر العثور على هذا المستخدم."
          actionLabel="العودة للرئيسية"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const avatarUrl = profile.avatar_url ? getPublicImageUrl(profile.avatar_url) : null;
  const isSelf = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <ArrowRight size={18} />
        <span>رجوع</span>
      </button>

      {/* Profile Header */}
      <section className="rounded-2xl border border-[#e7e0d3] bg-white p-5 dark:border-[#2f2a24] dark:bg-[#1e1b17] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-olive-100 text-olive-700 dark:bg-olive-950 dark:text-olive-300">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.full_name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={28} />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                {profile.full_name || 'مستخدم بدّي وبدّك'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-olive-600" />
                  {profile.city}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar size={13} />
                  عضو منذ {formatArabicDate(profile.created_at)}
                </span>
              </div>
              <div className="pt-0.5">
                <StarRatingDisplay average={profile.rating_avg} count={profile.rating_count} size={16} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-center">
            <div className="rounded-xl bg-[#faf6ee] px-4 py-2.5 dark:bg-[#151310]">
              <p className="tabular-nums text-lg font-extrabold text-stone-900 dark:text-stone-100">
                {listings.length}
              </p>
              <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">إعلان نشط</p>
            </div>
            <div className="rounded-xl bg-[#faf6ee] px-4 py-2.5 dark:bg-[#151310]">
              <p className="tabular-nums text-lg font-extrabold text-amber-700 dark:text-amber-400">
                {profile.rating_count > 0 ? Number(profile.rating_avg).toFixed(1) : '—'}
              </p>
              <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">التقييم</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {/* User's Active Listings */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
          إعلانات {profile.full_name} ({listings.length})
        </h2>

        {listings.length === 0 ? (
          <EmptyState
            icon={<Package size={26} />}
            title="لا توجد إعلانات نشطة حالياً"
            description="لم ينشر هذا المستخدم إعلانات متاحة في الوقت الحالي."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onToggleFavorite={(id) => {
                  if (!user) navigate('/login');
                  else void toggleFavorite(id);
                }}
                onOpen={(id) => navigate(`/listing/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Verified Ratings Section */}
      <section className="space-y-4 rounded-2xl border border-[#e7e0d3] bg-white p-5 dark:border-[#2f2a24] dark:bg-[#1e1b17] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-olive-600" />
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
              التقييمات الموثّقة ({ratings.length})
            </h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            تُمنح التقييمات بعد محادثة فعلية أو إتمام مقايضة
          </span>
        </div>

        {/* Rating Form (if eligible) */}
        {!isSelf && canRate && (
          <form
            onSubmit={handleSubmitRating}
            className="space-y-3 rounded-xl border border-[#e7e0d3] bg-[#faf6ee] p-4 dark:border-[#2f2a24] dark:bg-[#151310]"
          >
            <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              قيّم تجربتك مع {profile.full_name}
            </p>
            <StarRatingInput value={ratingValue} onChange={setRatingValue} />
            <textarea
              rows={2}
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب ملاحظة موجزة عن المصداقية والالتزام بالموعد (اختياري)..."
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm focus:border-olive-600 focus:outline-none dark:border-stone-700 dark:bg-[#1e1b17] dark:text-stone-100"
            />
            {ratingSuccess && (
              <p className="text-xs font-bold text-olive-700 dark:text-olive-400">{ratingSuccess}</p>
            )}
            <button
              type="submit"
              disabled={submittingRating}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-olive-600 px-5 py-2 text-sm font-bold text-white hover:bg-olive-700 disabled:opacity-60"
            >
              {submittingRating && <Loader2 size={16} className="animate-spin" />}
              <span>حفظ التقييم</span>
            </button>
          </form>
        )}

        {!isSelf && !canRate && (
          <p className="rounded-xl bg-[#faf6ee] px-4 py-3 text-xs font-semibold text-stone-600 dark:bg-[#151310] dark:text-stone-400">
            لضمان مصداقية التقييمات، يتفعّل التقييم تلقائياً بعد إجراء محادثة أو مقايضة مع {profile.full_name}.
          </p>
        )}

        {ratings.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
            لا توجد تقييمات مسجّلة لهذا المستخدم حتى الآن.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {ratings.map((rev) => (
              <div key={rev.id} className="space-y-1 py-3.5 first:pt-1 last:pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {rev.rater?.full_name || 'مستخدم'}
                  </span>
                  <span className="tabular-nums text-xs text-stone-400">
                    {formatArabicDate(rev.created_at)}
                  </span>
                </div>
                <StarRatingDisplay average={rev.rating} count={1} size={14} />
                {rev.comment && (
                  <p className="pt-0.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {rev.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
