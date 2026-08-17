import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BrowseMap, type MapProperty } from "@/components/BrowseMap";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn, Heart, ChevronDown, SlidersHorizontal, Home, Banknote } from "lucide-react";
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
  latitude: number | null;
  longitude: number | null;
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

function Browse() {
  const { filter: urlFilter, q: urlQ } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState(urlQ);
  const [listingFilter, setListingFilter] = useState<ListingFilter>(urlFilter);
  const [listingSelectOpen, setListingSelectOpen] = useState(false);
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  // Price range — free-form user input (not preset buckets), so visitors
  // can type any min/max that fits their budget rather than picking from
  // a fixed list of ranges. Strings (not numbers) so an empty field means
  // "no bound" rather than defaulting to 0. Kept in a popover (not a
  // native <select>, which can't hold two number inputs) that closes on
  // outside click, same pattern as StatusDropdown in dashboard.tsx.
  const [priceOpen, setPriceOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const priceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) setPriceOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  // Which listing (if any) is currently "active" — set by hovering either
  // a card in the list or a pin on the map, and read by both to highlight
  // the matching counterpart (ring on the card, filled pin on the map).
  // `null` just means nothing is currently hovered; there's no fallback
  // needed here since — unlike the old hover-preview panel this replaced —
  // nothing on screen depends on always having a "selected" listing.
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
  const { data: commissionerProfiles = new Map<string, { full_name: string | null; avatar_url: string | null; is_verified: boolean }>() } = useQuery({
    queryKey: ["browse-commissioner-profiles", commissionerIds],
    enabled: commissionerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", commissionerIds);
      if (error) throw error;
      return new Map((data ?? []).map((d) => [d.id, { full_name: d.full_name, avatar_url: d.avatar_url, is_verified: !!d.is_verified }]));
    },
  });
  const verifiedCommissionerIds = new Set(
    [...commissionerProfiles.entries()].filter(([, p]) => p.is_verified).map(([id]) => id)
  );

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

  const minPriceNum = minPrice.trim() ? Number(minPrice) : null;
  const maxPriceNum = maxPrice.trim() ? Number(maxPrice) : null;
  const filtered = properties.filter((p) => {
    const matchesQuery = q ? (p.title + " " + (p.location ?? "")).toLowerCase().includes(q.toLowerCase()) : true;
    const matchesListing = listingFilter === "rent" ? p.for_rent : listingFilter === "sale" ? !p.for_rent : true;
    const matchesMinPrice = minPriceNum == null || p.price >= minPriceNum;
    const matchesMaxPrice = maxPriceNum == null || p.price <= maxPriceNum;
    return matchesQuery && matchesListing && matchesMinPrice && matchesMaxPrice;
  });

  // Only listings with a dropped pin get a marker — older listings posted
  // before LocationPicker was required just don't show up on the map,
  // but stay fully visible in the card list beside it.
  const pinnedProperties: MapProperty[] = filtered
    .filter((p): p is Property & { latitude: number; longitude: number } => p.latitude != null && p.longitude != null)
    .map((p) => ({ id: p.id, title: p.title, price: p.price, for_rent: p.for_rent, latitude: p.latitude, longitude: p.longitude, images: p.images }));

  const priceLabel =
    minPriceNum != null && maxPriceNum != null
      ? `${formatPrice(minPriceNum)} – ${formatPrice(maxPriceNum)}`
      : minPriceNum != null
      ? `From ${formatPrice(minPriceNum)}`
      : maxPriceNum != null
      ? `Up to ${formatPrice(maxPriceNum)}`
      : "Price range";

  return (
    <div className="h-screen overflow-hidden site-page bg-background flex flex-col">
      <Nav />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Filter dropdowns — "All listings" / "All types" / "Price range"
              — plus the search bar, all on one row, split the same way as
              the card list / map row below: the three filters are capped
              at lg:max-w-2xl (matching the card list's width), and the
              search bar takes the remaining lg:flex-1 space so it lines
              up directly above the map instead of stopping short of it.
              relative + z-30 here so the whole filter bar (including the
              price popover, which otherwise only gets an implicit
              stacking context from its own entrance-animation transform)
              stacks above the listings section below, whose cards get
              their own transform-based stacking contexts from
              animate-reveal and would otherwise paint over the popover.
              Filter icons (SlidersHorizontal/Home/Banknote) are bare —
              no colored circle behind them, matching the Browse
              mega-dropdown — just the glyph in its accent color with a
              hover scale-up. */}
          <section className="relative z-30 shrink-0 animate-fade-in" style={{ animationDelay: "80ms" }}>
            <div className="px-6 pb-2 pt-4 sm:pb-3 sm:pt-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-2xl lg:flex-1">
                <div
                  className={`group relative animate-reveal overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-surface shadow-sm transition-all duration-200 ${
                    listingSelectOpen
                      ? "border-primary shadow-md ring-2 ring-primary/15"
                      : "border-border hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-primary transition-transform duration-200 ${
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
                    className="h-10 w-full appearance-none truncate bg-transparent pl-9 pr-8 text-sm font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">All listings</option>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                  <ChevronDown
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${
                      listingSelectOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>

                <div
                  className={`group relative animate-reveal overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-surface shadow-sm transition-all duration-200 ${
                    typeSelectOpen
                      ? "border-primary shadow-md ring-2 ring-primary/15"
                      : "border-border hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                  style={{ animationDelay: "60ms" }}
                >
                  <div
                    className={`pointer-events-none absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gold transition-transform duration-200 ${
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
                    className="h-10 w-full appearance-none truncate bg-transparent pl-9 pr-8 text-sm font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">All types</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${
                      typeSelectOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>

                {/* Price range — a real popover (not a native <select>,
                    which can't host two number inputs), styled to match
                    the two dropdowns beside it. User types exact min/max
                    values rather than picking from preset buckets. */}
                <div
                  ref={priceRef}
                  className={`group relative animate-reveal rounded-2xl border bg-gradient-to-br from-card to-surface shadow-sm transition-all duration-200 ${
                    priceOpen
                      ? "border-primary shadow-md ring-2 ring-primary/15"
                      : "border-border hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                  style={{ animationDelay: "120ms" }}
                >
                  <div
                    className={`pointer-events-none absolute left-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-primary transition-transform duration-200 ${
                      priceOpen ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceOpen((o) => !o)}
                    className="h-10 w-full truncate pl-9 pr-8 text-left text-sm font-medium text-foreground"
                  >
                    {priceLabel}
                  </button>
                  <ChevronDown
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${
                      priceOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />

                  {priceOpen && (
                    <div className="animate-scale-in absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-border bg-card p-4 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground">Min</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="₱0"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <span className="mt-4 text-muted-foreground">–</span>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground">Max</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="No max"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                        <Button size="sm" className="rounded-full" onClick={() => setPriceOpen(false)}>Apply</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search — sits to the right of the three filters and fills
                  the remaining width, so it lines up directly above the
                  map (same lg:flex-1 split used by the card list / map
                  row below), instead of stopping short of the map. */}
              <div
                className="flex items-center gap-0 overflow-hidden rounded-full border border-border bg-card shadow-sm animate-reveal lg:flex-1"
                style={{ animationDelay: "160ms" }}
              >
                <Search className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by neighborhood, subdivision, or title…" className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0" />
              </div>
              </div>
            </div>
          </section>

          {/* Listings list + results map. The card list sits on the left
              (capped to a comfortable reading width so cards don't stretch
              full-bleed once the map takes the rest of the row); a sticky
              map fills the remaining space on the right, showing a pin for
              every filtered listing that has a location dropped via
              LocationPicker. Hovering a card highlights its pin and
              hovering/clicking a pin highlights its card — both driven by
              the shared `hoveredId` state. Map is desktop-only (lg+); on
              mobile the list alone fills the page, same as before. */}
          <section className="min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-2 sm:pb-12 sm:pt-4">
            <div className="flex h-full flex-col gap-6 lg:flex-row lg:gap-6">
              <div className="min-w-0 flex-1 overflow-y-auto lg:max-w-2xl lg:h-full">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.map((p, i) => {
                      const isFav = favoriteIds.has(p.id);
                      const isActive = p.id === hoveredId;
                      return (
                        <div
                          key={p.id}
                          onMouseEnter={() => setHoveredId(p.id)}
                          onMouseLeave={() => setHoveredId((cur) => (cur === p.id ? null : cur))}
                          className={`group relative animate-reveal overflow-hidden rounded-2xl border bg-card card-hover transition-shadow duration-150 ${
                            isActive ? "border-primary ring-2 ring-primary/40" : "border-border"
                          }`}
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

              <aside className="hidden shrink-0 lg:block lg:h-full lg:flex-1">
                <div className="lg:h-full lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border">
                  <BrowseMap properties={pinnedProperties} hoveredId={hoveredId} onHoverMarker={setHoveredId} />
                </div>
              </aside>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
