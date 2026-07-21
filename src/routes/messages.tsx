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
  subscribeToConversation,
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
} from "lucide-react";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages · One Higala Properties Inc." }] }),
  component: MessagesPage,
});

/**
 * Very small in-house formatting syntax (not full Markdown) so the
 * Bold/Italic/Underline toolbar buttons have something concrete to
 * produce and messages.tsx has something concrete to render:
 *   **bold**   __underline__   *italic*
 * Order matters: check the 2-character tokens before the 1-character
 * one, otherwise **bold** would get half-matched as italic first.
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
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-border p-4 text-left transition hover:bg-accent ${selected?.id === c.id ? "bg-accent" : ""}`}
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
                        {c.lastMessage?.body || (c.lastMessage ? "📎 Attachment" : "No messages yet")}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
 * Small inline card shown above a message that references a specific
 * listing — photo, title, price, location — so whoever's reading (sender
 * scrolling back, or the recipient) immediately sees which house is meant,
 * without having to guess from the text alone.
 */
function MessagePropertyCard({ property, isMine }: { property: PropertyPreview; isMine: boolean }) {
  return (
    <Link
      to="/properties/$id"
      params={{ id: property.id }}
      className={`mb-2 flex items-center gap-2.5 overflow-hidden rounded-xl border p-2 transition hover:opacity-90 ${
        isMine ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-background/70"
      }`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {property.images?.[0]
          ? <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" />
          : <div className="grid h-full w-full place-items-center"><Home className="h-4 w-4 text-muted-foreground" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{property.title}</p>
        <p className={`truncate text-[11px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {formatPrice(property.price)}{property.for_rent && "/mo"}
          {property.location ? ` · ${property.location}` : ""}
        </p>
      </div>
    </Link>
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
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  /** Wraps the current textarea selection in a formatting token (or inserts
   *  "text" as a placeholder if nothing is selected), then restores focus
   *  and re-selects the wrapped text so repeated clicks / typing feel natural. */
  function applyFormat(token: string) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || "text";
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    setBody(`${before}${token}${selected}${token}${after}`);
    requestAnimationFrame(() => {
      el.focus();
      const start = before.length + token.length;
      el.setSelectionRange(start, start + selected.length);
    });
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
      if (!body.trim() && !pendingFile) return;
      let attachment: { url: string; name: string; type: "image" | "file" } | null = null;
      if (pendingFile) {
        attachment = await uploadMessageAttachment(pendingFile, currentUserId);
      }
      await sendMessage(conversationId, currentUserId, body.trim(), attachment);
    },
    onSuccess: () => {
      setBody("");
      setPendingFile(null);
      onSent();
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: () => toast.error("Couldn't send that message — please try again."),
  });

  const canSend = (body.trim().length > 0 || !!pendingFile) && !send.isPending;

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
          const propertyPreview = m.property_id ? propertyPreviews.get(m.property_id) : undefined;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                {propertyPreview && <MessagePropertyCard property={propertyPreview} isMine={isMine} />}
                {m.attachment_url && m.attachment_type === "image" && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-lg">
                    <img src={m.attachment_url} alt={m.attachment_name ?? "Attachment"} className="max-h-64 w-full object-cover" />
                  </a>
                )}
                {m.attachment_url && m.attachment_type === "file" && (
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
                {m.body && <p className="whitespace-pre-line">{renderFormattedText(m.body)}</p>}
                <p className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="border-t border-border p-4"
        onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
      >
        <div className="rounded-2xl border border-input bg-background">
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
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) send.mutate(); }
            }}
            placeholder="Write a message…"
            rows={2}
            className="w-full resize-none border-0 bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => applyFormat("**")}
                aria-label="Bold"
                title="Bold"
                className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("*")}
                aria-label="Italic"
                title="Italic"
                className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("__")}
                aria-label="Underline"
                title="Underline"
                className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent hover:text-foreground"
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
