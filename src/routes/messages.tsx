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
import { formatPrice, typeLabel } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare } from "lucide-react";

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

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;

  return (
    <div className="site-page min-h-screen">
      <Nav />
      <div className="mx-auto flex h-[calc(100vh-73px)] max-w-6xl">
        {/* Conversation list */}
        <div className="w-full shrink-0 border-r border-border sm:w-80">
          <div className="border-b border-border p-5">
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
              <MessageSquare className="h-5 w-5 text-primary" />Messages
            </h1>
          </div>
          <div className="overflow-y-auto" style={{ height: "calc(100% - 73px)" }}>
            {isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">
                No conversations yet. Message an agent from a listing or their profile to get started.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); navigate({ to: "/messages", search: { c: c.id } }); }}
                  className={`flex w-full items-start gap-3 border-b border-border p-4 text-left transition hover:bg-accent ${selected?.id === c.id ? "bg-accent" : ""}`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
                    {c.otherUser?.avatar_url
                      ? <img src={c.otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (c.otherUser?.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.otherUser?.full_name ?? "Unknown user"}</p>
                      {c.unreadCount > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    {c.property && <p className="truncate text-xs text-muted-foreground">{c.property.title}</p>}
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{c.lastMessage?.body ?? "No messages yet"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread panel */}
        <div className="hidden min-w-0 flex-1 flex-col sm:flex">
          {selected ? (
            <ConversationThread
              key={selected.id}
              conversationId={selected.id}
              currentUserId={user.id}
              otherUserName={selected.otherUser?.full_name ?? "Unknown user"}
              property={selected.property}
              onSent={() => qc.invalidateQueries({ queryKey: ["conversations"] })}
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationThread({
  conversationId, currentUserId, otherUserName, property, onSent,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  property: { id: string; title: string; images: string[] } | null;
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
        <div>
          <p className="font-display font-semibold">{otherUserName}</p>
          {property && <Link to="/properties/$id" params={{ id: property.id }} className="text-xs text-muted-foreground hover:text-primary">{property.title}</Link>}
        </div>
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
        className="flex items-center gap-2 border-t border-border p-4"
        onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm"
        />
        <Button type="submit" size="icon" disabled={!body.trim() || send.isPending} className="shrink-0 rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
