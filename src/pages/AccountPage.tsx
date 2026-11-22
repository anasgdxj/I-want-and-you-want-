import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Camera,
  Edit3,
  Eye,
  Loader2,
  Lock,
  LogOut,
  Package,
  PlusCircle,
  Repeat,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/ListingSkeleton';
import { StarRatingDisplay } from '../components/StarRating';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { updateProfile } from '../lib/auth';
import { compressImage } from '../lib/image';
import {
  deleteListing,
  fetchMyListings,
  updateListingDetails,
  updateListingStatus,
  uploadUserImage,
} from '../lib/listings';
import { getPublicImageUrl } from '../lib/supabase';
import {
  formatArabicDate,
  getErrorMessage,
  getListingPriceText,
  getStatusLabel,
  OFFER_BADGES,
} from '../lib/utils';
import {
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  OFFER_TYPES,
  SYRIAN_CITIES,
  type Condition,
  type Listing,
  type ListingStatus,
  type OfferType,
} from '../types';

export default function AccountPage() {
  const { user, profile, isAdmin, refreshProfile, signOut } = useAuth();
  const { navigate } = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? SYRIAN_CITIES[0]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setCity(profile.city);
    }
  }, [profile]);

  const loadMine = useCallback(async () => {
    if (!user) {
      setLoadingListings(false);
      return;
    }
    setLoadingListings(true);
    try {
      const rows = await fetchMyListings(user.id);
      setMyListings(rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingListings(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="حسابك في بدّي وبدّك"
          description="سجّل دخولك برقم هاتفك السوري لإدارة ملفك الشخصي وإعلاناتك ومحادثاتك."
          actionLabel="تسجيل الدخول"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setError(null);
    try {
      await updateProfile(user.id, { full_name: fullName, city });
      await refreshProfile();
      setProfileMsg('تم حفظ بيانات الملف الشخصي بنجاح');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const compressed = await compressImage(file, 600, 0.8);
      const path = await uploadUserImage(user.id, compressed.file, 'avatars');
      await updateProfile(user.id, {
        full_name: fullName || profile?.full_name || 'مستخدم',
        city: city || profile?.city || SYRIAN_CITIES[0],
        avatar_url: path,
      });
      await refreshProfile();
      setProfileMsg('تم تحديث الصورة الشخصية');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleStatusChange = async (listingId: string, status: ListingStatus) => {
    setBusyListingId(listingId);
    setError(null);
    try {
      await updateListingStatus(listingId, status);
      setMyListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status } : l)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyListingId(null);
    }
  };

  const handleDelete = async (listingId: string) => {
    setBusyListingId(listingId);
    setError(null);
    try {
      await deleteListing(listingId);
      setMyListings((prev) => prev.filter((l) => l.id !== listingId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyListingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl = profile?.avatar_url ? getPublicImageUrl(profile.avatar_url) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Profile Card */}
      <section className="rounded-2xl border border-[#e7e0d3] bg-white p-5 dark:border-[#2f2a24] dark:bg-[#1e1b17] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#efe9dc] pb-5 dark:border-[#2f2a24]">
          <div className="flex items-center gap-3.5">
            <label className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-olive-100 text-olive-700 dark:bg-olive-950 dark:text-olive-300">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name ?? 'الصورة الشخصية'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={28} />
              )}
              <span className="absolute bottom-0 inset-x-0 flex items-center justify-center bg-black/50 py-0.5 text-white">
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => void handleAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="space-y-1">
              <h1 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
                {profile?.full_name || 'حسابي'}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {profile?.city || 'سوريا'}
                {isAdmin ? ' · مشرف النظام' : ''}
              </p>
              <StarRatingDisplay
                average={profile?.rating_avg ?? 0}
                count={profile?.rating_count ?? 0}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/user/${user.id}`)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#e7e0d3] px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-[#2f2a24] dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <Eye size={15} />
              <span>ملفي العام</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/swaps')}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#e7e0d3] px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-[#2f2a24] dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <Repeat size={15} />
              <span>المقايضات</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <ShieldCheck size={15} />
                <span>لوحة الإدارة</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
            >
              <LogOut size={15} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 grid gap-3 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <label htmlFor="acc-name" className="mb-1 block text-xs font-bold text-stone-600 dark:text-stone-300">
              الاسم الكامل
            </label>
            <input
              id="acc-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="acc-city" className="mb-1 block text-xs font-bold text-stone-600 dark:text-stone-300">
              المحافظة
            </label>
            <select
              id="acc-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              {SYRIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-olive-600 px-4 py-2 text-sm font-bold text-white hover:bg-olive-700 disabled:opacity-60"
            >
              {savingProfile && <Loader2 size={16} className="animate-spin" />}
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </form>

        {profileMsg && (
          <p className="mt-3 text-xs font-bold text-olive-700 dark:text-olive-400">{profileMsg}</p>
        )}
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {/* My Listings Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
            إعلاناتي ({myListings.length})
          </h2>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-olive-600 px-4 py-2 text-xs font-bold text-white hover:bg-olive-700"
          >
            <PlusCircle size={16} />
            <span>إعلان جديد</span>
          </button>
        </div>

        {loadingListings ? (
          <ListRowSkeleton count={3} />
        ) : myListings.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="لم تنشر أي إعلان بعد"
            description="أضف غرضك الأول للبيع أو المقايضة أو الإهداء خلال دقيقة واحدة."
            actionLabel="أضف غرضاً"
            onAction={() => navigate('/add')}
          />
        ) : (
          <div className="space-y-3">
            {myListings.map((listing) => {
              const thumb = listing.images?.[0]?.storage_path
                ? getPublicImageUrl(listing.images[0].storage_path)
                : null;
              const isBusy = busyListingId === listing.id;
              const badge = OFFER_BADGES[listing.offer_type];

              return (
                <article
                  key={listing.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#e7e0d3] bg-white p-4 dark:border-[#2f2a24] dark:bg-[#1e1b17] sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                    className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 sm:h-24 sm:w-32"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={listing.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone-400">
                        <Package size={28} />
                      </div>
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                        {getStatusLabel(listing.status)} · {formatArabicDate(listing.created_at)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="block truncate text-start text-base font-extrabold text-stone-900 hover:text-olive-700 dark:text-stone-100"
                    >
                      {listing.title}
                    </button>

                    <p className="tabular-nums text-sm font-bold text-olive-700 dark:text-olive-400">
                      {getListingPriceText(listing.offer_type, listing.price_syp)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <select
                      aria-label="تغيير حالة الإعلان"
                      disabled={isBusy || listing.status === 'hidden'}
                      value={listing.status === 'hidden' ? 'closed' : listing.status}
                      onChange={(e) => void handleStatusChange(listing.id, e.target.value as ListingStatus)}
                      className="min-h-[44px] rounded-xl border border-stone-300 bg-stone-50 px-3 text-xs font-bold dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    >
                      {LISTING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setEditingListing(listing)}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <Edit3 size={14} />
                      <span>تعديل</span>
                    </button>

                    {confirmDeleteId === listing.id ? (
                      <div className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 p-1 dark:border-rose-900 dark:bg-rose-950/50">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(listing.id)}
                          className="min-h-[36px] rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[36px] rounded-lg px-2 text-xs font-bold text-stone-600 dark:text-stone-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(listing.id)}
                        aria-label="حذف الإعلان"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={(updated) => {
            setMyListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setEditingListing(null);
          }}
        />
      )}
    </div>
  );
}

function EditListingModal({
  listing,
  onClose,
  onSaved,
}: {
  listing: Listing;
  onClose: () => void;
  onSaved: (updated: Listing) => void;
}) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? '');
  const [category, setCategory] = useState(listing.category);
  const [city, setCity] = useState(listing.city);
  const [neighborhood, setNeighborhood] = useState(listing.neighborhood ?? '');
  const [offerType, setOfferType] = useState<OfferType>(listing.offer_type);
  const [priceSyp, setPriceSyp] = useState(listing.price_syp ? String(listing.price_syp) : '');
  const [swapPreference, setSwapPreference] = useState(listing.swap_preference ?? '');
  const [acceptsCashDiff, setAcceptsCashDiff] = useState(listing.accepts_cash_diff);
  const [condition, setCondition] = useState<Condition>(listing.condition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPrice = offerType === 'sell' || offerType === 'both';
  const showSwap = offerType === 'swap' || offerType === 'both';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) {
      setError('الرجاء كتابة عنوان صحيح');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateListingDetails(listing.id, {
        title: title.trim(),
        description: description.trim() || null,
        category,
        city,
        neighborhood: neighborhood.trim() || null,
        offer_type: offerType,
        price_syp: showPrice && priceSyp.trim() ? Number(priceSyp) : null,
        swap_preference: showSwap ? swapPreference.trim() || null : null,
        accepts_cash_diff: showSwap && acceptsCashDiff,
        condition,
      });
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-[#1c1a17] sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">تعديل الإعلان</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold">العنوان</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">نوع العرض</label>
              <select
                className={inputCls}
                value={offerType}
                onChange={(e) => setOfferType(e.target.value as OfferType)}
              >
                {OFFER_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">التصنيف</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">الحالة</label>
              <select
                className={inputCls}
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">المحافظة</label>
              <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
                {SYRIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold">الحي</label>
            <input className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>

          {showPrice && (
            <div>
              <label className="mb-1 block text-xs font-bold">السعر (ل.س)</label>
              <input
                type="number"
                dir="ltr"
                min={0}
                className={inputCls}
                value={priceSyp}
                onChange={(e) => setPriceSyp(e.target.value)}
              />
            </div>
          )}

          {showSwap && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold">المقايضة المطلوبة</label>
                <input
                  className={inputCls}
                  value={swapPreference}
                  onChange={(e) => setSwapPreference(e.target.value)}
                />
              </div>
              <label className="flex min-h-[40px] items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={acceptsCashDiff}
                  onChange={(e) => setAcceptsCashDiff(e.target.checked)}
                  className="h-4 w-4 accent-olive-600"
                />
                <span>أقبل فرق نقدي</span>
              </label>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold">الوصف</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive-600 px-4 py-3 text-sm font-bold text-white hover:bg-olive-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            <span>حفظ التعديلات</span>
          </button>
        </form>
      </div>
    </div>
  );
}
