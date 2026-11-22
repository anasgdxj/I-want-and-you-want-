import { useEffect, useState } from 'react';
import { Lock, MessageCircle, Package } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/ListingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { fetchConversations } from '../lib/messages';
import { getPublicImageUrl } from '../lib/supabase';
import { formatRelativeTime, getErrorMessage } from '../lib/utils';
import type { Conversation } from '../types';

export default function MessagesPage() {
  const { user, refreshUnread } = useAuth();
  const { navigate } = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchConversations(user.id)
      .then((rows) => {
        if (!cancelled) {
          setConversations(rows);
          void refreshUnread();
        }
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
  }, [user, refreshUnread]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="سجّل دخولك لعرض رسائلك"
          description="المحادثات محمية ولا يطّلع عليها إلا طرفا المحادثة."
          actionLabel="تسجيل الدخول"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">رسائلي</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          تواصل مباشرة مع المهتمين أو أصحاب الأغراض بالوقت الفعلي.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <ListRowSkeleton count={4} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={28} />}
          title="لا توجد محادثات بعد"
          description="عندما تراسل صاحب غرض أو يراسلك أحد المهتمين ستظهر المحادثة هنا."
          actionLabel="تصفح الأغراض"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-[#1c1a17]">
          {conversations.map((conv) => {
            const partner = conv.buyer_id === user.id ? conv.seller : conv.buyer;
            const thumb = conv.listing?.images?.[0]?.storage_path
              ? getPublicImageUrl(conv.listing.images[0].storage_path)
              : null;
            const unread = conv.unread_count ?? 0;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="flex min-h-[76px] w-full items-center gap-3.5 p-4 text-start transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={conv.listing?.title ?? 'إعلان'}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400">
                      <Package size={22} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      {partner?.full_name || 'مستخدم'}
                    </span>
                    <span className="tabular-nums shrink-0 text-[11px] text-stone-400">
                      {formatRelativeTime(conv.last_message_at)}
                    </span>
                  </div>

                  <p className="truncate text-xs font-semibold text-olive-700 dark:text-olive-400">
                    {conv.listing?.title || 'إعلان'}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                    {conv.last_message?.body || 'بدأت محادثة جديدة'}
                  </p>
                </div>

                {unread > 0 && (
                  <span className="tabular-nums flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-olive-600 px-1.5 text-xs font-extrabold text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
