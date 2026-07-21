import { supabase } from "@/integrations/supabase/client";

/** How long after sending a message can still be edited. Enforced both here
 *  (for hiding the Edit action) and server-side by a Postgres trigger. */
export const EDIT_WINDOW_MINUTES = 15;

export type Conversation = {
  id: string;
  property_id: string | null;
  buyer_id: string;
  commissioner_id: string;
  last_message_at: string;
  created_at: string;
  deleted_for_buyer_at: string | null;
  deleted_for_commissioner_at: string | null;
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
  // Which listing this particular message is "about" — separate from the
  // conversation's own property_id, since one thread with an agent can span
  // several listings over time. Rendered as a small preview card in the thread.
  property_id: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
};

export type PropertyPreview = {
  id: string;
  title: string;
  images: string[];
  price: number;
  for_rent: boolean;
  location: string | null;
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
 *
 * If either participant had previously hidden this conversation, sending a
 * new message un-hides it for them (WhatsApp-style: a "deleted" chat comes
 * back to the inbox once new activity happens).
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
 * Sends a message in a conversation and bumps last_message_at. Also clears
 * the sender's own "hidden" flag on the conversation, so a chat they'd
 * deleted reappears in their inbox the moment they message in it again.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachment?: { url: string; name: string; type: "image" | "file" } | null,
  propertyId?: string | null,
  replyToId?: string | null,
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
      property_id: propertyId ?? null,
      reply_to_id: replyToId ?? null,
    });
  if (msgErr) throw msgErr;

  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_id, commissioner_id")
    .eq("id", conversationId)
    .maybeSingle();

  const unhide: Record<string, string | null> = { last_message_at: new Date().toISOString() };
  if (conv?.buyer_id === senderId) unhide.deleted_for_buyer_at = null;
  if (conv?.commissioner_id === senderId) unhide.deleted_for_commissioner_at = null;

  const { error: convErr } = await supabase.from("conversations").update(unhide).eq("id", conversationId);
  if (convErr) throw convErr;
}

/**
 * Starts (or reuses) a conversation and sends the first message in one call.
 * If propertyId is given, that first message is tagged with the listing so
 * it renders with a photo preview card in the thread.
 */
export async function startConversation(params: {
  buyerId: string;
  commissionerId: string;
  propertyId?: string | null;
  body: string;
}): Promise<string> {
  const conversationId = await getOrCreateConversation(params);
  await sendMessage(conversationId, params.buyerId, params.body, null, params.propertyId ?? null);
  return conversationId;
}

/** Edits the text of a message the current user sent, within the edit window. Enforced server-side too. */
export async function editMessage(messageId: string, newBody: string): Promise<void> {
  const { error } = await supabase.from("messages").update({ body: newBody }).eq("id", messageId);
  if (error) throw error;
}

/**
 * "Unsends" a message: clears its content and marks it deleted, replacing it
 * with a tombstone in the thread ("This message was unsent"). Only the
 * sender can do this, and it's allowed at any time (not limited to the edit
 * window) — enforced server-side by the update trigger.
 */
export async function unsendMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", messageId);
  if (error) throw error;
}

/**
 * Hides a conversation from the current user's inbox only — the other
 * participant still sees the full history, and it reappears for this user
 * automatically the next time either side sends a new message.
 */
export async function deleteConversationForUser(conversationId: string, userId: string): Promise<void> {
  const { data: conv, error: fetchErr } = await supabase
    .from("conversations")
    .select("buyer_id, commissioner_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!conv) return;

  const column = conv.buyer_id === userId ? "deleted_for_buyer_at" : "deleted_for_commissioner_at";
  const { error } = await supabase
    .from("conversations")
    .update({ [column]: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw error;
}

/**
 * Fetches all conversations for the current user, with the other participant's
 * profile (including contact info for the details panel) and last message preview.
 * Conversations this user has hidden (and that haven't received new activity
 * since) are excluded.
 */
export async function fetchConversations(userId: string) {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},commissioner_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!convs || convs.length === 0) return [];

  const visibleConvs = convs.filter((c) => {
    const isBuyer = c.buyer_id === userId;
    const hiddenAt = isBuyer ? c.deleted_for_buyer_at : c.deleted_for_commissioner_at;
    if (!hiddenAt) return true;
    return new Date(c.last_message_at) > new Date(hiddenAt);
  });
  if (visibleConvs.length === 0) return [];

  const otherIds = Array.from(
    new Set(visibleConvs.map((c) => (c.buyer_id === userId ? c.commissioner_id : c.buyer_id)))
  );
  const propertyIds = Array.from(new Set(visibleConvs.map((c) => c.property_id).filter(Boolean))) as string[];

  const [{ data: profiles }, { data: properties }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, phone, email").in("id", otherIds),
    propertyIds.length
      ? supabase.from("properties").select("id, title, images, price, for_rent, location").in("id", propertyIds)
      : Promise.resolve({ data: [] as PropertyPreview[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p]));

  const convIds = visibleConvs.map((c) => c.id);
  const { data: allMessages } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, created_at, read_at, deleted_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const lastMessageByConv = new Map<string, { body: string; sender_id: string; created_at: string; deleted_at: string | null }>();
  const unreadByConv = new Map<string, number>();
  (allMessages ?? []).forEach((m) => {
    if (!lastMessageByConv.has(m.conversation_id)) {
      lastMessageByConv.set(m.conversation_id, { body: m.body, sender_id: m.sender_id, created_at: m.created_at, deleted_at: m.deleted_at });
    }
    if (!m.read_at && m.sender_id !== userId && !m.deleted_at) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  });

  return visibleConvs.map((c) => {
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

/**
 * Fetches lightweight preview data (photo, title, price, location) for a
 * batch of property ids — used to render the per-message listing card in
 * the thread without re-querying per message.
 */
export async function fetchPropertyPreviews(propertyIds: string[]): Promise<Map<string, PropertyPreview>> {
  const ids = Array.from(new Set(propertyIds.filter(Boolean)));
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, images, price, for_rent, location")
    .in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p as PropertyPreview]));
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

/**
 * Subscribes to UPDATEs on messages in a conversation — used to live-update
 * the thread when a message is edited, unsent, or marked read (e.g. the
 * double-check "seen" tick appearing as soon as the other person opens it).
 */
export function subscribeToConversationUpdates(conversationId: string, onUpdate: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`conversation-updates:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Message)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
