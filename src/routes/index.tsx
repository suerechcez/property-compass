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

      {/* Split hero — headline + search in a padded left column, photo in
          a full-bleed right column that runs edge-to-edge to the browser's
          right side (no max-width, no rounded corners) instead of sitting
          in a framed box inside the centered container. */}
      <section className="border-b border-border">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-col justify-center px-6 py-16 md:w-1/2 md:py-24 lg:px-12 xl:pl-20 xl:pr-12 animate-reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cagayan de Oro City</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-foreground md:text-6xl">
              Bringing you home,<br />
              <span className="text-primary">the </span>
              <span className="bg-gradient-to-r from-primary via-primary to-gold bg-clip-text text-transparent">higala</span>
              <span className="text-primary"> way.</span>
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

            {/* Stats row — centered within the left column at every
                breakpoint (previously reverted to left-aligned from `sm`
                up, which is what made it look off-center on desktop). */}
            <div className="mt-10 flex w-full max-w-md flex-wrap justify-center gap-8 border-t border-border pt-8">
              <Stat value="500+" label="Properties" />
              <Stat value="12" label="Neighborhoods" />
              <Stat value="98%" label="Client satisfaction" />
            </div>
          </div>

          {/* Full-bleed photo column — stretches to match the text column's
              height on desktop (default flex align-items: stretch) and
              runs flush to the right edge of the browser, with square
              corners instead of the previous rounded frame. */}
          <div className="relative h-72 w-full animate-reveal bg-surface sm:h-96 md:h-auto md:w-1/2" style={{ animationDelay: "120ms" }}>
            {heroImageOk && (
              <img
                src={HERO_IMAGE_URL}
                alt="A featured One Higala Properties home"
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                onError={() => setHeroImageOk(false)}
              />
            )}
            <Link
              to="/browse"
              className="group absolute bottom-6 left-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-black/10 md:left-10"
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
    <div className="text-center">
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
