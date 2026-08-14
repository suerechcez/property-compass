import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Footer } from "@/components/Footer";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn, Heart, ChevronDown, SlidersHorizontal, Home, ArrowRight } from "lucide-react";
import { toggleFavorite, fetchFavoriteIds } from "@/lib/favorites";
import { toast } from "sonner";

type ListingFilter = "all" | "sale" | "rent";

type Property = {
  id: string;
  title: string;
  location: string | null;
  price: number;
  property_type: string;
  images: string[] | null;
  for_rent: boolean;
  status: string;
  is_owner_listed: boolean;
  commissioner_id: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | string | null;
  description: string | null;
  [key: string]: unknown;
};

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

const HERO_BROWSE_URL = "/hero-browse.png";

function Browse() {
  const { filter: urlFilter, q: urlQ } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState(urlQ);
  const [listingFilter, setListingFilter] = useState<ListingFilter>(urlFilter);
  const [heroImageOk, setHeroImageOk] = useState(true);
  const [listingSelectOpen, setListingSelectOpen] = useState(false);
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  // Which listing (if any) the visitor is currently hovering in the grid,
  // driving the preview panel on the right. `null` means "no active
  // hover" — NOT "no preview": the preview falls back to the first
  // listing in the current (filtered) results so the panel is never
  // empty on first load, before the visitor has hovered anything yet.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => { setListingFilter(urlFilter); }, [urlFilter]);
  useEffect(() => { setQ(urlQ); }, [urlQ]);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "list", type],
    queryFn: async () => {
      let query = supabase.from("properties").select("*").in("status", ["published", "rented"]).order("created_at", { ascending: false });
      if (type !== "all") query = query.eq("property_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });

  const { data: favoriteIds = new Set<string>() } = useQuery({
    enabled: !!user,
    queryKey: ["favorite-ids"],
    queryFn: fetchFavoriteIds,
  });

  const commissionerIds = Array.from(new Set(properties.map((p) => p.commissioner_id)));
  const { data: verifiedCommissionerIds = new Set<string>() } = useQuery({
    queryKey: ["verified-commissioners", commissionerIds],
    enabled: commissionerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, is_verified")
        .in("id", commissionerIds)
        .eq("is_verified", true);
      if (error) throw error;
      return new Set((data ?? []).map((d) => d.id));
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFav }: { id: string; isFav: boolean }) => toggleFavorite(id, isFav),
    onSuccess: (_, { isFav }) => {
      qc.invalidateQueries({ queryKey: ["favorite-ids"] });
      qc.invalidateQueries({ queryKey: ["favorites-page"] });
      toast.success(isFav ? "Removed from favorites" : "Saved to favorites");
    },
    onError: () => toast.error("Failed to update favorites"),
  });

  function handleHeart(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate({ to: "/favorites" }); return; }
    favoriteMutation.mutate({ id, isFav: favoriteIds.has(id) });
  }

  const filtered = properties.filter((p) => {
    const matchesQuery = q ? (p.title + " " + (p.location ?? "")).toLowerCase().includes(q.toLowerCase()) : true;
    const matchesListing = listingFilter === "rent" ? p.for_rent : listingFilter === "sale" ? !p.for_rent : true;
    return matchesQuery && matchesListing;
  });

  // The property shown in the right-hand preview panel. Prefers whatever
  // is currently hovered; if nothing is hovered (first load, or the
  // previously-hovered listing dropped out of the filtered results),
  // falls back to the first listing in the current results so the panel
  // always has something to show rather than sitting empty.
  const previewProperty = filtered.find((p) => p.id === hoveredId) ?? filtered[0];

  const heading = listingFilter === "rent" ? "For rent" : listingFilter === "sale" ? "For sale" : "Browse listings";

  return (
    <div className="min-h-screen site-page bg-background">
      <Nav />
      <div className="flex flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header — hero-browse.png as the backdrop, with a dark-to-light
              gradient scrim (plus text-shadow on the heading/subtitle) so
              white text stays legible over any part of the photo,
              regardless of how light or dark that patch of image is.
              Heading, subtitle, and the search bar are all centered
              (text-center + mx-auto on the max-w-xl blocks) rather than
              left-aligned, so the hero reads as a single centered focal
              point instead of hugging the left edge. */}
          <section className="relative overflow-hidden">
            {heroImageOk && (
              <img
                src={HERO_BROWSE_URL}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setHeroImageOk(false)}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/35 to-black/10" />
            <div className="relative px-6 py-8 text-center sm:py-10">
              <h1
                className="font-display text-2xl font-semibold text-white sm:text-3xl animate-reveal"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
              >
                {heading}
              </h1>
              <p
                className="mx-auto mt-1 max-w-xl text-sm text-white/90 sm:text-base animate-reveal"
                style={{ animationDelay: "80ms", textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
              >
                Condos, hotels, raw land, and resell properties across Cagayan de Oro City.
              </p>
              <div className="mx-auto mt-5 flex max-w-xl items-center gap-0 overflow-hidden rounded-full border border-border bg-card shadow-sm animate-reveal" style={{ animationDelay: "160ms" }}>
                <Search className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by neighborhood, subdivision, or title…" className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0" />
              </div>
            </div>
          </section>

          {/* Filter dropdowns — the same "All listings" / "All types"
              dropdown pair used on the phone UI, now shown at every
              breakpoint instead of switching to a separate chip-row
              layout on tablet/desktop, so the filter experience is
              identical everywhere. */}
          <section className="animate-fade-in" style={{ animationDelay: "80ms" }}>
            <div className="px-6 py-4 sm:py-5">
              <div className="flex max-w-xl gap-3">
                <div
                  className={`group relative flex-1 animate-reveal overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-surface shadow-sm transition-all duration-200 ${
                    listingSelectOpen
                      ? "border-primary shadow-md ring-2 ring-primary/15"
                      : "border-border hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 ${
                      listingSelectOpen ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </div>
                  <select
                    value={listingFilter}
                    onChange={(e) => setListingFilter(e.target.value as ListingFilter)}
                    onFocus={() => setListingSelectOpen(true)}
                    onBlur={() => setListingSelectOpen(false)}
                    className="h-12 w-full appearance-none truncate bg-transparent pl-11 pr-9 text-sm font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">All listings</option>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                  <ChevronDown
                    className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${
                      listingSelectOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>

                <div
                  className={`group relative flex-1 animate-reveal overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-surface shadow-sm transition-all duration-200 ${
                    typeSelectOpen
                      ? "border-primary shadow-md ring-2 ring-primary/15"
                      : "border-border hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                  style={{ animationDelay: "60ms" }}
                >
                  <div
                    className={`pointer-events-none absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gold/20 text-gold-foreground transition-transform duration-200 ${
                      typeSelectOpen ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    <Home className="h-3.5 w-3.5" />
                  </div>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyTypeValue | "all")}
                    onFocus={() => setTypeSelectOpen(true)}
                    onBlur={() => setTypeSelectOpen(false)}
                    className="h-12 w-full appearance-none truncate bg-transparent pl-11 pr-9 text-sm font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">All types</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${
                      typeSelectOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Listings grid + hover preview panel. The grid sits on the
              left; a sticky preview panel sits on the right on large
              screens, showing whichever card is currently hovered
              (`hoveredId`) or — with nothing hovered yet — the first
              listing in the current results, so the panel is never
              empty. Only shown once results actually exist. */}
          <section className="px-6 py-6 sm:py-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-72 rounded-2xl border border-border bg-muted animate-shimmer animate-reveal" style={{ animationDelay: `${i * 40}ms` }} />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center sm:p-16 animate-scale-in">
                    <h3 className="font-display text-xl font-semibold sm:text-2xl">No listings for now</h3>
                    <p className="mt-2 text-muted-foreground">When commissioners and agents post properties, they'll appear here.</p>
                    {user ? (
                      <Button asChild className="mt-6 rounded-full transition hover:scale-105 active:scale-95"><Link to="/apply">Become a Commissioner / Agent</Link></Button>
                    ) : (
                      <div className="mx-auto mt-6 max-w-sm">
                        <p className="font-display italic text-foreground/85">"Every home sold starts with someone brave enough to take the first step."</p>
                        <Button asChild className="mt-4 rounded-full transition hover:scale-105 active:scale-95"><Link to="/auth"><LogIn className="h-4 w-4" />Sign in to get started</Link></Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                    {filtered.map((p, i) => {
                      const isFav = favoriteIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onMouseEnter={() => setHoveredId(p.id)}
                          className="group relative animate-reveal overflow-hidden rounded-2xl border border-border bg-card card-hover"
                          style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
                        >
                          <Link to="/properties/$id" params={{ id: p.id }} className="block">
                            <div className="aspect-[4/3] overflow-hidden bg-muted">
                              {p.images?.[0]
                                ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover group-img-zoom" />
                                : <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>
                              }
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                                <span>{typeLabel(p.property_type)}</span>
                                <div className="flex gap-1.5">
                                  {p.is_owner_listed && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">FSBO</span>}
                                  {p.status === "rented" && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">Rented</span>}
                                  {p.for_rent && p.status !== "rented" && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-1.5">
                                <h3 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{p.title}</h3>
                                <VerifiedBadge verified={verifiedCommissionerIds.has(p.commissioner_id)} size="icon" />
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{p.location ?? "Location TBD"}</p>
                              <p className="mt-3 font-display text-xl font-semibold text-primary sm:mt-4 sm:text-2xl">
                                {formatPrice(p.price)}
                                {p.for_rent && <span className="text-base text-muted-foreground"> /mo</span>}
                              </p>
                            </div>
                          </Link>
                          <button
                            onClick={(e) => handleHeart(e, p.id)}
                            className="btn-bounce absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow transition hover:scale-110"
                            aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                          >
                            <Heart className={`h-4 w-4 transition ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isLoading && filtered.length > 0 && (
                <aside className="hidden shrink-0 lg:block lg:w-[360px]">
                  <div className="lg:sticky lg:top-24">
                    {previewProperty && (
                      <BrowsePreviewPanel
                        property={previewProperty}
                        isFav={favoriteIds.has(previewProperty.id)}
                        verified={verifiedCommissionerIds.has(previewProperty.commissioner_id)}
                        onHeart={(e) => handleHeart(e, previewProperty.id)}
                      />
                    )}
                  </div>
                </aside>
              )}
            </div>

            <div className="mt-12 border-t border-border pt-10 animate-reveal" style={{ animationDelay: "200ms" }}>
              <RecentlyViewed />
            </div>
          </section>

          <div className="mt-auto">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Right-rail preview card on the Browse page — shows whichever listing is
 * currently hovered in the grid (or the first result, before any hover has
 * happened yet). Deliberately richer than the compact grid card: bigger
 * photo, specs line (bd/ba/m²), a description excerpt, and a direct link
 * into the full listing.
 */
function BrowsePreviewPanel({
  property, isFav, verified, onHeart,
}: {
  property: Property;
  isFav: boolean;
  verified: boolean;
  onHeart: (e: React.MouseEvent) => void;
}) {
  const specs = [
    property.bedrooms != null && `${property.bedrooms} bd`,
    property.bathrooms != null && `${property.bathrooms} ba`,
    property.area_sqm != null && `${property.area_sqm} m²`,
  ].filter(Boolean).join(" · ");

  return (
    <div key={property.id} className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Link to="/properties/$id" params={{ id: property.id }} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {property.images?.[0]
            ? <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover group-img-zoom" />
            : <div className="grid h-full w-full place-items-center font-display text-3xl text-muted-foreground">H</div>
          }
          <button
            onClick={onHeart}
            className="btn-bounce absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow transition hover:scale-110"
            aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`h-4 w-4 transition ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            <span>{typeLabel(property.property_type)}</span>
            <div className="flex gap-1.5">
              {property.is_owner_listed && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">FSBO</span>}
              {property.status === "rented" && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">Rented</span>}
              {property.for_rent && property.status !== "rented" && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <h3 className="truncate font-display text-lg font-semibold leading-tight">{property.title}</h3>
            <VerifiedBadge verified={verified} size="icon" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{property.location ?? "Location TBD"}</p>
          {specs && <p className="mt-1 text-xs text-muted-foreground">{specs}</p>}

          <p className="mt-3 font-display text-2xl font-semibold text-primary">
            {formatPrice(property.price)}
            {property.for_rent && <span className="text-base text-muted-foreground"> /mo</span>}
          </p>

          {property.description && (
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{property.description}</p>
          )}

          <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary transition group-hover:gap-2.5">
            View full listing <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </div>
  );
}
