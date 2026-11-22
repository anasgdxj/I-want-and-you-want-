import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/ListingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import {
  adminSetListingHidden,
  adminSetUserBanned,
  adminUpdateReportStatus,
  fetchAdminReports,
} from '../lib/admin';
import { formatArabicDate, getErrorMessage, getStatusLabel } from '../lib/utils';
import type { Report } from '../types';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReports();
      setReports(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<ShieldAlert size={28} />}
          title="صلاحية الإدارة مطلوبة"
          description="هذه الصفحة متاحة لمشرفي منصة بدّي وبدّك المصنّفين كـ admin فقط."
          actionLabel="العودة للرئيسية"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const handleToggleHide = async (report: Report) => {
    if (!report.listing) return;
    const hide = report.listing.status !== 'hidden';
    setBusyId(report.id);
    setError(null);
    try {
      await adminSetListingHidden(report.listing.id, hide);
      await adminUpdateReportStatus(report.id, 'reviewed');
      await loadReports();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleBanOwner = async (report: Report) => {
    const ownerId = report.listing?.owner_id;
    if (!ownerId) return;
    setBusyId(report.id);
    setError(null);
    try {
      await adminSetUserBanned(ownerId, true);
      await adminUpdateReportStatus(report.id, 'reviewed');
      await loadReports();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (reportId: string) => {
    setBusyId(reportId);
    setError(null);
    try {
      await adminUpdateReportStatus(reportId, 'dismissed');
      await loadReports();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">لوحة الإدارة</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            مراجعة الإعلانات المُبلَّغ عنها وإخفاء المخالفات أو حظر المخالفين.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <ListRowSkeleton count={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title="لا توجد بلاغات حالياً"
          description="كل الإعلانات تبدو سليمة ولا توجد بلاغات قيد المراجعة."
          actionLabel="العودة للرئيسية"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isBusy = busyId === report.id;
            const isHidden = report.listing?.status === 'hidden';

            return (
              <article
                key={report.id}
                className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1c1a17]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`rounded-lg px-2.5 py-1 ${
                        report.status === 'open'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : report.status === 'reviewed'
                            ? 'bg-olive-50 text-olive-700 dark:bg-olive-950/60 dark:text-olive-300'
                            : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {report.status === 'open'
                        ? 'بلاغ مفتوح'
                        : report.status === 'reviewed'
                          ? 'تمت المعالجة'
                          : 'مرفوض'}
                    </span>
                    <span className="tabular-nums text-stone-400">
                      {formatArabicDate(report.created_at)}
                    </span>
                  </div>

                  {report.listing && (
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                      حالة الإعلان: {getStatusLabel(report.listing.status)}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    {report.listing?.title ?? 'إعلان محذوف'}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
                    سبب البلاغ: {report.reason}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    المُبلِّغ: {report.reporter?.full_name || 'مستخدم'} · صاحب الإعلان:{' '}
                    {report.listing?.contact_name || report.listing?.owner?.full_name || 'غير معروف'}
                  </p>
                </div>

                {report.listing && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => navigate(`/listing/${report.listing!.id}`)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200"
                    >
                      <Eye size={14} />
                      <span>معاينة</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleHide(report)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                      <span>{isHidden ? 'إظهار الإعلان' : 'إخفاء الإعلان'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleBanOwner(report)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <Ban size={14} />
                      <span>حظر صاحب الإعلان</span>
                    </button>

                    {report.status === 'open' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDismiss(report.id)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300"
                      >
                        <span>تجاهل البلاغ</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
