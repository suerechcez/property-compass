import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "One Higala Properties Inc. — Bringing you home, the higala way" },
      { name: "description", content: "Discover condos, hotels, raw land, and resell properties in Cagayan de Oro City with One Higala Properties Inc." },
      { property: "og:title", content: "One Higala Properties Inc." },
      { property: "og:description", content: "Bringing you home, the higala way — Cagayan de Oro City condos, hotels, raw land, and resell properties." },
    ],
  }),
  component: Home,
});

function Home() {
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState("");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "list", type],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (type !== "all") query = query.eq("property_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = properties.filter((p) =>
    q
      ? (p.title + " " + (p.location ?? "")).toLowerCase().includes(q.toLowerCase())
      : true,
  );

  return (
    <div className="min-h-screen">
      <Nav />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            One Higala Properties Inc.
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
            Bringing you home, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">the higala way.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Explore condos, hotels, raw land, and resell properties across Cagayan de Oro and nearby communities.
          </p>
          <div className="mt-10 flex max-w-2xl gap-2 rounded-full border border-border bg-card p-2 shadow-lg shadow-primary/5">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Cagayan de Oro neighborhoods, subdivisions, or titles…"
              className="rounded-full border-0 bg-transparent text-base focus-visible:ring-0"
            />
            <Button className="rounded-full px-6">Search</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link to="/agents" className="rounded-full border border-border bg-card/70 px-4 py-1.5 font-medium hover:border-primary hover:text-primary">Meet our agents</Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5">
          <FilterChip active={type === "all"} onClick={() => setType("all")}>All</FilterChip>
          {PROPERTY_TYPES.map((t) => (
            <FilterChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
              {t.label}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Loading listings…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <h3 className="font-display text-2xl font-semibold">No listings yet</h3>
            <p className="mt-2 text-muted-foreground">
              When commissioners post properties, they'll appear here.
            </p>
            <Button asChild className="mt-6"><Link to="/auth">Become a commissioner</Link></Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/properties/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">
                      1HP
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                    <span>{typeLabel(p.property_type)}</span>
                    {p.for_rent && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold leading-tight">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.location ?? "Location TBD"}</p>
                  <p className="mt-4 font-display text-2xl font-semibold text-primary">
                    {formatPrice(p.price)}
                    {p.for_rent && <span className="text-base text-muted-foreground"> /mo</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t border-border bg-gradient-to-b from-background to-primary/5">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div>
            <p className="font-display font-semibold text-foreground">One Higala Properties Inc.</p>
            <p className="italic">Bringing you home, the higala way</p>
          </div>
          <p>© {new Date().getFullYear()} One Higala Properties Inc.</p>
        </div>
      </footer>
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/70 hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
