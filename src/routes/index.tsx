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
      {/* `overlay` makes the bar transparent and floats it over the mobile
          hero photo below (mobile/tablet-portrait only — see Nav.tsx). */}
      <Nav overlay />

      <section className="border-b border-border">
        {/* ── Mobile hero (below md) — a single tall photo with the
            headline, subtext, and search bar overlaid directly on top of
            it (inside a dark scrim for legibility), instead of a separate
            text block below/beside the photo. No "Browse listings" card
            here — that shortcut is desktop-only (see the md+ block below). */}
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
          {/* Scrim graduates from faint at the very top (where the
              floating Nav icons need just enough contrast) to strong at
              the bottom (where the headline/search sit). */}
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

        {/* ── Desktop hero (md and up) — the photo now covers the ENTIRE
            hero section edge-to-edge (previously it only filled a right
            half-column, with a plain white left column for the text).
            The headline/search float directly on top of the photo,
            matching the mobile treatment above.

            Two layers handle legibility, for different reasons:
              1. A left-to-right scrim (`from-black/35` fading to
                 transparent) — adapts across whatever's in the photo at
                 any given point, so nothing floating on top of it ever
                 sits directly against a totally unpredictable
                 background. This is the "colors adapting" layer.
              2. The tag + headline + subtext additionally sit inside
                 their OWN solid white card — a hard guarantee of
                 contrast for the most important text, independent of
                 the scrim or whatever the photo happens to look like
                 underneath it. The search bar already had its own
                 opaque white pill from the start, so it didn't need
                 this treatment.
        */}
        <div className="relative hidden h-[34rem] w-full overflow-hidden bg-surface md:block lg:h-[40rem] xl:h-[46rem]">
          {heroImageOk && (
            <img
              src={HERO_IMAGE_URL}
              alt="A featured One Higala Properties home"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              onError={() => setHeroImageOk(false)}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-center px-6 py-16 lg:px-12 xl:pl-16 xl:pr-10 animate-reveal">
            <div className="max-w-xl rounded-2xl bg-white p-8 shadow-xl shadow-black/20 lg:p-10">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cagayan de Oro City</span>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-foreground lg:text-6xl">
                Bringing you home,<br />
                <span className="text-primary">the </span>
                <span className="text-gold">higala</span>
                <span className="text-primary"> way.</span>
              </h1>
              <p className="mt-6 text-base text-muted-foreground lg:text-lg">
                Explore condos, hotels, raw land, and resell properties across Cagayan de Oro City.
              </p>
            </div>

            <form
              onSubmit={handleHeroSearch}
              className="mt-6 flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-lg"
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

          {/* Moved to bottom-right (was bottom-left) — the left side is
              now occupied by the text card above, so the pill would
              otherwise overlap it on shorter viewports. */}
          <Link
            to="/browse"
            className="group absolute bottom-6 right-6 z-10 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-black/20"
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
