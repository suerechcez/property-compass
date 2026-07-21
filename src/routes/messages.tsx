import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import {
  fetchConversations,
  fetchMessages,
  fetchPropertyPreviews,
  markConversationRead,
  sendMessage,
  editMessage,
  unsendMessage,
  deleteConversationForUser,
  subscribeToConversation,
  subscribeToConversationUpdates,
  EDIT_WINDOW_MINUTES,
  type Message,
  type PropertyPreview,
} from "@/lib/messages";
import { uploadMessageAttachment } from "@/lib/storage";
import { formatPrice } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Send, MessageSquare, Search, Phone, Mail, X, Info, ChevronLeft,
  Bold, Italic, Underline, Paperclip, Image as ImageIcon, FileText, Loader2, Home,
  CornerUpLeft, Pencil, Trash2, Check, CheckCheck, Ban,
} from "lucide-react";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages · One Higala Properties Inc." }] }),
  component: MessagesPage,
});

/**
 * Very small in-house formatting syntax (not full Markdown) used ONLY as the
 * storage format in the messages.body column:
 *   **bold**   __underline__   *italic*
 * The compose box itself never shows these markers — it's a contentEditable
 * rich-text field (see RichComposer below) where Bold/Italic/Underline apply
 * live via document.execCommand, and the resulting HTML is converted to this
 * mini-syntax only at send time via htmlToFormattedText(). This function is
 * the read side: turning stored mini-syntax back into real <strong>/<em>/<u>
 * elements when rendering a sent message bubble.
 */
function renderFormattedText(text: string): React.ReactNode {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  return text.split(tokenPattern).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return <u key={i}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Same mini-syntax as renderFormattedText, but for plain-text-only contexts
 * (conversation list preview, quoted-reply snippets, the "replying to"
 * footer) where JSX styling isn't rendered anyway — so instead of leaving
 * the raw marker characters (asterisks and underscores) visible, this
 * just unwraps them and keeps the underlying words.
 */
function stripFormattingMarkers(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/**
 * Write side: walks the contentEditable's DOM tree and converts real
 * <b>/<strong>, <i>/<em>, <u> elements (produced by document.execCommand)
 * into the **bold** / *italic* / __underline__ mini-syntax that gets stored
 * in messages.body and later parsed back by renderFormattedText above.
 * <div>/<p>/<br> become newlines, matching how Chrome/Firefox/Safari
 * structure contentEditable line breaks.
 */
function htmlToFormattedText(root: Node): string {
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join("");
    switch (el.tagName.toLowerCase()) {
      case "b":
      case "strong":
        return inner.trim() ? `**${inner}**` : inner;
      case "i":
      case "em":
        return inner.trim() ? `*${inner}*` : inner;
      case "u":
        return inner.trim() ? `__${inner}__` : inner;
      case "br":
        return "\n";
      case "div":
      case "p":
        return `${inner}\n`;
      default:
        return inner;
    }
  }
  const raw = Array.from(root.childNodes).map(walk).join("");
  return raw.replace(/\n+$/g, "").replace(/\n{3,}/g, "\n\n");
}

function MessagesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { c: urlConversationId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(urlConversationId ?? null);
  const [q, setQ] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { setSelectedId(urlConversationId ?? null); }, [urlConversationId]);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const deleteChat = useMutation({
    mutationFn: (conversationId: string) => deleteConversationForUser(conversationId, user!.id),
    onSuccess: (_d, conversationId) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (selectedId === conversationId) setSelectedId(null);
      toast.success("Chat deleted");
    },
    onError: () => toast.error("Couldn't delete that chat."),
  });

  if (loading || !user) {
    return <div className="site-page"><Nav /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  }

  const filteredConversations = q.trim()
    ? conversations.filter((c) => (c.otherUser?.full_name ?? "").toLowerCase().includes(q.trim().toLowerCase()))
    : conversations;

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;

  function selectConversation(id: string) {
    setSelectedId(id);
    setDetailsOpen(true);
    navigate({ to: "/messages", search: { c: id } });
  }

  return (
    <div className="site-page min-h-screen">
      <Nav />
      {/* Full-bleed — no max-width wrapper, so the three panels span the
          entire site frame edge to edge, same width as the Nav bar above. */}
      <div className="flex h-[calc(100vh-73px)] w-full">
        {/* ── Conversation list ── */}
        <div className={`w-full shrink-0 flex-col border-r border-border sm:w-80 sm:flex ${selected ? "hidden" : "flex"}`}>
          <div className="border-b border-border p-5">
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
                <MessageSquare className="h-5 w-5 text-primary" />Chats
              </h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {conversations.length}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ height: "calc(100% - 137px)" }}>
            {isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading…</p>
            ) : filteredConversations.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">
                {conversations.length === 0
                  ? "No conversations yet. Message an agent from a listing or their profile to get started."
                  : "No matching conversations."}
              </div>
            ) : (
              filteredConversations.map((c) => (
                <div key={c.id} className={`group relative border-b border-border ${selected?.id === c.id ? "bg-accent" : ""}`}>
                  <button
                    onClick={() => selectConversation(c.id)}
                    className="flex w-full items-start gap-3 p-4 pr-10 text-left transition hover:bg-accent"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
                      {c.otherUser?.avatar_url
                        ? <img src={c.otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                        : (c.otherUser?.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{c.otherUser?.full_name ?? "Unknown user"}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                        </span>
                      </div>
                      {c.property && <p className="truncate text-xs text-muted-foreground">{c.property.title}</p>}
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-muted-foreground">
                          {c.lastMessage?.deleted_at
                            ? "Message unsent"
                            : c.lastMessage?.body
                              ? stripFormattingMarkers(c.lastMessage.body)
                              : (c.lastMessage ? "📎 Attachment" : "No messages yet")}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete this chat with ${c.otherUser?.full_name ?? "this user"}? It leaves your inbox until new messages arrive.`)) {
                        deleteChat.mutate(c.id);
                      }
                    }}
                    aria-label="Delete chat"
                    title="Delete chat"
                    className="absolute right-3 top-4 grid h-7 w-7 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Thread panel — flex-1 fills all remaining width ── */}
        <div className={`min-w-0 flex-1 flex-col sm:flex ${selected ? "flex" : "hidden"}`}>
          {selected ? (
            <ConversationThread
              key={selected.id}
              conversationId={selected.id}
              currentUserId={user.id}
              otherUser={selected.otherUser}
              property={selected.property}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((o) => !o)}
              onBack={() => setSelectedId(null)}
              onSent={() => qc.invalidateQueries({ queryKey: ["conversations"] })}
            />
          ) : (
            <div className="hidden h-full place-items-center text-muted-foreground sm:grid">
              Select a conversation to view messages.
            </div>
          )}
        </div>

        {/* ── Contact details panel ── */}
        {selected && detailsOpen && (
          <ContactDetailsPanel
            otherUser={selected.otherUser}
            property={selected.property}
            onClose={() => setDetailsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ContactDetailsPanel({
  otherUser, property, onClose,
}: {
  otherUser: { id: string; full_name: string | null; avatar_url: string | null; phone?: string | null; email?: string | null } | null;
  property: { id: string; title: string; images: string[]; price: number; for_rent: boolean } | null;
  onClose: () => void;
}) {
  return (
    <div className="hidden w-80 shrink-0 flex-col border-l border-border md:flex">
      <div className="flex items-center justify-end p-3">
        <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center px-6 pb-6 text-center">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 font-display text-xl font-semibold text-primary-foreground">
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
            : (otherUser?.full_name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <p className="mt-3 font-display text-lg font-semibold">{otherUser?.full_name ?? "Unknown user"}</p>
        {otherUser?.id && (
          <Link to="/agents/$id" params={{ id: otherUser.id }} className="mt-0.5 text-sm text-primary hover:underline">
            View profile
          </Link>
        )}
      </div>

      <div className="space-y-3 border-t border-border px-6 py-5">
        {otherUser?.phone && (
          <a href={`tel:${otherUser.phone}`} className="flex items-center gap-3 text-sm text-foreground/80 hover:text-primary">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />{otherUser.phone}
          </a>
        )}
        {otherUser?.email && (
          <a href={`mailto:${otherUser.email}`} className="flex items-center gap-3 truncate text-sm text-foreground/80 hover:text-primary">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{otherUser.email}</span>
          </a>
        )}
        {!otherUser?.phone && !otherUser?.email && (
          <p className="text-sm text-muted-foreground">No contact info on file.</p>
        )}
      </div>

      {property && (
        <div className="border-t border-border px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About this listing</p>
          <Link
            to="/properties/$id"
            params={{ id: property.id }}
            className="block overflow-hidden rounded-xl border border-border transition hover:border-primary"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {property.images?.[0]
                ? <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center font-display text-lg text-muted-foreground">H</div>}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{property.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {formatPrice(property.price)}
                {property.for_rent && <span className="text-xs font-normal text-muted-foreground"> /mo</span>}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Card shown above a message that references a specific listing — photo,
 * title, price, location — so whoever's reading (sender scrolling back, or
 * the recipient) immediately sees which house is meant, without guessing
 * from text alone. Sized generously so the photo actually reads at a glance.
 */
function MessagePropertyCard({ property, isMine, onImageLoad }: { property: PropertyPreview; isMine: boolean; onImageLoad: () => void }) {
  return (
    <Link
      to="/properties/$id"
      params={{ id: property.id }}
      className={`mb-2 flex items-center gap-3 overflow-hidden rounded-xl border p-3 transition hover:opacity-90 ${
        isMine ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-background/70"
      }`}
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {property.images?.[0]
          ? <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" onLoad={onImageLoad} />
          : <div className="grid h-full w-full place-items-center"><Home className="h-5 w-5 text-muted-foreground" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-snug">{property.title}</p>
        <p className={`truncate text-sm font-semibold ${isMine ? "text-primary-foreground" : "text-primary"}`}>
          {formatPrice(property.price)}{property.for_rent && <span className="font-normal opacity-80">/mo</span>}
        </p>
        {property.location && (
          <p className={`truncate text-xs ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{property.location}</p>
        )}
      </div>
    </Link>
  );
}

/** Small quoted snippet of the message being replied to, shown inside the reply's own bubble. */
function QuotedMessage({ message, isMine }: { message: Message; isMine: boolean }) {
  const preview = message.deleted_at
    ? "This message was unsent"
    : message.body
      ? stripFormattingMarkers(message.body)
      : (message.attachment_type === "image" ? "📷 Photo" : message.attachment_url ? "📎 Attachment" : message.property_id ? "🏠 Listing" : "Message");
  return (
    <div className={`mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${isMine ? "border-primary-foreground/40 bg-primary-foreground/10" : "border-primary/40 bg-primary/5"}`}>
      <p className="truncate opacity-80">{preview}</p>
    </div>
  );
}

/** Reply / Edit / Unsend action buttons that fade in on hover next to a message bubble. */
function MessageHoverActions({
  deleted, canEdit, canUnsend, onReply, onEdit, onUnsend,
}: {
  deleted: boolean;
  canEdit: boolean;
  canUnsend: boolean;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
}) {
  if (deleted) return null;
  return (
    <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
      <button type="button" onClick={onReply} title="Reply" aria-label="Reply" className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
        <CornerUpLeft className="h-3.5 w-3.5" />
      </button>
      {canEdit && (
        <button type="button" onClick={onEdit} title="Edit" aria-label="Edit" className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {canUnsend && (
        <button type="button" onClick={onUnsend} title="Unsend" aria-label="Unsend" className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ConversationThread({
  conversationId, currentUserId, otherUser, property, detailsOpen, onToggleDetails, onBack, onSent,
}: {
  conversationId: string;
  currentUserId: string;
  otherUser: { id: string; full_name: string | null; avatar_url: string | null } | null;
  property: { id: string; title: string; images: string[] } | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const qc = useQueryClient();
  const [isEmpty, setIsEmpty] = useState(true);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks whether this conversation has done its first scroll yet. The
  // component remounts (key={selected.id}) whenever the user switches
  // chats, so this naturally resets to false for every new conversation.
  const hasScrolledOnceRef = useRef(false);

  // Forces a re-render every 30s so "Edit" fades away once a message ages
  // past the edit window, without needing to refetch anything.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  // Preview data for every distinct listing referenced by messages in this
  // thread (usually 0 or 1, but a long-running thread with the same agent
  // could span several properties over time).
  const propertyIdsInThread = Array.from(new Set(messages.map((m) => m.property_id).filter(Boolean))) as string[];
  const { data: propertyPreviews = new Map<string, PropertyPreview>() } = useQuery({
    queryKey: ["message-property-previews", conversationId, propertyIdsInThread.join(",")],
    queryFn: () => fetchPropertyPreviews(propertyIdsInThread),
    enabled: propertyIdsInThread.length > 0,
  });

  useEffect(() => {
    markConversationRead(conversationId, currentUserId).then(() => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [conversationId, currentUserId, qc]);

  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, (newMessage: Message) => {
      qc.setQueryData(["messages", conversationId], (old: Message[] = []) => [...old, newMessage]);
      if (newMessage.sender_id !== currentUserId) {
        markConversationRead(conversationId, currentUserId).then(() => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
        });
      }
    });
    return unsubscribe;
  }, [conversationId, currentUserId, qc]);

  // Live-reflects edits, unsends, and read receipts (the "seen" tick) as
  // they happen, without waiting for a manual refetch.
  useEffect(() => {
    const unsubscribe = subscribeToConversationUpdates(conversationId, (updated: Message) => {
      qc.setQueryData(["messages", conversationId], (old: Message[] = []) =>
        old.map((m) => (m.id === updated.id ? updated : m))
      );
    });
    return unsubscribe;
  }, [conversationId, qc]);

  // Jumps to the newest message whenever the message list changes. On the
  // very first load of a conversation this lands instantly ("auto") at the
  // bottom; new messages arriving afterward scroll in smoothly. Running the
  // scroll again on the next animation frame (not just immediately) matters
  // because attachment/property-card images haven't necessarily finished
  // laying out yet on the first pass — without the second call, a thread
  // with images can appear to stop partway up instead of at the very
  // bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;

    const isInitialLoad = !hasScrolledOnceRef.current;
    const jumpToBottom = () => el.scrollTo({ top: el.scrollHeight, behavior: isInitialLoad ? "auto" : "smooth" });

    jumpToBottom();
    requestAnimationFrame(jumpToBottom);
    hasScrolledOnceRef.current = true;
  }, [messages.length]);

  /** Re-anchors to the bottom once a message image finishes loading — but
   *  only if the user was already at (or very near) the bottom, so it never
   *  yanks them down while they're reading older messages further up. */
  function handleThreadImageLoad() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 300) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }

  // Keeps the toolbar buttons highlighted while the caret sits inside
  // bold/italic/underline text, and un-highlighted otherwise — mirrors
  // how Bold/Italic/Underline behave in Gmail, Google Docs, etc.
  useEffect(() => {
    function updateActiveFormats() {
      if (document.activeElement !== editorRef.current) return;
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    }
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, []);

  function handleEditorInput() {
    const text = editorRef.current?.textContent ?? "";
    setIsEmpty(text.trim().length === 0);
  }

  /** Toggles real bold/italic/underline on the current selection (or the
   *  caret's "typing state" if nothing's selected) — this is what makes
   *  the compose box show actual styled text instead of raw markers. */
  function toggleFormat(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    document.execCommand(command);
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  /** Pasting always inserts plain text, so pasted content can't smuggle in
   *  unexpected formatting or markup from other apps. */
  function handleEditorPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send.mutate();
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File is too large — please pick something under 15MB.");
        e.target.value = "";
        return;
      }
      setPendingFile(file);
    }
    e.target.value = ""; // allow picking the same file again later
  }

  const send = useMutation({
    mutationFn: async () => {
      const bodyText = editorRef.current ? htmlToFormattedText(editorRef.current) : "";
      if (!bodyText.trim() && !pendingFile) return;
      let attachment: { url: string; name: string; type: "image" | "file" } | null = null;
      if (pendingFile) {
        attachment = await uploadMessageAttachment(pendingFile, currentUserId);
      }
      await sendMessage(conversationId, currentUserId, bodyText.trim(), attachment, null, replyingTo?.id ?? null);
    },
    onSuccess: () => {
      if (editorRef.current) editorRef.current.innerHTML = "";
      setIsEmpty(true);
      setActiveFormats({ bold: false, italic: false, underline: false });
      setPendingFile(null);
      setReplyingTo(null);
      onSent();
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: () => toast.error("Couldn't send that message — please try again."),
  });

  const editMut = useMutation({
    mutationFn: ({ id, newBody }: { id: string; newBody: string }) => editMessage(id, newBody),
    onSuccess: (_d, v) => {
      qc.setQueryData(["messages", conversationId], (old: Message[] = []) =>
        old.map((m) => (m.id === v.id ? { ...m, body: v.newBody, edited_at: new Date().toISOString() } : m))
      );
      setEditingMessage(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't edit that message."),
  });

  const unsend = useMutation({
    mutationFn: (id: string) => unsendMessage(id),
    onSuccess: (_d, id) => {
      qc.setQueryData(["messages", conversationId], (old: Message[] = []) =>
        old.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString(), body: "", attachment_url: null, attachment_name: null, attachment_type: null } : m))
      );
      onSent();
    },
    onError: () => toast.error("Couldn't unsend that message."),
  });

  const canSend = (!isEmpty || !!pendingFile) && !send.isPending;
  const editWindowMs = EDIT_WINDOW_MINUTES * 60 * 1000;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <button onClick={onBack} aria-label="Back to conversations" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent sm:hidden">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{otherUser?.full_name ?? "Unknown user"}</p>
          {property && <Link to="/properties/$id" params={{ id: property.id }} className="truncate text-xs text-muted-foreground hover:text-primary">{property.title}</Link>}
        </div>
        <button
          onClick={onToggleDetails}
          aria-label="Toggle contact details"
          className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full transition md:grid ${detailsOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          const isDeleted = !!m.deleted_at;
          const propertyPreview = m.property_id ? propertyPreviews.get(m.property_id) : undefined;
          const repliedMessage = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : undefined;
          const isEditable = isMine && !isDeleted && Date.now() - new Date(m.created_at).getTime() < editWindowMs;
          const isEditingThis = editingMessage?.id === m.id;

          const actions = (
            <MessageHoverActions
              deleted={isDeleted}
              canEdit={isMine && isEditable}
              canUnsend={isMine}
              onReply={() => setReplyingTo(m)}
              onEdit={() => { setEditingMessage(m); setEditText(m.body); }}
              onUnsend={() => { if (confirm("Unsend this message? This can't be undone.")) unsend.mutate(m.id); }}
            />
          );

          return (
            <div key={m.id} className={`group flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
              {isMine && actions}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-surface"} ${isDeleted ? "italic opacity-70" : ""}`}>
                {isEditingThis ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className={`w-full resize-none rounded-md border p-2 text-sm ${isMine ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60" : "border-border bg-background"}`}
                    />
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button type="button" onClick={() => setEditingMessage(null)} className="opacity-80 hover:underline">Cancel</button>
                      <button
                        type="button"
                        onClick={() => editMut.mutate({ id: m.id, newBody: editText.trim() })}
                        disabled={!editText.trim() || editMut.isPending}
                        className="hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isDeleted && repliedMessage && <QuotedMessage message={repliedMessage} isMine={isMine} />}
                    {!isDeleted && propertyPreview && (
                      <MessagePropertyCard property={propertyPreview} isMine={isMine} onImageLoad={handleThreadImageLoad} />
                    )}
                    {!isDeleted && m.attachment_url && m.attachment_type === "image" && (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-lg">
                        <img
                          src={m.attachment_url}
                          alt={m.attachment_name ?? "Attachment"}
                          className="max-h-64 w-full object-cover"
                          onLoad={handleThreadImageLoad}
                        />
                      </a>
                    )}
                    {!isDeleted && m.attachment_url && m.attachment_type === "file" && (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download={m.attachment_name ?? undefined}
                        className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:underline ${isMine ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-background/60"}`}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.attachment_name ?? "Attachment"}</span>
                      </a>
                    )}
                    {isDeleted ? (
                      <p className="flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5 shrink-0" />
                        {isMine ? "You unsent a message" : "This message was unsent"}
                      </p>
                    ) : (
                      m.body && <p className="whitespace-pre-line">{renderFormattedText(m.body)}</p>
                    )}
                    <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                      {!isDeleted && m.edited_at && <span>· edited</span>}
                      {isMine && !isDeleted && (
                        m.read_at
                          ? <CheckCheck className="h-3 w-3" aria-label="Seen" />
                          : <Check className="h-3 w-3" aria-label="Sent" />
                      )}
                    </div>
                  </>
                )}
              </div>
              {!isMine && actions}
            </div>
          );
        })}
      </div>

      <form
        className="border-t border-border p-4"
        onSubmit={(e) => { e.preventDefault(); if (canSend) send.mutate(); }}
      >
        <div className="rounded-2xl border border-input bg-background">
          {replyingTo && (
            <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-xs">
              <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Replying to {replyingTo.sender_id === currentUserId ? "yourself" : otherUser?.full_name ?? "them"}
                </p>
                <p className="truncate text-muted-foreground">
                  {replyingTo.deleted_at
                    ? "This message was unsent"
                    : replyingTo.body
                      ? stripFormattingMarkers(replyingTo.body)
                      : (replyingTo.attachment_type ? "Attachment" : replyingTo.property_id ? "Listing" : "")}
                </p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {pendingFile && (
            <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
              {pendingFile.type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{pendingFile.name}</span>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                aria-label="Remove attachment"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Rich-text compose box — contentEditable so Bold/Italic/Underline
              apply as real styled text live, instead of showing bold/italic
              markers directly. The visible placeholder is a separate
              absolutely-positioned span since contentEditable has no native
              `placeholder` attribute. */}
          <div className="relative">
            {isEmpty && (
              <span className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
                Write a message…
              </span>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              role="textbox"
              aria-multiline="true"
              aria-label="Write a message"
              className="min-h-[44px] w-full whitespace-pre-wrap break-words px-4 pt-3 text-sm outline-none"
            />
          </div>

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => toggleFormat("bold")}
                aria-label="Bold"
                aria-pressed={activeFormats.bold}
                title="Bold"
                className={`grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground ${activeFormats.bold ? "bg-primary/10 text-primary" : ""}`}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleFormat("italic")}
                aria-label="Italic"
                aria-pressed={activeFormats.italic}
                title="Italic"
                className={`grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground ${activeFormats.italic ? "bg-primary/10 text-primary" : ""}`}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleFormat("underline")}
                aria-label="Underline"
                aria-pressed={activeFormats.underline}
                title="Underline"
                className={`grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground ${activeFormats.underline ? "bg-primary/10 text-primary" : ""}`}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach a file or photo"
                title="Attach a file or photo"
                className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                onChange={handleFilePicked}
                className="hidden"
              />
            </div>
            <Button type="submit" size="icon" disabled={!canSend} className="h-8 w-8 shrink-0 rounded-full">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
