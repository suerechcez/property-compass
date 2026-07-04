import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";

export function SideBar() {
  const { data: recent = [] } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, price, property_type, location, images, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-card/40 lg:block">
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-6 overflow-y-auto p-5">
        <section>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Newspaper className="h-3.5 w-3.5" /> Updates
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent posts yet.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/properties/$id"
                    params={{ id: p.id }}
                    className="group flex gap-3 rounded-lg p-2 -mx-2 transition hover:bg-accent"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center font-display text-sm text-muted-foreground">H</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">{p.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {typeLabel(p.property_type)} · {formatPrice(p.price)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
