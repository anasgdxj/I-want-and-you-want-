import { useState, type FormEvent } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { createSwapOffer } from '../lib/messages';
import { getErrorMessage } from '../lib/utils';
import type { Listing } from '../types';

interface SwapOfferModalProps {
  listing: Listing;
  proposerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SwapOfferModal({
  listing,
  proposerId,
  onClose,
  onSuccess,
}: SwapOfferModalProps) {
  const [offeredItem, setOfferedItem] = useState('');
  const [cashDiff, setCashDiff] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (offeredItem.trim().length < 2) {
      setError('الرجاء كتابة اسم الغرض الذي تعرضه للمقايضة');
      return;
    }

    const parsedCash = cashDiff.trim() ? Number(cashDiff) : null;
    if (parsedCash !== null && (Number.isNaN(parsedCash) || parsedCash < 0)) {
      setError('قيمة الفرق النقدي غير صحيحة');
      return;
    }

    setSaving(true);
    try {
      await createSwapOffer({
        listing_id: listing.id,
        proposer_id: proposerId,
        offered_item_title: offeredItem.trim(),
        cash_diff_syp: parsedCash,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#1c1a17] sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
              اقتراح مقايضة
            </h2>
            <p className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
              مقابل: {listing.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="swap-offered-item" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
              الغرض الذي تعرضه للمقايضة
            </label>
            <input
              id="swap-offered-item"
              value={offeredItem}
              onChange={(e) => setOfferedItem(e.target.value)}
              placeholder="مثال: شاشة كمبيوتر 22 بوصة"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {listing.accepts_cash_diff && (
            <div>
              <label htmlFor="swap-cash-diff" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
                فرق نقدي تعرضه (ل.س) — اختياري
              </label>
              <input
                id="swap-cash-diff"
                type="number"
                min={0}
                dir="ltr"
                value={cashDiff}
                onChange={(e) => setCashDiff(e.target.value)}
                placeholder="0"
                className="tabular-nums min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
          )}

          <div>
            <label htmlFor="swap-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
              ملاحظات وتفاصيل الحالة — اختياري
            </label>
            <textarea
              id="swap-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اذكر حالة الغرض ومكان التسليم المناسب لك..."
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-olive-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
            <span>إرسال عرض المقايضة</span>
          </button>
        </form>
      </div>
    </div>
  );
}
