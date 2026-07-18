import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/lib/favorites";
import { toast } from "sonner";

const FAVORITES_GUEST_JPG = "/favorites-guest.jpg";
const FAVORITES_GUEST_PNG = "/favorites-guest.png";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites · One Higala Properties Inc." },
      { name: "description", content: "Your saved properties at One Higala Properties Inc." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["favorites-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id, properties(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ favoriteId: r.property_id, ...r.properties })).filter(Boolean);
    },
  });

  const unfavorite = useMutation({
    mutationFn: (propertyId: string) => toggleFavorite(propertyId, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites-page"] });
      qc.invalidateQueries({ queryKey: ["favorite-ids"] });
      toast.success("Removed from favorites");
    },
    onError: () => toast.error("Failed to remove"),
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
                  Ready to move beyond searching?
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Favorites is where you can organize and compare the properties you're interested in. Sign in to see the homes you've saved and keep track of what you want to explore next.
                </p>
                <Button asChild className="mt-6" size="lg">
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
              <div className="relative flex-1">
                <img
                  src={FAVORITES_GUEST_JPG}
                  alt="Favorites illustration"
                  className="w-full max-w-md rounded-2xl object-cover shadow-elegant"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.endsWith(".jpg")) img.src = FAVORITES_GUEST_PNG;
                    else img.style.display = "none";
                  }}
                />
                {/* Placeholder shown while image is absent */}
                <div className="absolute inset-0 -z-10 flex max-w-md items-center justify-center rounded-2xl bg-muted">
                  <Heart className="h-16 w-16 text-muted-foreground/30" />
                </div>
              </div>
            </div>
          </section>
        ) : (
          // ── Authenticated: saved properties ──
          <section className="mx-auto w-full max-w-5xl px-6 py-10">
            <div className="mb-6 flex items-center gap-2">
              <Heart className="h-5 w-5 fill-current text-destructive" />
              <h1 className="font-display text-2xl font-semibold">Your Favorites</h1>
            </div>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : favorites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
                <Heart className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 font-display text-xl font-semibold">No saved properties yet</h3>
                <p className="mt-2 text-muted-foreground">Tap the heart on any listing to save it here.</p>
                <Button asChild className="mt-6"><Link to="/browse">Browse listings</Link></Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((p: any) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                    <Link to="/properties/$id" params={{ id: p.id }} className="block">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{typeLabel(p.property_type)}</p>
                        <h3 className="mt-1 font-display text-lg font-semibold leading-tight">{p.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{p.location ?? "Location TBD"}</p>
                        <p className="mt-3 font-display text-xl font-semibold text-primary">
                          {formatPrice(p.price)}
                          {p.for_rent && <span className="text-base text-muted-foreground"> /mo</span>}
                        </p>
                      </div>
                    </Link>
                    {/* Unfavorite button */}
                    <button
                      onClick={() => unfavorite.mutate(p.id)}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow transition hover:bg-card"
                      aria-label="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-current text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
