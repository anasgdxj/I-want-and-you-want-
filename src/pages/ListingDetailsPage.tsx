import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Eye,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Repeat,
  User,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ImageGallery from '../components/ImageGallery';
import ReportModal from '../components/ReportModal';
import { StarRatingDisplay } from '../components/StarRating';
import SwapOfferModal from '../components/SwapOfferModal';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { fetchListingById, revealListingPhone } from '../lib/listings';
import { getOrCreateConversation } from '../lib/messages';
import {
  formatArabicDate,
  getCategoryLabel,
  getConditionLabel,
  getErrorMessage,
  getListingPriceText,
  getStatusLabel,
  normalizeSyrianPhone,
  OFFER_BADGES,
} from '../lib/utils';
import type { Listing } from '../types';

export default function ListingDetailsPage({ listingId }: { listingId: string }) {
  const { goBack, navigate } = useRouter();
  const { user, favoriteIds, toggleFavorite } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRevealedPhone(null);

    fetchListingById(listingId)
      .then((data) => {
        if (!cancelled) setListing(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleRevealPhone = async () => {
    if (!listing) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setRevealingPhone(true);
    try {
      const phone = await revealListingPhone(listing.id, true);
      setRevealedPhone(phone);
    } catch (err) {
      showToast(getErrorMessage(err));
    } finally {
      setRevealingPhone(false);
    }
  };

  const handleStartChat = async () => {
    if (!listing) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === listing.owner_id) {
      showToast('هذا إعلانك الخاص');
      return;
    }
    setStartingChat(true);
    try {
      const conv = await getOrCreateConversation(listing.id, user.id, listing.owner_id);
      navigate(`/messages/${conv.id}`);
    } catch (err) {
      showToast(getErrorMessage(err));
    } finally {
      setStartingChat(false);
    }
  };

  const handleOpenSwap = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (listing && user.id === listing.owner_id) {
      showToast('لا يمكنك تقديم عرض مقايضة على إعلانك الخاص');
      return;
    }
    setShowSwapModal(true);
  };

  const handleFavorite = async () => {
    if (!listing) return;
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const added = await toggleFavorite(listing.id);
      showToast(added ? 'تمت إضافة الإعلان إلى المفضلة' : 'تمت إزالة الإعلان من المفضلة');
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  };

  const handleOpenReport = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowReportModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800 lg:col-span-7" />
          <div className="space-y-4 lg:col-span-5">
            <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-10 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-32 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <ArrowRight size={18} />
          <span>رجوع</span>
        </button>
        <EmptyState
          icon={<Flag size={26} />}
          title={error ? 'تعذر تحميل الإعلان' : 'الإعلان غير موجود أو لم يعد متاحاً'}
          description={error ?? 'ربما قام صاحبه بحذفه أو إغلاقه.'}
          actionLabel="العودة للرئيسية"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const badge = OFFER_BADGES[listing.offer_type];
  const isOwner = user?.id === listing.owner_id;
  const isFav = favoriteIds.has(listing.id);
  const canSwap = listing.offer_type === 'swap' || listing.offer_type === 'both';
  const priceText = getListingPriceText(listing.offer_type, listing.price_syp);
  const waPhone = revealedPhone ? normalizeSyrianPhone(revealedPhone) : null;
  const waText = encodeURIComponent(
    `مرحباً ${listing.contact_name}، أنا مهتم بإعلانك "${listing.title}" على بدّي وبدّك.`,
  );

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ArrowRight size={18} />
          <span>العودة</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFavorite}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
              isFav
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200'
            }`}
          >
            <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
            <span>{isFav ? 'في المفضلة' : 'مفضلة'}</span>
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={handleOpenReport}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-bold text-stone-600 transition-colors hover:border-rose-300 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <Flag size={15} />
              <span>إبلاغ</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white dark:bg-stone-100 dark:text-stone-900">
          {toast}
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <ImageGallery images={listing.images ?? []} title={listing.title} />
        </div>

        {/* Details & Actions */}
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1c1a17] lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-lg px-3 py-1 text-xs font-bold ${badge.className}`}>
              {badge.label}
            </span>
            {listing.status !== 'active' && (
              <span className="rounded-lg bg-stone-200 px-3 py-1 text-xs font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                {getStatusLabel(listing.status)}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-xl font-extrabold leading-snug text-stone-900 dark:text-stone-100 sm:text-2xl">
              {listing.title}
            </h1>
            <div className="tabular-nums mt-2 text-2xl font-extrabold text-olive-700 dark:text-olive-400">
              {priceText}
            </div>
          </div>

          {/* Clean unboxed metadata */}
          <div className="grid grid-cols-2 gap-3 border-y border-stone-100 py-4 text-sm dark:border-stone-800">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">التصنيف</p>
              <p className="mt-0.5 font-bold">{getCategoryLabel(listing.category)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">الحالة</p>
              <p className="mt-0.5 font-bold">{getConditionLabel(listing.condition)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">الموقع</p>
              <p className="mt-0.5 flex items-center gap-1 font-bold">
                <MapPin size={14} className="shrink-0 text-olive-600" />
                <span>
                  {listing.city}
                  {listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">تاريخ النشر</p>
              <p className="tabular-nums mt-0.5 font-bold">{formatArabicDate(listing.created_at)}</p>
            </div>
          </div>

          {/* Swap preferences */}
          {canSwap && (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-extrabold">
                <Repeat size={16} />
                <span>المقايضة المطلوبة</span>
              </p>
              <p className="mt-1 leading-relaxed">
                {listing.swap_preference || 'المُعلن منفتح على أي عرض مقايضة مناسب.'}
              </p>
              {listing.accepts_cash_diff && (
                <p className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  يُقبل فرق نقدي مع المقايضة
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">الوصف</h2>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {listing.description || 'لم يُضف المعلن وصفاً إضافياً.'}
            </p>
          </div>

          {/* Owner trust context card */}
          <button
            type="button"
            onClick={() => navigate(`/user/${listing.owner_id}`)}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-[#e7e0d3] bg-[#faf6ee] p-3 text-start transition-colors hover:border-olive-400 dark:border-[#2f2a24] dark:bg-[#151310]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-olive-100 text-olive-800 dark:bg-olive-950 dark:text-olive-300">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                {listing.contact_name || listing.owner?.full_name || 'مُعلن'}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span>{listing.owner?.city || listing.city}</span>
                <span>·</span>
                <StarRatingDisplay
                  average={listing.owner?.rating_avg ?? 0}
                  count={listing.owner?.rating_count ?? 0}
                  size={13}
                />
              </div>
            </div>
            <ChevronLeft size={18} className="shrink-0 text-stone-400" />
          </button>

          {/* Actions */}
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
            >
              إدارة إعلاني من حسابي
            </button>
          ) : (
            <div className="space-y-2.5 pt-1">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={startingChat}
                  onClick={handleStartChat}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-olive-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-olive-700 disabled:opacity-60"
                >
                  {startingChat ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                  <span>مراسلة</span>
                </button>

                {canSwap && (
                  <button
                    type="button"
                    onClick={handleOpenSwap}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-olive-600 px-4 py-3 text-sm font-bold text-olive-700 transition-colors hover:bg-olive-50 dark:border-olive-500 dark:text-olive-400 dark:hover:bg-olive-950/40"
                  >
                    <Repeat size={18} />
                    <span>اقترح مقايضة</span>
                  </button>
                )}
              </div>

              {/* Protected phone reveal */}
              {!revealedPhone ? (
                <button
                  type="button"
                  disabled={revealingPhone}
                  onClick={handleRevealPhone}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                  {revealingPhone ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                  <span>{user ? 'إظهار الرقم' : 'سجّل دخولك لإظهار الرقم'}</span>
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900">
                  <p className="tabular-nums text-center text-base font-extrabold tracking-wide text-stone-900 dark:text-stone-100" dir="ltr">
                    {revealedPhone}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:+${waPhone}`}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
                    >
                      <Phone size={16} />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={`https://wa.me/${waPhone}?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700"
                    >
                      <MessageCircle size={16} />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSwapModal && user && (
        <SwapOfferModal
          listing={listing}
          proposerId={user.id}
          onClose={() => setShowSwapModal(false)}
          onSuccess={() => {
            setShowSwapModal(false);
            showToast('تم إرسال عرض المقايضة بنجاح! يمكنك متابعته من صفحة المقايضات.');
          }}
        />
      )}

      {showReportModal && user && (
        <ReportModal
          listingId={listing.id}
          listingTitle={listing.title}
          reporterId={user.id}
          onClose={() => setShowReportModal(false)}
          onSubmitted={() => {
            setShowReportModal(false);
            showToast('شكراً لك، تم إرسال البلاغ للمراجعة من الإدارة.');
          }}
        />
      )}
    </div>
  );
}
