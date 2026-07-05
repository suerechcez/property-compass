import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SideBar } from "@/components/SideBar";
import { ExploreOptions } from "@/components/ExploreOptions";
import { Search } from "lucide-react";

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

// CDO aerial photo. If this file hasn't been uploaded to /public yet, the <img>
// below will silently fail and fall back to the gradient background.
const HERO_IMAGE_URL =
  "https://raw.githubusercontent.com/suerechcez/property-compass/main/public/hero-cdo.jpg";

function Home() {
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState("");
  const [forRentOnly, setForRentOnly] = useState(false);
  const [heroImageOk, setHeroImageOk] = useState(true);

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

  const filtered = properties.filter((p) => {
    const matchesQuery = q
      ? (p.title + " " + (p.location ?? "")).toLowerCase().includes(q.toLowerCase())
      : true;
    const matchesRent = forRentOnly ? p.for_rent : true;
    return matchesQuery && matchesRent;
  });

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="flex">
        <SideBar />
        <div className="min-w-0 flex-1">

          {/* ── Hero (Zillow-style full-bleed with CDO aerial photo) ── */}
          <section className="relative h-[520px] overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background md:h-[600px]">
            {heroImageOk && (
              <img
                src={HERO_IMAGE_URL}
                alt="Cagayan de Oro City aerial view"
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="eager"
                onError={() => setHeroImageOk(false)}
              />
            )}
            {/* Dark gradient overlay so text is legible */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/20" />

            {/* Content */}
            <div className="relative flex h-full flex-col items-start justify-center px-6 md:px-16 lg:px-24">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                One Higala Properties Inc.
              </span>

              <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl">
                Bringing you home,{" "}
                <span className="text-primary">the higala way.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base text-white/85 drop-shadow md:text-lg">
                Explore condos, hotels, raw land, and resell properties across
                Cagayan de Oro City.
              </p>

              {/* Search bar — Zillow-style pill */}
              <div className="mt-8 flex w-full max-w-2xl items-center gap-0 overflow-hidden rounded-full bg-white shadow-2xl shadow-black/30">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && scrollToListings()}
                  placeholder="Search by neighborhood, subdivision, or title…"
                  className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0 md:text-base"
                />
                <button
                  onClick={scrollToListings}
                  className="flex h-12 items-center gap-2 rounded-r-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/agents"
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
                >
                  Meet our agents
                </Link>
              </div>
            </div>
          </section>

          {/* ── Buy / Rent / Sell cards ── */}
          <ExploreOptions
            onBuyClick={() => {
              setForRentOnly(false);
              scrollToListings();
            }}
            onRentClick={() => {
              setForRentOnly(true);
              scrollToListings();
            }}
          />

          {/* ── Property-type filter chips ── */}
          <section className="border-b border-border">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5">
              <FilterChip active={type === "all"} onClick={() => setType("all")}>All</FilterChip>
              {PROPERTY_TYPES.map((t) => (
                <FilterChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                  {t.label}
                </FilterChip>
              ))}
              {forRentOnly && (
                <FilterChip active onClick={() => setForRentOnly(false)}>
                  For Rent ✕
                </FilterChip>
              )}
            </div>
          </section>

          {/* ── Listings grid ── */}
          <section id="listings" className="mx-auto max-w-7xl px-6 py-12 scroll-mt-16">
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
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                        <span>{typeLabel(p.property_type)}</span>
                        {p.for_rent && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>
                        )}
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
      </div>
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
