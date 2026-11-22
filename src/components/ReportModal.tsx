import { useState, type FormEvent } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { submitReport } from '../lib/listings';
import { getErrorMessage } from '../lib/utils';

interface ReportModalProps {
  listingId: string;
  listingTitle: string;
  reporterId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const PRESET_REASONS = [
  'محتوى غير لائق أو مخالف',
  'إعلان مكرر أو احتيالي',
  'غرض محظور أو غير قانوني',
  'السعر أو المعلومات مضلّلة',
];

export default function ReportModal({
  listingId,
  listingTitle,
  reporterId,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 3) {
      setError('الرجاء تحديد أو كتابة سبب البلاغ');
      return;
    }

    setSaving(true);
    try {
      await submitReport(listingId, reporterId, reason);
      onSubmitted();
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
              إبلاغ عن إعلان
            </h2>
            <p className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
              {listingTitle}
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
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reason === preset
                    ? 'bg-rose-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="report-reason" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
              تفاصيل البلاغ
            </label>
            <textarea
              id="report-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اشرح سبب البلاغ ليتم مراجعته من الإدارة..."
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-rose-500 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
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
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Flag size={17} />}
            <span>إرسال البلاغ</span>
          </button>
        </form>
      </div>
    </div>
  );
}
