import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ExploreOptions } from "@/components/ExploreOptions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn, ArrowUpRight } from "lucide-react";

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

const HERO_IMAGE_URL = "/hero-oh.png";

function Home() {
  const [q, setQ] = useState("");
  const [heroImageOk, setHeroImageOk] = useState(true);
  const { user, loading } = useAuth();

  return (
    <div className="site-page bg-background">
      <Nav />

      {/* Split, light hero — headline + search on the left, a single
          framed property photo on the right. Widened to max-w-[1600px]
          (up from max-w-7xl/1280px) with more generous side padding at
          large breakpoints so the page fills wide monitors instead of
          leaving a big empty gutter on either side. */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24 lg:px-12 xl:px-20 2xl:gap-20">
          <div className="animate-reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cagayan de Oro City</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-foreground md:text-6xl">
              Bringing you home,<br />
              <span className="text-primary">the higala</span> way.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
              Explore condos, hotels, raw land, and resell properties across Cagayan de Oro City — with clear pricing and no surprises.
            </p>

            <form
              action="/browse"
              method="get"
              className="mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by neighborhood, subdivision, or title…"
                className="h-8 flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none focus-visible:ring-0"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Search
              </button>
            </form>

            <div className="mt-10 flex flex-wrap gap-8 border-t border-border pt-8">
              <Stat value="500+" label="Properties" />
              <Stat value="12" label="Neighborhoods" />
              <Stat value="98%" label="Client satisfaction" />
            </div>
          </div>

          <div className="relative animate-reveal" style={{ animationDelay: "120ms" }}>
            <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-surface md:aspect-square">
              {heroImageOk && (
                <img
                  src={HERO_IMAGE_URL}
                  alt="A featured One Higala Properties home"
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={() => setHeroImageOk(false)}
                />
              )}
            </div>
            <Link
              to="/browse"
              className="group absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-black/5 md:left-8"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/20 text-gold-foreground">
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">Browse listings</span>
                <span className="block text-xs text-muted-foreground">See what's available now</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <ExploreOptions />

      {!loading && !user && (
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Sign in for a better experience</h2>
            <p className="mt-4 font-display text-lg italic text-foreground/80">"Every home sold starts with someone brave enough to take the first step."</p>
            <Button asChild size="lg" className="mt-6 rounded-full">
              <Link to="/auth"><LogIn className="h-4 w-4" />Sign in</Link>
            </Button>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
