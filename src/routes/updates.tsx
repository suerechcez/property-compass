import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const UPDATES_GUEST_JPG = "/updates-guest.jpg";
const UPDATES_GUEST_PNG = "/updates-guest.png";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Listing Updates · One Higala Properties Inc." },
      { name: "description", content: "Stay on top of the latest property listings and changes from One Higala agents." },
    ],
  }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const { user } = useAuth();

  const { data: recent = [] } = useQuery({
    enabled: !!user,
    queryKey: ["updates-page-listings"],
    queryFn: async () => {
      const { data: listings } = await supabase
        .from("properties")
        .select("id, title, price, property_type, location, images, created_at, commissioner_id")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);
      const ids = Array.from(new Set((listings ?? []).map((l) => l.commissioner_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (listings ?? []).map((l) => ({ ...l, commissioner: pm.get(l.commissioner_id) ?? null }));
    },
  });

  return (
    <div className="site-page min-h-screen">
      <Nav />
      <main className="flex flex-1 flex-col">
        {!user ? (
          // ── Guest gate (Zillow-style) ──
          <section className="flex flex-1 items-center bg-surface">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-10 px-8 py-20 md:flex-row md:items-center md:gap-16">
              <div className="max-w-sm shrink-0">
                <h1 className="font-display text-3xl font-semibold leading-snug sm:text-4xl">
                  Stay on top of new listings
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Sign in to see the latest property updates from One Higala agents and commissioners — fresh listings delivered right here.
                </p>
                <Button asChild className="mt-6" size="lg">
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
              <div className="relative flex-1">
                <img
                  src={UPDATES_GUEST_JPG}
                  alt="Listing updates illustration"
                  className="w-full max-w-md rounded-2xl object-cover shadow-elegant"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.endsWith(".jpg")) img.src = UPDATES_GUEST_PNG;
                    else img.style.display = "none";
                  }}
                />
                {/* Placeholder shown while image is absent */}
                <div className="absolute inset-0 -z-10 flex max-w-md items-center justify-center rounded-2xl bg-muted">
                  <Bell className="h-16 w-16 text-muted-foreground/30" />
                </div>
              </div>
            </div>
          </section>
        ) : (
          // ── Authenticated: show listing updates ──
          <section className="mx-auto w-full max-w-4xl px-6 py-10">
            <div className="mb-6 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1 className="font-display text-2xl font-semibold">Listing Updates</h1>
            </div>
            {recent.length === 0 ? (
              <p className="text-muted-foreground">No listing updates yet — check back soon.</p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/properties/$id"
                      params={{ id: p.id }}
                      className="group flex items-center gap-4 p-4 transition hover:bg-accent"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center font-display text-xl text-muted-foreground">H</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-semibold group-hover:text-primary">{p.title}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {typeLabel(p.property_type)} · {formatPrice(p.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By {p.commissioner?.full_name ?? "a commissioner"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
