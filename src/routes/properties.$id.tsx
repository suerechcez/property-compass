import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { typeLabel, formatPrice } from "@/lib/property-types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Phone, Mail, Star, Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite, fetchFavoriteIds } from "@/lib/favorites";
import { startConversation } from "@/lib/messages";

export const Route = createFileRoute("/properties/$id")({
  head: () => ({
    meta: [
      { title: "Property · One Higala Properties Inc." },
      { name: "description", content: "View this property listing with One Higala Properties Inc." },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isDeveloper, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!property) return null;

      const { data: agent } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, title, phone, email")
        .eq("id", property.commissioner_id)
        .maybeSingle();

      return { ...property, agent };
    },
  });

  const { data: favoriteIds = new Set<string>() } = useQuery({
    enabled: !!user,
    queryKey: ["favorite-ids"],
    queryFn: fetchFavoriteIds,
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ isFav }: { isFav: boolean }) => toggleFavorite(id, isFav),
    onSuccess: (_, { isFav }) => {
      qc.invalidateQueries({ queryKey: ["favorite-ids"] });
      qc.invalidateQueries({ queryKey: ["favorites-page"] });
      toast.success(isFav ? "Removed from favorites" : "Saved to favorites");
    },
    onError: () => toast.error("Failed to update favorites"),
  });

  function handleHeart() {
    if (!user) { navigate({ to: "/favorites" }); return; }
    favoriteMutation.mutate({ isFav: favoriteIds.has(id) });
  }

  const toggleFeatured = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from("properties").update({ is_featured: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "Placed as a Featured Sale on your profile" : "Removed from Featured Sales");
      qc.invalidateQueries({ queryKey: ["properties", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  if (isLoading) {
    return (
      <div className="site-page"><Nav /><div className="mx-auto max-w-5xl px-6 py-12 text-muted-foreground">Loading…</div></div>
    );
  }
  if (!data) {
    return (
      <div className="site-page">
        <Nav />
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">Listing not found</h1>
          <Button asChild className="mt-6"><Link to="/browse">Back to listings</Link></Button>
        </div>
      </div>
    );
  }

  const canEdit = user && (user.id === data.commissioner_id || isDeveloper || isAdmin);
  const isOwnListing = user?.id === data.commissioner_id;
  const contactPhone = data.contact_phone || data.agent?.phone;
  const contactEmail = data.contact_email || data.agent?.email;
  const isFav = favoriteIds.has(id);

  return (
    <div className="min-h-screen site-page">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← Back to listings</Link>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{typeLabel(data.property_type)}</span>
              {data.for_rent && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
              <span className="rounded-full border border-border px-2 py-0.5 capitalize">{data.status}</span>
              {data.is_featured && (
                <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">
                  <Star className="h-3 w-3 fill-current" /> Featured Sale
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{data.title}</h1>
            <p className="mt-2 text-muted-foreground">{data.location ?? "Location not set"}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-semibold text-primary">
              {formatPrice(data.price)}
              {data.for_rent && <span className="text-lg text-muted-foreground"> /mo</span>}
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {/* Heart / favorite button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleHeart}
                className={isFav ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                {isFav ? "Saved" : "Save"}
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant={data.is_featured ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFeatured.mutate(!data.is_featured)}
                    disabled={toggleFeatured.isPending}
                  >
                    <Star className={`h-4 w-4 ${data.is_featured ? "fill-current" : ""}`} />
                    {data.is_featured ? "Remove from Featured Sales" : "Place as Featured Sale"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: "/listings/$id/edit", params: { id: data.id } })}>
                    Edit listing
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {data.images?.length ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="overflow-hidden rounded-2xl md:col-span-2 md:row-span-2">
              <img src={data.images[0]} alt={data.title} className="aspect-[4/3] h-full w-full object-cover" />
            </div>
            {data.images.slice(1, 5).map((url, i) => (
              <div key={i} className="overflow-hidden rounded-2xl">
                <img src={url} alt={`${data.title} ${i + 2}`} className="aspect-[4/3] h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid aspect-[3/1] place-items-center rounded-2xl bg-surface font-display text-4xl text-muted-foreground">
            H
          </div>
        )}

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl font-semibold">About this property</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">
              {data.description || "No description provided yet."}
            </p>
            {data.features?.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-lg font-semibold">Highlights</h3>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {data.features.map((f) => (
                    <li key={f} className="rounded-md border border-border bg-card px-3 py-2">{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <aside className="rounded-2xl border border-border bg-card p-6">
              <dl className="space-y-3 text-sm">
                {data.bedrooms != null && <Fact label="Bedrooms" value={String(data.bedrooms)} />}
                {data.bathrooms != null && <Fact label="Bathrooms" value={String(data.bathrooms)} />}
                {data.area_sqm != null && <Fact label="Area" value={`${data.area_sqm} m²`} />}
                <Fact label="Type" value={typeLabel(data.property_type)} />
              </dl>
            </aside>

            <aside className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">Listed by</h3>
              <Link
                to="/agents/$id"
                params={{ id: data.commissioner_id }}
                className="mt-4 flex items-center gap-3 rounded-lg -mx-2 p-2 transition hover:bg-accent"
              >
                <Avatar className="h-12 w-12 border border-border">
                  {data.agent?.avatar_url && <AvatarImage src={data.agent.avatar_url} alt={data.agent.full_name ?? "Agent"} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
                    {(data.agent?.full_name ?? "A").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{data.agent?.full_name ?? "One Higala commissioner"}</p>
                  {data.agent?.title && <p className="truncate text-xs text-muted-foreground">{data.agent.title}</p>}
                </div>
              </Link>

              <div className="mt-4 space-y-2">
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="truncate">{contactPhone}</span>
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{contactEmail}</span>
                  </a>
                )}
                {!contactPhone && !contactEmail && (
                  <p className="text-sm text-muted-foreground">
                    No contact info provided yet — visit the agent's profile for more ways to reach them.
                  </p>
                )}
              </div>
            </aside>

            {/* Message the agent about this specific property */}
            {!isOwnListing && (
              <MessageAgentBox
                propertyId={data.id}
                commissionerId={data.commissioner_id}
                agentName={data.agent?.full_name ?? "the agent"}
                agentEmail={contactEmail}
                listingTitle={data.title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageAgentBox({
  propertyId, commissionerId, agentName, agentEmail, listingTitle,
}: {
  propertyId: string;
  commissionerId: string;
  agentName: string;
  agentEmail?: string | null;
  listingTitle: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(`Hi, I'm interested in "${listingTitle}". Is it still available?`);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();

    if (user) {
      if (!message.trim()) { toast.error("Write a message before sending."); return; }
      setSending(true);
      try {
        const conversationId = await startConversation({
          buyerId: user.id,
          commissionerId,
          propertyId,
          body: message.trim(),
        });
        toast.success(`Message sent to ${agentName}`);
        navigate({ to: "/messages", search: { c: conversationId } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setSending(false);
      }
      return;
    }

    // Guest fallback
    if (!agentEmail) { toast.error("This agent hasn't listed a contact email yet."); return; }
    window.location.href = `mailto:${agentEmail}?subject=${encodeURIComponent(`Inquiry: ${listingTitle}`)}&body=${encodeURIComponent(message)}`;
    toast.success("Opening your email app…");
  }

  return (
    <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        {user && <MessageSquare className="h-4 w-4 text-primary" />}
        Message {agentName.split(" ")[0]}
      </h3>
      <form className="mt-4 space-y-3" onSubmit={send}>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Sending…" : user ? "Send message" : "Contact agent"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {user
            ? "Opens a conversation in your Messages inbox, tied to this listing."
            : (
              <>
                Opens your email app to reach out. <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to message in-app instead.
              </>
            )}
        </p>
      </form>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/70 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
