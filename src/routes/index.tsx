import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
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

const HERO_IMAGE_URL = "/hero-oh.jpg";

function Home() {
  const [q, setQ] = useState("");
  const [heroImageOk, setHeroImageOk] = useState(true);
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="relative h-[560px] overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background md:h-[640px]">
        {heroImageOk && (
          <img src={HERO_IMAGE_URL} alt="One Higala Properties hero" className="absolute inset-0 h-full w-full object-cover object-center" loading="eager" onError={() => setHeroImageOk(false)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/10" />

        <div className="relative flex h-full flex-col items-start justify-center px-6 pb-12 md:px-16 md:pb-16 lg:px-24">
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl">
            Bringing you home,{" "}
            <span className="text-blue-800">the </span>
            <span className="text-yellow-400">higala</span>
            <span className="text-blue-800"> way.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-white/85 drop-shadow md:text-lg">
            Explore condos, hotels, raw land, and resell properties across Cagayan de Oro City.
          </p>

          <form action="/browse" method="get" className="mt-8 flex w-full max-w-2xl items-center gap-0 overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/30">
            <Input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by neighborhood, subdivision, or title…" className="flex-1 rounded-none border-0 bg-transparent text-sm focus-visible:ring-0 md:text-base" />
            <button type="submit" className="flex h-12 items-center gap-2 rounded-r-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/85">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>
      </section>

      <ExploreOptions />

      {!loading && !user && (
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Sign in for a better experience</h2>
            <p className="mt-4 font-display text-lg italic text-foreground/80">"Every home sold starts with someone brave enough to take the first step."</p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth"><LogIn className="h-4 w-4" />Sign in</Link>
            </Button>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
