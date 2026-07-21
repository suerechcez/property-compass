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
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: "image" | "file" | null;
};

/**
 * Generic shape for anything shown in the notification bell dropdown.
 * Only "message" is populated today — future notification sources
 * (e.g. listing approvals, C/A request decisions) can be appended to
 * the same list by producing items in this shape and merging arrays
 * in whatever calls fetchMessageNotifications.
 */
export type NotificationItem = {
  id: string;
  type: "message";
  title: string;
  body: string;
  createdAt: string;
  href: string;
  avatarUrl: string | null;
};

/**
 * Finds an existing conversation between this buyer and commissioner, or
 * creates one. Conversations are one-per-agent-relationship, not one-per-
 * property — messaging the same agent from their profile, from a listing,
 * or from a different listing always continues the same thread.
 * `propertyId`, when given, is only used as context: it's recorded on the
 * conversation the first time it's created (so the inbox can show "started
 * from listing X"), but never causes a second thread to be created.
 */
export async function getOrCreateConversation(params: {
  buyerId: string;
  commissionerId: string;
  propertyId?: string | null;
}): Promise<string> {
  const { buyerId, commissionerId, propertyId = null } = params;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, property_id")
    .eq("buyer_id", buyerId)
    .eq("commissioner_id", commissionerId)
    .maybeSingle();

  if (existing) {
    // Backfill property context if this thread didn't have one yet.
    if (!existing.property_id && propertyId) {
      await supabase.from("conversations").update({ property_id: propertyId }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ buyer_id: buyerId, commissioner_id: commissionerId, property_id: propertyId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

/**
 * Sends a message in a conversation and bumps last_message_at.
 * An optional attachment (already uploaded to storage) can be attached
 * alongside — or instead of — text body content.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachment?: { url: string; name: string; type: "image" | "file" } | null,
): Promise<void> {
  const { error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
    });
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

/**
 * Fetches all conversations for the current user, with the other participant's
 * profile (including contact info for the details panel) and last message preview.
 */
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
    // phone + email pulled in for the contact details panel
    supabase.from("profiles").select("id, full_name, avatar_url, phone, email").in("id", otherIds),
    propertyIds.length
      ? supabase.from("properties").select("id, title, images, price, for_rent").in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; title: string; images: string[]; price: number; for_rent: boolean }[] }),
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

/**
 * Fetches the most recent unread messages across all of the current user's
 * conversations, shaped as NotificationItem for the notification bell
 * dropdown — sender name/avatar, message preview, and a deep link straight
 * to that conversation.
 */
export async function fetchMessageNotifications(userId: string, limit = 8): Promise<NotificationItem[]> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${userId},commissioner_id.eq.${userId}`);
  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length === 0) return [];

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!msgs || msgs.length === 0) return [];

  const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return msgs.map((m) => {
    const sender = profileMap.get(m.sender_id);
    return {
      id: m.id,
      type: "message" as const,
      title: sender?.full_name ?? "New message",
      body: m.body,
      createdAt: m.created_at,
      href: `/messages?c=${m.conversation_id}`,
      avatarUrl: sender?.avatar_url ?? null,
    };
  });
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
