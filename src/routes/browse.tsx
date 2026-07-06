import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { SideBar } from "@/components/SideBar";
import { PROPERTY_TYPES, typeLabel, formatPrice, type PropertyTypeValue } from "@/lib/property-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type ListingFilter = "all" | "sale" | "rent";

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
  const { filter: initialFilter, q: initialQ } = Route.useSearch();
  const [type, setType] = useState<PropertyTypeValue | "all">("all");
  const [q, setQ] = useState(initialQ);
  const [listingFilter, setListingFilter] = useState<ListingFilter>(initialFilter);

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
    <div className="min-h-screen">
      <Nav />
      <div className="flex">
        <SideBar />
        <div className="min-w-0 flex-1">
          {/* ── Search + heading ── */}
          <section className="border-b border-border bg-surface">
            <div className="mx-auto max-w-7xl px-6 py-8">
              <h1 className="font-display text-3xl font-semibold">{heading}</h1>
              <p className="mt-1 text-muted-foreground">
                Condos, hotels, raw land, and resell properties across Cagayan de Oro City.
              </p>
              <div className="mt-5 flex max-w-xl items-center gap-0 overflow-hidden rounded-full border border-border bg-card">
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
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5">
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

          {/* ── Listings grid ── */}
          <section className="mx-auto max-w-7xl px-6 py-12">
            {isLoading ? (
              <p className="text-muted-foreground">Loading listings…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
                <h3 className="font-display text-2xl font-semibold">No listings yet</h3>
                <p className="mt-2 text-muted-foreground">
                  When commissioners post properties, they'll appear here.
                </p>
                <Button asChild className="mt-6"><Link to="/profile">Become a commissioner</Link></Button>
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
