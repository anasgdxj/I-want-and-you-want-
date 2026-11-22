import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, Lock, Package, Send } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import {
  fetchConversationById,
  markConversationMessagesRead,
  sendMessage,
  subscribeToConversationMessages,
} from '../lib/messages';
import { getPublicImageUrl } from '../lib/supabase';
import { formatRelativeTime, getErrorMessage } from '../lib/utils';
import type { Conversation, Message } from '../types';

export default function ChatPage({ conversationId }: { conversationId: string }) {
  const { user, refreshUnread } = useAuth();
  const { navigate } = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchConversationById(conversationId, user.id)
      .then(async (res) => {
        if (cancelled) return;
        setConversation(res.conversation);
        setMessages(res.messages);
        if (res.conversation) {
          await markConversationMessagesRead(conversationId, user.id);
          await refreshUnread();
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeToConversationMessages(conversationId, (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      if (incoming.sender_id !== user.id) {
        void markConversationMessagesRead(conversationId, user.id).then(refreshUnread);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, user, refreshUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="سجّل دخولك لفتح المحادثة"
          description="يجب تسجيل الدخول لعرض الرسائل وإرسالها."
          actionLabel="تسجيل الدخول"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-olive-600" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-200/60 dark:text-stone-200"
        >
          <ArrowRight size={18} />
          <span>العودة للرسائل</span>
        </button>
        <EmptyState
          icon={<Lock size={26} />}
          title="تعذر فتح المحادثة"
          description={error ?? 'هذه المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها.'}
          actionLabel="رسائلي"
          onAction={() => navigate('/messages')}
        />
      </div>
    );
  }

  const partner = conversation.buyer_id === user.id ? conversation.seller : conversation.buyer;
  const thumb = conversation.listing?.images?.[0]?.storage_path
    ? getPublicImageUrl(conversation.listing.images[0].storage_path)
    : null;

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(conversation.id, user.id, text);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setBody('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-[#1c1a17]">
      {/* Chat Header */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 p-3.5 dark:border-stone-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/messages')}
            aria-label="العودة"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <ArrowRight size={20} />
          </button>

          <button
            type="button"
            onClick={() => conversation.listing && navigate(`/listing/${conversation.listing.id}`)}
            className="flex min-w-0 items-center gap-2.5 text-start"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
              {thumb ? (
                <img
                  src={thumb}
                  alt={conversation.listing?.title ?? ''}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-stone-400">
                  <Package size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
                {partner?.full_name || 'مستخدم'}
              </p>
              <p className="truncate text-xs font-semibold text-olive-700 dark:text-olive-400">
                {conversation.listing?.title || 'عرض الإعلان'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-stone-50/60 p-4 dark:bg-[#141311]">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
            ابدأ المحادثة الآن للاستفسار عن الغرض أو الاتفاق على الموعد.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? 'rounded-tr-sm bg-olive-600 text-white'
                      : 'rounded-tl-sm border border-stone-200 bg-white text-stone-900 dark:border-stone-800 dark:bg-[#1c1a17] dark:text-stone-100'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{msg.body}</p>
                  <p
                    className={`tabular-nums mt-1 text-[10px] ${
                      mine ? 'text-olive-100' : 'text-stone-400'
                    }`}
                  >
                    {formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-[#1c1a17]"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب رسالتك هنا..."
          className="min-h-[44px] flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="إرسال"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-olive-600 px-4 text-white transition-colors hover:bg-olive-700 disabled:opacity-50"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
