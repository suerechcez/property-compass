import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

      {/* Split hero — headline + search in a left column, photo in a
          full-bleed right column that runs edge-to-edge to the browser's
          right side (no max-width, no rounded corners) instead of sitting
          in a framed box inside the centered container. Text sits directly
          against left padding (no mx-auto centering block) so it reads as
          anchored to the page edge rather than floating in the middle of
          empty space. The headline itself has no max-width, so "Bringing
          you home," has the full column width to sit on one line before
          the manual <br/> — otherwise a narrow max-width forces an extra
          wrap before the intentional line break ever kicks in. */}
      <section className="border-b border-border">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-col justify-center px-6 py-20 md:w-1/2 md:py-36 lg:px-12 xl:pl-16 xl:pr-10 animate-reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cagayan de Oro City</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-foreground md:text-6xl">
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

          {/* Full-bleed photo column — stretches to match the text column's
              height on desktop (default flex align-items: stretch) and
              runs flush to the right edge of the browser, with square
              corners instead of the previous rounded frame. */}
          <div className="relative h-72 w-full animate-reveal bg-surface sm:h-96 md:h-auto md:w-1/2" style={{ animationDelay: "120ms" }}>
            {heroImageOk && (
              <img
                src={HERO_IMAGE_URL}
                alt="A featured One Higala Properties home"
                // Shifted the visible crop a bit left of dead-center
                // (default object-cover centers at 50%) so more of the
                // left side of the photo shows instead of the framing
                // feeling pushed toward the right edge.
                className="absolute inset-0 h-full w-full object-cover object-[35%_center]"
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
