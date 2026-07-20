import { supabase } from "@/integrations/supabase/client";

export type Conversation = {
  id: string;
  property_id: string | null;
  buyer_id: string;
  commissioner_id: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

/**
 * Finds an existing conversation between this buyer and commissioner (optionally
 * scoped to a property), or creates one. Returns the conversation id.
 */
export async function getOrCreateConversation(params: {
  buyerId: string;
  commissionerId: string;
  propertyId?: string | null;
}): Promise<string> {
  const { buyerId, commissionerId, propertyId = null } = params;

  let query = supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("commissioner_id", commissionerId);

  query = propertyId ? query.eq("property_id", propertyId) : query.is("property_id", null);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ buyer_id: buyerId, commissioner_id: commissionerId, property_id: propertyId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

/** Sends a message in a conversation and bumps last_message_at. */
export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<void> {
  const { error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (msgErr) throw msgErr;

  const { error: convErr } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (convErr) throw convErr;
}

/** Starts (or reuses) a conversation and sends the first message in one call. */
export async function startConversation(params: {
  buyerId: string;
  commissionerId: string;
  propertyId?: string | null;
  body: string;
}): Promise<string> {
  const conversationId = await getOrCreateConversation(params);
  await sendMessage(conversationId, params.buyerId, params.body);
  return conversationId;
}

/** Fetches all conversations for the current user, with the other participant's profile and last message preview. */
export async function fetchConversations(userId: string) {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},commissioner_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!convs || convs.length === 0) return [];

  const otherIds = Array.from(
    new Set(convs.map((c) => (c.buyer_id === userId ? c.commissioner_id : c.buyer_id)))
  );
  const propertyIds = Array.from(new Set(convs.map((c) => c.property_id).filter(Boolean))) as string[];

  const [{ data: profiles }, { data: properties }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds),
    propertyIds.length
      ? supabase.from("properties").select("id, title, images").in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; title: string; images: string[] }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p]));

  // Last message preview + unread count per conversation
  const convIds = convs.map((c) => c.id);
  const { data: allMessages } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, created_at, read_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const lastMessageByConv = new Map<string, { body: string; sender_id: string; created_at: string }>();
  const unreadByConv = new Map<string, number>();
  (allMessages ?? []).forEach((m) => {
    if (!lastMessageByConv.has(m.conversation_id)) {
      lastMessageByConv.set(m.conversation_id, { body: m.body, sender_id: m.sender_id, created_at: m.created_at });
    }
    if (!m.read_at && m.sender_id !== userId) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  });

  return convs.map((c) => {
    const otherId = c.buyer_id === userId ? c.commissioner_id : c.buyer_id;
    return {
      ...c,
      otherUser: profileMap.get(otherId) ?? null,
      property: c.property_id ? propertyMap.get(c.property_id) ?? null : null,
      lastMessage: lastMessageByConv.get(c.id) ?? null,
      unreadCount: unreadByConv.get(c.id) ?? 0,
    };
  });
}

/** Fetches all messages in a conversation, oldest first. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Marks all messages in a conversation as read for the current user (i.e. messages sent by the other person). */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

/** Total unread message count across all of the current user's conversations — for nav/sidebar badges. */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${userId},commissioner_id.eq.${userId}`);
  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length === 0) return 0;

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/** Subscribes to new messages in a conversation via Supabase Realtime. Returns an unsubscribe function. */
export function subscribeToConversation(conversationId: string, onInsert: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
