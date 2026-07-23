import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { typeLabel, formatPrice } from "@/lib/property-types";
import { getRecentlyViewedIds } from "@/lib/recently-viewed";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * "You recently viewed" row — reads property ids out of the visitor's
 * localStorage view history (see src/lib/recently-viewed.ts, populated by
 * properties.$id.tsx whenever a listing is opened), fetches those
 * properties, and renders them as a horizontally-scrollable strip of small
 * cards. Renders nothing if there's no view history yet, or if none of
 * those listings still exist. `excludeId`, when given, hides that one
 * listing from its own "recently viewed" row (used on the property detail
 * page); Browse doesn't have a "current" listing, so it's omitted there.
 */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Read fresh on every render (cheap localStorage read) rather than
  // useState — naturally picks up any view recorded on a previous page
  // without extra plumbing.
  const ids = getRecentlyViewedIds(excludeId, 8);

  const { data: properties = [] } = useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, images, price, for_rent, location, bedrooms, bathrooms, area_sqm, property_type")
        .in("id", ids);
      if (error) throw error;
      // .in() doesn't preserve input order, so re-sort to match the
      // most-recently-viewed-first order from `ids`.
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      return ids.map((pid) => byId.get(pid)).filter((p): p is NonNullable<typeof p> => !!p);
    },
    enabled: ids.length > 0,
  });

  if (ids.length === 0 || properties.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">You recently viewed</h2>
        <div className="flex gap-1.5">
          <button
            aria-label="Scroll left"
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {properties.map((p) => (
          <Link
            key={p.id}
            to="/properties/$id"
            params={{ id: p.id }}
            className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>}
            </div>
            <div className="p-3">
              <p className="font-display text-lg font-bold">
                {formatPrice(p.price)}
                {p.for_rent && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  p.bedrooms != null && `${p.bedrooms} bd`,
                  p.bathrooms != null && `${p.bathrooms} ba`,
                  p.area_sqm != null && `${p.area_sqm} m²`,
                ].filter(Boolean).join(" | ") || typeLabel(p.property_type)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.location ?? "Cagayan de Oro City"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
