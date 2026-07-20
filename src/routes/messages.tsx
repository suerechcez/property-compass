import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
  type Message,
} from "@/lib/messages";
import { formatPrice } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Search, Phone, Mail, X, Info, ChevronLeft, Bold, Italic, Underline } from "lucide-react";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages · One Higala Properties Inc." }] }),
  component: MessagesPage,
});

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
      <div className="mx-auto flex h-[calc(100vh-73px)] max-w-[1400px]">
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
                      <p className="truncate text-sm text-muted-foreground">{c.lastMessage?.body ?? "No messages yet"}</p>
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

        {/* ── Thread panel ── */}
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
    <div className="hidden w-72 shrink-0 flex-col border-l border-border md:flex">
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
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

  const send = useMutation({
    mutationFn: async () => {
      if (!body.trim()) return;
      await sendMessage(conversationId, currentUserId, body.trim());
    },
    onSuccess: () => { setBody(""); onSent(); qc.invalidateQueries({ queryKey: ["messages", conversationId] }); },
  });

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
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                <p className="whitespace-pre-line">{m.body}</p>
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
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); }
            }}
            placeholder="Write a message…"
            rows={2}
            className="w-full resize-none border-0 bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            {/* Decorative formatting icons to match the reference toolbar — not wired to functionality */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="grid h-7 w-7 place-items-center rounded-md"><Bold className="h-3.5 w-3.5" /></span>
              <span className="grid h-7 w-7 place-items-center rounded-md"><Italic className="h-3.5 w-3.5" /></span>
              <span className="grid h-7 w-7 place-items-center rounded-md"><Underline className="h-3.5 w-3.5" /></span>
            </div>
            <Button type="submit" size="icon" disabled={!body.trim() || send.isPending} className="h-8 w-8 shrink-0 rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
