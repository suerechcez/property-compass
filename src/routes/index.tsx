import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ExploreOptions } from "@/components/ExploreOptions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn, Star } from "lucide-react";

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
  const navigate = useNavigate();

  // Native `<form action="/browse" method="get">` did a full browser
  // navigation to /browse?q=..., which works, but it's a hard page reload
  // that bypasses the app's client-side router entirely — it felt like
  // "just redirecting" rather than actually running the search inline.
  // Intercepting submit and using `navigate` instead performs a proper
  // in-app SPA transition straight into Browse's existing `q` search
  // filter (see browse.tsx's `filtered` list, which already matches
  // title/location against `q`), the same way every other Browse-bound
  // button/link in the app already navigates.
  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { filter: "all", q } });
  }

  return (
    <div className="site-page bg-background">
      <Nav />

      <section className="border-b border-border bg-background">
        {/* ── Mobile hero (below md) — a single tall photo with the
            headline, subtext, and search bar overlaid directly on top of
            it (inside a dark scrim for legibility). Unchanged. */}
        <div className="relative h-[560px] w-full overflow-hidden bg-surface sm:h-[640px] md:hidden">
          {heroImageOk && (
            <img
              src={HERO_IMAGE_URL}
              alt="A featured One Higala Properties home"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              onError={() => setHeroImageOk(false)}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75" />
          <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-10 pt-24 animate-reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Cagayan de Oro City</span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] text-white">
              Bringing you home,<br />
              <span className="text-white">the </span>
              <span className="text-gold">higala</span>
              <span className="text-white"> way.</span>
            </h1>
            <p className="mt-4 text-base text-white/85">
              Explore condos, hotels, raw land, and resell properties across Cagayan de Oro City.
            </p>

            <form
              onSubmit={handleHeroSearch}
              className="mt-6 flex w-full items-center gap-2 rounded-full border border-white/20 bg-card px-5 py-2.5 shadow-lg"
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
          </div>
        </div>

        {/* ── Desktop hero (md and up) — inspired by a SaaS-style split
            hero: the whole thing is now one inset, rounded card (instead
            of a full-bleed edge-to-edge section) — plain text column on
            the left, photo filling the right side up to the card's own
            rounded corner. A small trust badge sits above the headline
            in place of the old plain uppercase eyebrow, and a floating,
            non-interactive stat chip sits on the photo. Headline colors
            (text-primary / text-gold) are untouched. The old "Browse
            listings" floating card/button on the photo has been removed
            entirely — no CTA button in the hero anymore, the search bar
            is the only actionable element. */}
        <div className="hidden px-6 py-10 md:block lg:px-12 lg:py-14 xl:px-16">
          <div className="mx-auto flex max-w-[1600px] overflow-hidden rounded-3xl border border-border shadow-xl">
            <div className="flex flex-col justify-center bg-background px-10 py-16 md:w-1/2 lg:px-14 lg:py-20 xl:px-16">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                <span className="text-xs font-medium text-foreground">Trusted across Cagayan de Oro City</span>
              </div>
              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] text-foreground md:text-6xl">
                Bringing you home,<br />
                <span className="text-primary">the </span>
                <span className="text-gold">higala</span>
                <span className="text-primary"> way.</span>
              </h1>
              <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
                Explore condos, hotels, raw land, and resell properties across Cagayan de Oro City.
              </p>

              <form
                onSubmit={handleHeroSearch}
                className="mt-10 flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm"
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
            </div>

            <div className="relative w-full bg-surface md:w-1/2">
              {heroImageOk && (
                <img
                  src={HERO_IMAGE_URL}
                  alt="A featured One Higala Properties home"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  onError={() => setHeroImageOk(false)}
                />
              )}
              {/* Floating stat chip — decorative only, not a link/button. */}
              <div className="absolute right-6 top-6 w-56 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur">
                <p className="text-[11px] font-medium text-muted-foreground">Property highlights</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <p className="font-display text-lg font-semibold text-primary">500+</p>
                    <p className="text-[11px] text-muted-foreground">Properties</p>
                  </div>
                  <div className="rounded-xl bg-gold/15 p-3">
                    <p className="font-display text-lg font-semibold text-gold-foreground">98%</p>
                    <p className="text-[11px] text-muted-foreground">Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
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
