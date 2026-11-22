import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, Loader2, Lock, Repeat, Send, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/ListingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { fetchUserSwapOffers, updateSwapOfferStatus } from '../lib/messages';
import {
  formatArabicDate,
  formatSYP,
  getErrorMessage,
  SWAP_STATUS_LABELS,
} from '../lib/utils';
import type { SwapOffer, SwapStatus } from '../types';

export default function SwapsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<SwapOffer[]>([]);
  const [outgoing, setOutgoing] = useState<SwapOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUserSwapOffers(user.id);
      setIncoming(res.incoming);
      setOutgoing(res.outgoing);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="سجّل دخولك لمتابعة المقايضات"
          description="اعرض طلبات المقايضة الواردة لإعلاناتك، وتابع حالة الطلبات التي أرسلتها."
          actionLabel="تسجيل الدخول"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const handleUpdateStatus = async (offerId: string, status: SwapStatus) => {
    setBusyId(offerId);
    setError(null);
    try {
      await updateSwapOfferStatus(offerId, status);
      setIncoming((prev) => prev.map((o) => (o.id === offerId ? { ...o, status } : o)));
      setOutgoing((prev) => prev.map((o) => (o.id === offerId ? { ...o, status } : o)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const activeList = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">المقايضات</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          أدر عروض المقايضة الواردة على أغراضك وتابع طلباتك المرسلة.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-200/70 p-1.5 dark:bg-stone-800/80">
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'incoming'
              ? 'bg-white text-olive-700 shadow-sm dark:bg-[#1c1a17] dark:text-olive-400'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
          }`}
        >
          <Inbox size={16} />
          <span>طلبات واردة</span>
          <span className="tabular-nums text-xs">({incoming.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('outgoing')}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'outgoing'
              ? 'bg-white text-olive-700 shadow-sm dark:bg-[#1c1a17] dark:text-olive-400'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
          }`}
        >
          <Send size={16} />
          <span>طلباتي المرسلة</span>
          <span className="tabular-nums text-xs">({outgoing.length})</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <ListRowSkeleton count={3} />
      ) : activeList.length === 0 ? (
        <EmptyState
          icon={<Repeat size={28} />}
          title={tab === 'incoming' ? 'لا توجد عروض مقايضة واردة' : 'لم ترسل أي عرض مقايضة بعد'}
          description={
            tab === 'incoming'
              ? 'عندما يقترح أحد المستخدمين مقايضة على إعلانك سيظهر طلبه هنا.'
              : 'تصفح الأغراض القابلة للمقايضة وأرسل عرضك الأول.'
          }
          actionLabel="تصفح الأغراض"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-3">
          {activeList.map((offer) => {
            const statusMeta = SWAP_STATUS_LABELS[offer.status];
            const isBusy = busyId === offer.id;

            return (
              <article
                key={offer.id}
                className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-[#1c1a17]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => offer.listing && navigate(`/listing/${offer.listing.id}`)}
                    className="text-start text-sm font-extrabold text-olive-700 hover:underline dark:text-olive-400"
                  >
                    على إعلان: {offer.listing?.title ?? 'إعلان'}
                  </button>
                  <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="font-bold text-stone-900 dark:text-stone-100">
                    الغرض المعروض: {offer.offered_item_title}
                  </p>
                  {offer.cash_diff_syp !== null && offer.cash_diff_syp > 0 && (
                    <p className="tabular-nums text-xs font-bold text-olive-700 dark:text-olive-400">
                      + فرق نقدي معروض: {formatSYP(offer.cash_diff_syp)}
                    </p>
                  )}
                  {offer.notes && (
                    <p className="text-xs text-stone-600 dark:text-stone-300">
                      ملاحظات: {offer.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <span>
                    {tab === 'incoming'
                      ? `مقدّم العرض: ${offer.proposer?.full_name || 'مستخدم'}`
                      : `المحافظة: ${offer.listing?.city || ''}`}
                    {' · '}
                    <span className="tabular-nums">{formatArabicDate(offer.created_at)}</span>
                  </span>

                  {tab === 'incoming' && offer.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleUpdateStatus(offer.id, 'accepted')}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-olive-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-olive-700 disabled:opacity-60"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>قبول</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleUpdateStatus(offer.id, 'rejected')}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                      >
                        <X size={14} />
                        <span>رفض</span>
                      </button>
                    </div>
                  )}

                  {tab === 'incoming' && offer.status === 'accepted' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleUpdateStatus(offer.id, 'completed')}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
                    >
                      <Check size={14} />
                      <span>تأكيد إتمام المقايضة</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
