import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { compressImage } from '../lib/image';
import { createListing } from '../lib/listings';
import {
  formatFileSize,
  formatSYP,
  getCategoryLabel,
  getConditionLabel,
  getErrorMessage,
  isValidSyrianPhone,
  OFFER_BADGES,
} from '../lib/utils';
import {
  CATEGORIES,
  CONDITIONS,
  OFFER_TYPES,
  SYRIAN_CITIES,
  type Condition,
  type OfferType,
} from '../types';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
}

const MAX_PHOTOS = 6;

const STEP_LABELS = ['البيانات', 'الصور', 'التواصل', 'المراجعة'];

export default function AddListingPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [offerType, setOfferType] = useState<OfferType>('sell');
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [condition, setCondition] = useState<Condition>('good');
  const [priceSyp, setPriceSyp] = useState('');
  const [swapPreference, setSwapPreference] = useState('');
  const [acceptsCashDiff, setAcceptsCashDiff] = useState(false);

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [compressing, setCompressing] = useState(false);

  const [city, setCity] = useState<string>(profile?.city || SYRIAN_CITIES[0]);
  const [neighborhood, setNeighborhood] = useState('');
  const [contactName, setContactName] = useState(profile?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone ? user.phone.replace(/^\+?963/, '0') : '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.city) setCity(profile.city);
    if (profile?.full_name && !contactName) setContactName(profile.full_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="سجّل دخولك لنشر غرضك"
          description="يتطلب نشر الإعلانات تسجيل الدخول برقم هاتفك السوري لضمان الجدية والأمان."
          actionLabel="تسجيل الدخول الآن"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  if (profile?.is_banned) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="الحساب محظور"
          description="تم تقييد صلاحية نشر الإعلانات لهذا الحساب من قِبل الإدارة."
          actionLabel="العودة للرئيسية"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const showPrice = offerType === 'sell' || offerType === 'both';
  const showSwap = offerType === 'swap' || offerType === 'both';

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`الحد الأقصى للصور هو ${MAX_PHOTOS} صور`);
      return;
    }

    const picked = Array.from(fileList).slice(0, remainingSlots);
    setCompressing(true);

    try {
      const processed: SelectedPhoto[] = [];
      for (const rawFile of picked) {
        if (!rawFile.type.startsWith('image/')) continue;
        const result = await compressImage(rawFile, 1600, 0.8);
        processed.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: result.file,
          previewUrl: URL.createObjectURL(result.file),
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
        });
      }
      setPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const validateCurrentStep = (): boolean => {
    setError(null);
    if (step === 0) {
      if (title.trim().length < 2) {
        setError('يرجى كتابة عنوان واضح للغرض (حرفان على الأقل)');
        return false;
      }
      if (showPrice && priceSyp.trim()) {
        const n = Number(priceSyp);
        if (Number.isNaN(n) || n < 0) {
          setError('الرجاء إدخال سعر صحيح بالليرة السورية');
          return false;
        }
      }
    }
    if (step === 2) {
      if (contactName.trim().length < 2) {
        setError('يرجى كتابة اسمك للتواصل');
        return false;
      }
      if (!isValidSyrianPhone(contactPhone)) {
        setError('يرجى إدخال رقم جوال سوري صحيح يبدأ بـ 09 ويتكوّن من 10 أرقام');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
  };

  const goPrev = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handlePublish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const parsedPrice = showPrice && priceSyp.trim() ? Number(priceSyp) : null;
      const created = await createListing({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        city,
        neighborhood: neighborhood.trim() || null,
        offer_type: offerType,
        price_syp: parsedPrice,
        swap_preference: showSwap ? swapPreference.trim() || null : null,
        accepts_cash_diff: showSwap && acceptsCashDiff,
        condition,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        images: photos.map((p) => p.file),
      });
      navigate(`/listing/${created.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:border-olive-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-olive-600/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">أضف غرضاً جديداً</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          اتبع الخطوات الأربع لنشر غرضك للبيع أو المقايضة أو الإهداء.
        </p>
      </div>

      {/* Step Indicator */}
      <ol className="grid grid-cols-4 gap-2">
        {STEP_LABELS.map((label, idx) => {
          const done = idx < step;
          const active = idx === step;
          return (
            <li
              key={label}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors ${
                active
                  ? 'border-olive-600 bg-olive-50 text-olive-800 dark:border-olive-500 dark:bg-olive-950/50 dark:text-olive-300'
                  : done
                    ? 'border-olive-200 bg-white text-olive-700 dark:border-olive-900 dark:bg-[#1c1a17] dark:text-olive-400'
                    : 'border-stone-200 bg-white text-stone-400 dark:border-stone-800 dark:bg-[#1c1a17]'
              }`}
            >
              <span
                className={`tabular-nums flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                  active || done
                    ? 'bg-olive-600 text-white'
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {done ? <Check size={14} /> : idx + 1}
              </span>
              <span className="text-xs font-bold">{label}</span>
            </li>
          );
        })}
      </ol>

      {/* Form Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1c1a17] sm:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="add-title" className="mb-1 block text-sm font-bold">
                عنوان الغرض
              </label>
              <input
                id="add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: كتب هندسة معلوماتية سنة ثالثة"
                className={inputCls}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="add-offer" className="mb-1 block text-sm font-bold">
                  نوع العرض
                </label>
                <select
                  id="add-offer"
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value as OfferType)}
                  className={inputCls}
                >
                  {OFFER_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-category" className="mb-1 block text-sm font-bold">
                  التصنيف
                </label>
                <select
                  id="add-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="add-condition" className="mb-1 block text-sm font-bold">
                حالة الغرض
              </label>
              <select
                id="add-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className={inputCls}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {showPrice && (
              <div>
                <label htmlFor="add-price" className="mb-1 block text-sm font-bold">
                  السعر بالليرة السورية (ل.س) — اختياري
                </label>
                <input
                  id="add-price"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={priceSyp}
                  onChange={(e) => setPriceSyp(e.target.value)}
                  placeholder="مثال: 250000"
                  className={`${inputCls} tabular-nums`}
                />
              </div>
            )}

            {showSwap && (
              <div className="space-y-3 rounded-xl bg-amber-50/80 p-3.5 dark:bg-amber-950/30">
                <div>
                  <label htmlFor="add-swap" className="mb-1 block text-sm font-bold">
                    ماذا تريد مقابل الغرض؟
                  </label>
                  <input
                    id="add-swap"
                    value={swapPreference}
                    onChange={(e) => setSwapPreference(e.target.value)}
                    placeholder="مثال: جهاز لوحي، دراجة، أو كتب جامعية"
                    className={inputCls}
                  />
                </div>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={acceptsCashDiff}
                    onChange={(e) => setAcceptsCashDiff(e.target.checked)}
                    className="h-4 w-4 accent-olive-600"
                  />
                  <span>أقبل بفرق نقدي مع المقايضة</span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="add-desc" className="mb-1 block text-sm font-bold">
                الوصف التفصيلي — اختياري
              </label>
              <textarea
                id="add-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اذكر تفاصيل الاستعمال، الملحقات المتوفرة، وأي ملاحظات مهمة..."
                className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm text-stone-900 focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">صور الغرض</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  حتى {MAX_PHOTOS} صور. تُضغط الصور تلقائياً حتى 1600px لتوفير باقة الإنترنت.
                </p>
              </div>
              <span className="tabular-nums text-xs font-bold text-olive-700 dark:text-olive-400">
                {photos.length} / {MAX_PHOTOS}
              </span>
            </div>

            {photos.length < MAX_PHOTOS && (
              <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/60 p-6 text-center transition-colors hover:border-olive-600 hover:bg-olive-50/30 dark:border-stone-700 dark:bg-stone-900/50">
                {compressing ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-olive-600" />
                    <span className="text-sm font-bold">جاري ضغط الصور...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus size={26} className="text-olive-600" />
                    <span className="text-sm font-bold">اضغط لاختيار الصور</span>
                    <span className="text-xs text-stone-500">PNG, JPG, WEBP</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={compressing}
                  onChange={(e) => void handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </label>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-900"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`صورة ${index + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] text-stone-600 dark:text-stone-300">
                      <span className="tabular-nums">{formatFileSize(photo.compressedSize)}</span>
                      {index === 0 && <span className="font-bold text-olive-700 dark:text-olive-400">رئيسية</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="حذف الصورة"
                      className="absolute left-1.5 top-1.5 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-black/65 text-white hover:bg-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="add-city" className="mb-1 block text-sm font-bold">
                  المحافظة
                </label>
                <select
                  id="add-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputCls}
                >
                  {SYRIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-neighborhood" className="mb-1 block text-sm font-bold">
                  الحي أو المنطقة — اختياري
                </label>
                <input
                  id="add-neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="مثال: المزرعة"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="add-name" className="mb-1 block text-sm font-bold">
                  اسمك الظاهر في الإعلان
                </label>
                <input
                  id="add-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="الاسم"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="add-phone" className="mb-1 block text-sm font-bold">
                  رقم الجوال السوري
                </label>
                <input
                  id="add-phone"
                  dir="ltr"
                  inputMode="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className={`${inputCls} tabular-nums`}
                />
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  يظل الرقم محمياً ولا يظهر للمتصفحين إلا عند الضغط على «إظهار الرقم».
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold">مراجعة الإعلان قبل النشر</h2>

            <div className="space-y-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-stone-900">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-stone-900 dark:text-stone-100">{title}</span>
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${OFFER_BADGES[offerType].className}`}>
                  {OFFER_BADGES[offerType].label}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {getCategoryLabel(category)} · {getConditionLabel(condition)} · {city}
                {neighborhood ? ` (${neighborhood})` : ''}
              </p>
              {showPrice && priceSyp && (
                <p className="tabular-nums font-extrabold text-olive-700 dark:text-olive-400">
                  {formatSYP(Number(priceSyp))}
                </p>
              )}
              {showSwap && swapPreference && (
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  المقايضة المطلوبة: {swapPreference}
                </p>
              )}
              {description && (
                <p className="whitespace-pre-line text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  {description}
                </p>
              )}
              <div className="border-t border-stone-200 pt-2 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-400">
                التواصل: {contactName} · <span dir="ltr" className="tabular-nums">{contactPhone}</span> · {photos.length} صور مرفقة
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Step Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
          {step > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              disabled={submitting}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <ArrowRight size={17} />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={compressing}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-olive-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-olive-700 disabled:opacity-60"
            >
              <span>التالي</span>
              <ArrowLeft size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={submitting}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-olive-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-olive-700 disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              <span>نشر الإعلان الآن</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
