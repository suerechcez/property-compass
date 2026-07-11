import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { SideBar, SideBarMobileTrigger } from "@/components/SideBar";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn } from "lucide-react";

type ListingFilter = "all" | "sale" | "rent";

// Hero photo, shown as the background of the heading/search box on every
// /browse view (All listings, For Sale, and For Rent alike). Upload the file
// to /public/hero-browse.jpg (or .png — either extension works, the <img>
// below tries .jpg first and falls back to .png automatically). It's
// absolutely positioned to fill just that box (object-cover), so it never
// spills into the nav above or the filter-chip row below.
const HERO_BROWSE_JPG = "/hero-browse.jpg";
const HERO_BROWSE_PNG = "/hero-browse.png";

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: (search.filter === "sale" || search.filter === "rent" ? search.filter : "all") as ListingFilter,
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Browse listings · One Higala Properties Inc." },
      { name: "description", content: "Browse condos, hotels, raw land, and resell properties across Cagayan de Oro City." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { filter: urlFilter, q: urlQ } = Route.useSearch();
  const { user } = useAuth();
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState(urlQ);
  const [listingFilter, setListingFilter] = useState<ListingFilter>(urlFilter);
  const [heroSrc, setHeroSrc] = useState(HERO_BROWSE_JPG);
  const [heroHidden, setHeroHidden] = useState(false);

  // Buy/Rent/Browse all route to this same "/browse" path with different search
  // params, so the component doesn't remount between them — only re-sync local
  // state here when the URL's filter/q actually changes (e.g. clicking Buy then
  // Rent), without clobbering the user's own in-page chip/search edits otherwise.
  useEffect(() => {
    setListingFilter(urlFilter);
  }, [urlFilter]);

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

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
    const matchesListing =
      listingFilter === "rent" ? p.for_rent : listingFilter === "sale" ? !p.for_rent : true;
    return matchesQuery && matchesListing;
  });

  const heading =
    listingFilter === "rent" ? "For rent" : listingFilter === "sale" ? "For sale" : "Browse listings";

  return (
    <div className="min-h-screen site-page">
      <Nav />
      <div className="flex">
        <SideBar />
        <div className="min-w-0 flex-1">
          {/* ── Search + heading — hero photo lives as this box's own background,
                 confined to this section only ── */}
          <section className="relative overflow-hidden border-b border-border bg-surface">
            {!heroHidden && (
              <img
                src={heroSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => {
                  if (heroSrc === HERO_BROWSE_JPG) setHeroSrc(HERO_BROWSE_PNG);
                  else setHeroHidden(true);
                }}
              />
            )}
            {!heroHidden && <div className="absolute inset-0 bg-surface/30" />}
            <div className="relative mx-auto max-w-7xl px-6 py-6 sm:py-8">
              <h1 className="font-display text-2xl font-semibold drop-shadow-sm sm:text-3xl">{heading}</h1>
              <p className="mt-1 text-sm text-muted-foreground drop-shadow-sm sm:text-base">
                Condos, hotels, raw land, and resell properties across Cagayan de Oro City.
              </p>
              <div className="mt-4 flex max-w-xl items-center gap-0 overflow-hidden rounded-full border border-border bg-card shadow-sm sm:mt-5">
                <Search className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by neighborhood, subdivision, or title…"
                  className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0"
                />
              </div>
            </div>
          </section>

          {/* ── Buy / Rent / All + property-type filter chips ── */}
          <section className="border-b border-border">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-4 sm:py-5">
              <FilterChip active={listingFilter === "all"} onClick={() => setListingFilter("all")}>
                All listings
              </FilterChip>
              <FilterChip active={listingFilter === "sale"} onClick={() => setListingFilter("sale")}>
                For Sale
              </FilterChip>
              <FilterChip active={listingFilter === "rent"} onClick={() => setListingFilter("rent")}>
                For Rent
              </FilterChip>
              <span className="mx-1 h-5 w-px bg-border" />
              <FilterChip active={type === "all"} onClick={() => setType("all")}>All types</FilterChip>
              {PROPERTY_TYPES.map((t) => (
                <FilterChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                  {t.label}
                </FilterChip>
              ))}
            </div>
          </section>

          {/* ── "Listing Updates" — mobile only, sits between the category
                 chips and the grid, opens the updates feed as a fullscreen HUD ── */}
          <div className="flex justify-center border-b border-border bg-surface/50 py-3 lg:hidden">
            <SideBarMobileTrigger />
          </div>

          {/* ── Listings grid ── */}
          <section className="mx-auto max-w-7xl px-6 py-6 sm:py-12">
            {isLoading ? (
              <p className="text-muted-foreground">Loading listings…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center sm:p-16">
                <h3 className="font-display text-xl font-semibold sm:text-2xl">No listings for now</h3>
                <p className="mt-2 text-muted-foreground">
                  When commissioners and agents post properties, they'll appear here.
                </p>
                {user ? (
                  <Button asChild className="mt-6"><Link to="/apply">Become a Commissioner / Agent</Link></Button>
                ) : (
                  <div className="mx-auto mt-6 max-w-sm">
                    <p className="font-display italic text-foreground/85">
                      "Every home sold starts with someone brave enough to take the first step."
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/auth">
                        <LogIn className="h-4 w-4" />
                        Sign in to get started
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                        <span>{typeLabel(p.property_type)}</span>
                        <div className="flex gap-1.5">
                          {p.is_owner_listed && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">FSBO</span>
                          )}
                          {p.for_rent && (
                            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>
                          )}
                        </div>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-semibold leading-tight sm:text-xl">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.location ?? "Location TBD"}</p>
                      <p className="mt-3 font-display text-xl font-semibold text-primary sm:mt-4 sm:text-2xl">
                        {formatPrice(p.price)}
                        {p.for_rent && <span className="text-base text-muted-foreground"> /mo</span>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
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
