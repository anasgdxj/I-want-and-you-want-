import { supabase } from './supabase';
import { getDemoState, setDemoState } from './demoStore';
import { getErrorMessage } from './utils';
import type { Conversation, Message, SwapOffer, SwapStatus } from '../types';

export async function getOrCreateConversation(
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<Conversation> {
  if (buyerId === sellerId) {
    throw new Error('لا يمكنك مراسلة نفسك على إعلانك الخاص');
  }

  if (!supabase) {
    const state = getDemoState();
    const existing = state.conversations.find(
      (c) => c.listing_id === listingId && c.buyer_id === buyerId,
    );
    if (existing) return existing;

    const created: Conversation = {
      id: `demo-conv-${Date.now()}`,
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    };
    setDemoState((prev) => ({
      ...prev,
      conversations: [created, ...prev.conversations],
    }));
    return created;
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (fetchErr) throw new Error(getErrorMessage(fetchErr));
  if (existing) return existing as Conversation;

  const { data: created, error: insertErr } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single();

  if (insertErr) throw new Error(getErrorMessage(insertErr));
  return created as Conversation;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) {
    const state = getDemoState();
    return state.conversations
      .filter((c) => c.buyer_id === userId || c.seller_id === userId)
      .map((c) => {
        const listing = state.listings.find((l) => l.id === c.listing_id) ?? null;
        const buyer = state.profiles.find((p) => p.id === c.buyer_id) ?? null;
        const seller = state.profiles.find((p) => p.id === c.seller_id) ?? null;
        const convMsgs = state.messages
          .filter((m) => m.conversation_id === c.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastMessage = convMsgs[convMsgs.length - 1] ?? null;
        const unreadCount = convMsgs.filter((m) => m.sender_id !== userId && !m.is_read).length;
        return {
          ...c,
          listing,
          buyer,
          seller,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `*,
      listing:listings(id, title, city, price_syp, offer_type, status, images:listing_images(*)),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, city, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, full_name, city, avatar_url)`,
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  const convs = (data ?? []) as Conversation[];

  if (convs.length === 0) return [];

  const convIds = convs.map((c) => c.id);
  const { data: msgRows, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  if (msgError) throw new Error(getErrorMessage(msgError));
  const messages = (msgRows ?? []) as Message[];

  return convs.map((conv) => {
    const convMsgs = messages.filter((m) => m.conversation_id === conv.id);
    const lastMessage = convMsgs[0] ?? null;
    const unreadCount = convMsgs.filter((m) => m.sender_id !== userId && !m.is_read).length;
    return {
      ...conv,
      last_message: lastMessage,
      unread_count: unreadCount,
    };
  });
}

export async function fetchConversationById(
  conversationId: string,
  userId: string,
): Promise<{ conversation: Conversation | null; messages: Message[] }> {
  if (!supabase) {
    const state = getDemoState();
    const conv = state.conversations.find((c) => c.id === conversationId);
    if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) {
      return { conversation: null, messages: [] };
    }
    const listing = state.listings.find((l) => l.id === conv.listing_id) ?? null;
    const buyer = state.profiles.find((p) => p.id === conv.buyer_id) ?? null;
    const seller = state.profiles.find((p) => p.id === conv.seller_id) ?? null;
    const msgs = state.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return {
      conversation: { ...conv, listing, buyer, seller },
      messages: msgs,
    };
  }

  const { data: convData, error: convErr } = await supabase
    .from('conversations')
    .select(
      `*,
      listing:listings(id, title, city, price_syp, offer_type, status, images:listing_images(*)),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, city, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, full_name, city, avatar_url)`,
    )
    .eq('id', conversationId)
    .maybeSingle();

  if (convErr) throw new Error(getErrorMessage(convErr));
  if (!convData) return { conversation: null, messages: [] };

  const { data: msgData, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgErr) throw new Error(getErrorMessage(msgErr));

  return {
    conversation: convData as Conversation,
    messages: (msgData ?? []) as Message[],
  };
}

export async function markConversationMessagesRead(conversationId: string, userId: string): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.conversation_id === conversationId && m.sender_id !== userId ? { ...m, is_read: true } : m,
      ),
    }));
    return;
  }

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const cleaned = body.trim();
  if (!cleaned) throw new Error('لا يمكن إرسال رسالة فارغة');

  if (!supabase) {
    const msg: Message = {
      id: `demo-msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      body: cleaned,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setDemoState((prev) => ({
      ...prev,
      messages: [...prev.messages, msg],
      conversations: prev.conversations.map((c) =>
        c.id === conversationId ? { ...c, last_message_at: msg.created_at } : c,
      ),
    }));
    return msg;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: cleaned,
    })
    .select()
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as Message;
}

export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: Message) => void,
): () => void {
  if (!supabase) {
    const handler = (e: StorageEvent) => {
      if (e.key) {
        const msgs = getDemoState().messages.filter((m) => m.conversation_id === conversationId);
        const latest = msgs[msgs.length - 1];
        if (latest) onNewMessage(latest);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  const channel = supabase
    .channel(`chat-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      },
    )
    .subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}

// ============ SWAP OFFERS ============
export async function createSwapOffer(input: {
  listing_id: string;
  proposer_id: string;
  offered_item_title: string;
  cash_diff_syp: number | null;
  notes: string | null;
}): Promise<SwapOffer> {
  if (!supabase) {
    const offer: SwapOffer = {
      id: `demo-offer-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      listing_id: input.listing_id,
      proposer_id: input.proposer_id,
      offered_item_title: input.offered_item_title.trim(),
      cash_diff_syp: input.cash_diff_syp,
      notes: input.notes,
      status: 'pending',
    };
    setDemoState((prev) => ({
      ...prev,
      swapOffers: [offer, ...prev.swapOffers],
    }));
    return offer;
  }

  const { data, error } = await supabase
    .from('swap_offers')
    .insert({
      listing_id: input.listing_id,
      proposer_id: input.proposer_id,
      offered_item_title: input.offered_item_title.trim(),
      cash_diff_syp: input.cash_diff_syp,
      notes: input.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as SwapOffer;
}

export async function fetchUserSwapOffers(userId: string): Promise<{
  incoming: SwapOffer[];
  outgoing: SwapOffer[];
}> {
  if (!supabase) {
    const state = getDemoState();
    const enriched = state.swapOffers.map((offer) => {
      const listing = state.listings.find((l) => l.id === offer.listing_id) ?? null;
      const proposer = state.profiles.find((p) => p.id === offer.proposer_id) ?? null;
      return { ...offer, listing, proposer };
    });

    return {
      incoming: enriched
        .filter((o) => o.listing?.owner_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      outgoing: enriched
        .filter((o) => o.proposer_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    };
  }

  const { data, error } = await supabase
    .from('swap_offers')
    .select(
      `*,
      listing:listings(id, title, city, owner_id, offer_type, images:listing_images(*)),
      proposer:profiles!swap_offers_proposer_id_fkey(id, full_name, city, avatar_url)`,
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  const rows = (data ?? []) as SwapOffer[];

  return {
    incoming: rows.filter((o) => o.listing?.owner_id === userId),
    outgoing: rows.filter((o) => o.proposer_id === userId),
  };
}

export async function updateSwapOfferStatus(offerId: string, status: SwapStatus): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      swapOffers: prev.swapOffers.map((o) =>
        o.id === offerId ? { ...o, status, updated_at: new Date().toISOString() } : o,
      ),
    }));
    return;
  }

  const { error } = await supabase.from('swap_offers').update({ status }).eq('id', offerId);
  if (error) throw new Error(getErrorMessage(error));
}
