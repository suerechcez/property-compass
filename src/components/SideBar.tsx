import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function useRecentUpdates() {
  return useQuery({
    queryKey: ["recent-commissioner-updates"],
    queryFn: async () => {
      const { data: listings } = await supabase
        .from("properties")
        .select("id, title, price, property_type, location, images, created_at, commissioner_id")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);
      const ids = Array.from(new Set((listings ?? []).map((l) => l.commissioner_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (listings ?? []).map((l) => ({ ...l, commissioner: pm.get(l.commissioner_id) ?? null }));
    },
  });
}

function SideBarContent() {
  const { data: recent = [] } = useRecentUpdates();
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground animate-fade-in">
        <Newspaper className="h-3.5 w-3.5" /> Listing updates
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground animate-fade-in">No listing updates yet.</p>
      ) : (
        <ul className="space-y-3">
          {recent.map((p, i) => (
            <li key={p.id} className="sidebar-item" style={{ animationDelay: `${i * 50}ms` }}>
              <Link
                to="/properties/$id"
                params={{ id: p.id }}
                className="group flex gap-2.5 rounded-lg p-1.5 -mx-1.5 transition hover:bg-accent"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover group-img-zoom" />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-display text-sm text-muted-foreground">H</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">{p.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {typeLabel(p.property_type)} · {formatPrice(p.price)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    By {p.commissioner?.full_name ?? "a commissioner"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SideBar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-card/40 lg:block animate-slide-left">
      <div className="sticky top-20 flex h-[calc(100vh-5rem)] flex-col gap-6 overflow-y-auto p-4">
        <SideBarContent />
      </div>
    </aside>
  );
}

export function SideBarMobileTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary hover:scale-105 active:scale-95 lg:hidden">
          <Megaphone className="h-4 w-4" />
          Listing Updates
        </button>
      </SheetTrigger>
      <SheetContent side="fullscreen" hideClose className="overflow-y-auto p-6 animate-fade-in">
        <SheetHeader>
          <SheetTitle className="font-display">Listing updates</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SideBarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
