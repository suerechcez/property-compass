import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { ExploreOptions } from "@/components/ExploreOptions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Search, LogIn } from "lucide-react";

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

// Hero photo, stored at /public/hero-oh.jpg in this repo and served
// directly from the site's own domain at build/deploy time.
const HERO_IMAGE_URL = "/hero-oh.jpg";

function Home() {
  const [q, setQ] = useState("");
  const [heroImageOk, setHeroImageOk] = useState(true);
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      {/* ── Hero (Zillow-style full-bleed with CDO aerial photo) ──
          Nav lives INSIDE this relative section on mobile so it can float
          transparently on top of the photo (see Nav's `overlay` prop) —
          the header collapses out of document flow there, letting the hero
          run all the way up behind it, matching the reference screenshot.
          On desktop, Nav reverts to its own normal solid sticky bar.
          Made taller than before (720px desktop / up to 860px on mobile)
          so the photo reads clearly and every piece of hero content —
          including the "Meet our agents" pill — sits comfortably inside
          the image with room to spare, rather than crowding its bottom edge. */}
      <section className="relative h-[100svh] max-h-[860px] overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background md:h-[720px] md:max-h-none">
        <Nav overlay />

        {heroImageOk && (
          <img
            src={HERO_IMAGE_URL}
            alt="One Higala Properties hero"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            onError={() => setHeroImageOk(false)}
          />
        )}
        {/* Dark gradient overlay so text is legible — lighter than original */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/10" />

        {/* Content */}
        <div className="relative flex h-full flex-col items-start justify-center px-6 pb-12 md:px-16 md:pb-16 lg:px-24">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            One Higala Properties Inc.
          </span>

          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl">
            Bringing you home,{" "}
            <span className="text-blue-800">the </span>
            <span className="text-yellow-400">higala</span>
            <span className="text-blue-800"> way.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-white/85 drop-shadow md:text-lg">
            Explore condos, hotels, raw land, and resell properties across
            Cagayan de Oro City.
          </p>

          {/* Search bar — Zillow-style pill, submits into the Browse page */}
          <form
            action="/browse"
            method="get"
            className="mt-8 flex w-full max-w-2xl items-center gap-0 overflow-hidden rounded-full bg-white shadow-2xl shadow-black/30"
          >
            <Input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by neighborhood, subdivision, or title…"
              className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0 md:text-base"
            />
            <button
              type="submit"
              className="flex h-12 items-center gap-2 rounded-r-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/agents"
              className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Meet our agents
            </Link>
          </div>
        </div>
      </section>

      {/* ── Buy / Rent / Sell cards ── */}
      <ExploreOptions />

      {/* ── Sign-in prompt — signed-out visitors only ── */}
      {!loading && !user && (
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              Sign in for a better experience
            </h2>
            <p className="mt-4 font-display text-lg italic text-foreground/80">
              "Every home sold starts with someone brave enough to take the first step."
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          </div>
        </section>
      )}

      <footer className="border-t border-border bg-gradient-to-b from-background to-primary/5">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div>
            <p className="font-display font-semibold text-foreground">One Higala Properties Inc.</p>
            <p className="italic">Bringing you home, the higala way</p>
          </div>
          <p>© {new Date().getFullYear()} One Higala Properties Inc.</p>
        </div>
      </footer>
    </div>
  );
}
