import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  BadgeCheck,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Share2,
  Mail,
  Phone,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Agent Profile — One Higala Properties Inc.` },
      { name: "description", content: `Agent profile, listings, and sales history for agent ${params.id}.` },
    ],
  }),
  component: AgentProfile,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-4xl p-10 text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl p-10">Agent not found.</div>
  ),
});

type Property = {
  id: string;
  title: string;
  price: number | string;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | string | null;
  images: string[];
  for_rent: boolean;
  status: string;
  property_type: string;
  updated_at?: string;
  created_at: string;
};

function AgentProfile() {
  const { id } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["agent-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, phone, email, title, bio, years_experience, created_at, license_number, agency_name, specialties, languages, facebook_url",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  // Determine whether this person is registered as a Commissioner, an Agent,
  // or both — used as the fallback label when they haven't set a custom job title.
  const { data: roleRows = [] } = useQuery({
    queryKey: ["agent-roles", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .in("role", ["commissioner", "agent"]);
      return data ?? [];
    },
  });
  const roleLabel = roleRows.some((r) => r.role === "agent") ? "Agent" : "Commissioner";

  const { data: sales = [] } = useQuery({
    queryKey: ["agent-sales", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, properties(id, title, property_type, location, images, bedrooms, bathrooms, area_sqm, status)")
        .eq("commissioner_id", id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["agent-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("commissioner_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });

  const sold = useMemo(() => listings.filter((p) => p.status === "sold"), [listings]);
  const forSale = useMemo(() => listings.filter((p) => p.status === "published" && !p.for_rent), [listings]);
  const forRent = useMemo(() => listings.filter((p) => p.status === "published" && p.for_rent), [listings]);

  // Featured sales should highlight sales whose property isn't already shown
  // in the "Sold" carousel below — sold properties belong there, not here.
  const featuredSales = useMemo(
    () => sales.filter((s) => (s.properties as { status?: string } | null)?.status !== "sold"),
    [sales],
  );

  // Gallery for the header — the photos of what they're currently selling/renting.
  const galleryImages = useMemo(
    () => listings.flatMap((p) => p.images ?? []).slice(0, 10),
    [listings],
  );

  const stats = useMemo(() => {
    const totalVolume = sales.reduce((s, r) => s + Number(r.amount), 0);
    const prices = listings.map((p) => Number(p.price)).filter((n) => n > 0);
    return {
      count: sales.length,
      totalVolume,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    };
  }, [sales, listings]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.full_name ?? "Agent profile", url });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    }
  }

  function scrollToContact() {
    document.getElementById("contact-agent")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isLoading || !profile) {
    return <div className="mx-auto max-w-6xl p-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="site-page">
      {/* ── Header: profile card + listing photo gallery ── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-muted-foreground">
            <Link to="/agents" className="hover:text-primary">Cagayan de Oro City</Link>
            {" · "}
            <span className="text-foreground">{profile.full_name ?? roleLabel}</span>
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Left — profile card */}
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid place-items-center bg-primary p-8">
                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border-4 border-white/20 bg-gradient-to-br from-primary-foreground/20 to-primary-foreground/5 font-display text-4xl font-bold text-primary-foreground shadow-lg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name ?? "Agent"} className="h-full w-full object-cover" />
                  ) : (
                    (profile.full_name ?? "A").slice(0, 1).toUpperCase()
                  )}
                </div>
              </div>
              <div className="bg-card p-6">
                {profile.license_number && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Licensed
                  </span>
                )}
                <h1 className="mt-2 font-display text-2xl font-bold">{profile.full_name ?? roleLabel}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{profile.title ?? roleLabel}</p>
                {profile.agency_name && (
                  <p className="mt-2 text-sm font-medium">{profile.agency_name}</p>
                )}
                <p className="text-sm text-muted-foreground">One Higala {roleLabel}</p>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={scrollToContact}>
                    Contact {roleLabel}
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Share profile" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {(profile.email || profile.phone) && (
                  <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{profile.email}</span>
                      </a>
                    )}
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                        <Phone className="h-3.5 w-3.5 shrink-0" /> {profile.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right — gallery of what they're selling/renting */}
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {galleryImages.length > 0 ? (
                <ImageGallery images={galleryImages} />
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center font-display text-4xl text-muted-foreground">
                  H
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
            <Stat label="Sales" value={String(stats.count)} />
            <Stat label="Listings" value={String(listings.length)} />
            <Stat
              label="Price range"
              value={stats.minPrice != null ? `${formatPrice(stats.minPrice)}–${formatPrice(stats.maxPrice!)}` : "—"}
            />
            <Stat label="Average price" value={stats.avgPrice ? formatPrice(stats.avgPrice) : "—"} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_320px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-12">
          <FeaturedSalesCarousel sales={featuredSales} />

          <TeamSection profile={profile} roleLabel={roleLabel} />

          <ListingCarousel title="Sold" items={sold} soldStyle />
          <ListingCarousel title="For sale" items={forSale} />
          <ListingCarousel title="For rent" items={forRent} isRent />
        </div>

        {/* ── Sticky contact form ── */}
        <aside id="contact-agent" className="h-fit lg:sticky lg:top-24">
          <ContactForm agentName={profile.full_name ?? roleLabel} agentEmail={profile.email} roleLabel={roleLabel} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex h-full flex-col">
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
        <img src={images[active]} alt="" className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto p-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === active ? "border-primary" : "border-transparent opacity-70"}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselShell({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {title}
          {count != null && <span className="ml-1 font-normal text-muted-foreground">({count})</span>}
        </h2>
        <div className="flex gap-1.5">
          <button
            aria-label="Scroll left"
            onClick={() => ref.current?.scrollBy({ left: -300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => ref.current?.scrollBy({ left: 300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function FeaturedSalesCarousel({ sales }: { sales: Record<string, unknown>[] }) {
  if (sales.length === 0) return null;
  return (
    <CarouselShell title="Featured sales">
      {sales.slice(0, 8).map((s) => {
        const prop = s.properties as { id?: string; title?: string; images?: string[]; location?: string; bedrooms?: number; bathrooms?: number; area_sqm?: number } | null;
        const card = (
          <div className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {prop?.images?.[0] ? (
                <img src={prop.images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>
              )}
            </div>
            <div className="p-3">
              <p className="font-display text-lg font-bold">{formatPrice(s.amount as number)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[prop?.bedrooms != null && `${prop.bedrooms} bd`, prop?.bathrooms != null && `${prop.bathrooms} ba`, prop?.area_sqm != null && `${prop.area_sqm} sqft`]
                  .filter(Boolean)
                  .join(" | ") || prop?.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{prop?.location ?? "Cagayan de Oro City"}</p>
              <p className="mt-1.5 text-xs text-gold-foreground">
                Sold {formatDistanceToNow(new Date(s.sale_date as string), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
        return prop?.id ? (
          <Link key={s.id as string} to="/properties/$id" params={{ id: prop.id }}>{card}</Link>
        ) : (
          <div key={s.id as string}>{card}</div>
        );
      })}
    </CarouselShell>
  );
}

function TeamSection({
  profile,
  roleLabel,
}: {
  profile: { id: string; full_name: string | null; avatar_url: string | null; title: string | null };
  roleLabel: string;
}) {
  // No team structure exists yet — this renders as a single-member team (just
  // this agent) so the section/layout is already in place. Once teams are
  // implemented, swap this hardcoded array for a real team-members query.
  const members = [profile];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Meet the team</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {members.map((m) => (
          <Link
            key={m.id}
            to="/agents/$id"
            params={{ id: m.id }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.full_name ?? ""} className="h-full w-full object-cover" />
              ) : (
                (m.full_name ?? "A").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{m.full_name ?? roleLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{m.title ?? roleLabel}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ListingCarousel({
  title,
  items,
  isRent,
  soldStyle,
}: {
  title: string;
  items: Property[];
  isRent?: boolean;
  soldStyle?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <CarouselShell title={title} count={items.length}>
      {items.map((p) => (
        <Link
          key={p.id}
          to="/properties/$id"
          params={{ id: p.id }}
          className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {p.images?.[0] ? (
              <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>
            )}
            <span className="absolute left-2 top-2 rounded bg-foreground/85 px-2 py-0.5 text-[11px] font-semibold text-background">
              {soldStyle ? "Sold" : isRent ? "For rent" : "For sale"}
            </span>
          </div>
          <div className="p-3">
            <p className="font-display text-lg font-bold">
              {formatPrice(p.price)}
              {isRent && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[p.bedrooms != null && `${p.bedrooms} bd`, p.bathrooms != null && `${p.bathrooms} ba`, p.area_sqm != null && `${p.area_sqm} sqft`]
                .filter(Boolean)
                .join(" | ") || typeLabel(p.property_type)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{p.location ?? "Cagayan de Oro City"}</p>
          </div>
        </Link>
      ))}
    </CarouselShell>
  );
}

function ContactForm({
  agentName,
  agentEmail,
  roleLabel,
}: {
  agentName: string;
  agentEmail: string | null;
  roleLabel: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentEmail) {
      toast.error("This agent hasn't listed a contact email yet.");
      return;
    }
    const body = `Name: ${name}\nPhone: ${phone}\n\n${message}`;
    window.location.href = `mailto:${agentEmail}?subject=${encodeURIComponent(`Inquiry via One Higala Properties`)}&body=${encodeURIComponent(body)}`;
    toast.success("Opening your email app…");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Contact {agentName}</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div>
          <Label>Name</Label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="contact-phone">Phone</Label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+63 9XX XXX XXXX"
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <Label>Email</Label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <Label>Message (optional)</Label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${agentName.split(" ")[0]}, I'd like to know more about...`}
            className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm"
          />
        </div>
        <Button type="submit" className="w-full">Contact {roleLabel}</Button>
        <p className="text-[11px] text-muted-foreground">
          Submitting opens your email app with this message pre-filled to {agentName}.
        </p>
      </form>
    </div>
  );
}
