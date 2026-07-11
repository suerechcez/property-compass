import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Handshake, TrendingUp, LogIn } from "lucide-react";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell your property · One Higala Properties Inc." },
      { name: "description", content: "Sell your property in Cagayan de Oro City with One Higala Properties Inc. — work with a commissioner or agent, or list it yourself." },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { user, loading, isCommissioner, isAgent } = useAuth();
  const alreadyRegistered = isCommissioner || isAgent;

  return (
    <div className="min-h-screen site-page">
      <Nav />

      {/* ── Intro: dark navy field with two option cards + CTA ── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
          <h1 className="font-display text-3xl font-bold text-white md:text-5xl">
            Sell with a <span className="text-gold">One Higala</span> professional
          </h1>

          <div className="mt-10 grid gap-6 text-left md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Handshake className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                Sell with a commissioner or agent
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Work with a trusted One Higala commissioner or agent who handles pricing,
                marketing, and negotiations for you — from listing to turnover.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-8">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                Maximize your home's visibility
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Reach buyers actively browsing Cagayan de Oro City listings on One Higala
                Properties, whether you list with a pro or list it yourself.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-white/85">
            Answer a couple of questions to connect with a commissioner or agent, or explore
            listing your property yourself — no commitment required.
          </p>

          <Button asChild size="lg" className="mt-6 rounded-full bg-white text-primary hover:bg-white/90">
            <a href="#sell-options">Get started</a>
          </Button>
        </div>
      </section>

      {/* ── Two paths ── */}
      <section id="sell-options" className="mx-auto max-w-5xl space-y-8 px-6 py-16">
        {/* Find your own agent */}
        <div className="grid overflow-hidden rounded-2xl bg-primary md:grid-cols-2">
          <div className="aspect-video bg-primary/70 md:aspect-auto" />
          <div className="p-8 md:p-10">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Find your own <span className="text-gold">agent</span>
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-white/90">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                <span>
                  <strong className="text-white">Ready to work with a pro?</strong> Search
                  commissioners and agents by specialties and service areas to find the right match.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                <span>
                  <strong className="text-white">Already have someone in mind?</strong> Browse
                  their profile, credentials, and track record before you commit.
                </span>
              </li>
            </ul>
            <Button asChild className="mt-6 rounded-full bg-white text-primary hover:bg-white/90">
              <Link to="/agents">Find agents near you →</Link>
            </Button>
          </div>
        </div>

        {/* Sell your home yourself */}
        <div className="grid overflow-hidden rounded-2xl bg-primary md:grid-cols-2">
          <div className="order-2 p-8 md:order-1 md:p-10">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Sell your home <span className="text-gold">yourself</span>
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-white/90">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                Reach more potential buyers with a For Sale By Owner listing.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                Manage everything yourself — photos, pricing, and inquiries.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                No commissioner or agent role required to get listed.
              </li>
            </ul>
            {loading ? null : user ? (
              <Button asChild className="mt-6 rounded-full bg-white text-primary hover:bg-white/90">
                <Link to="/sell/list-your-own">List your home on One Higala Properties →</Link>
              </Button>
            ) : (
              <Button asChild className="mt-6 rounded-full bg-white text-primary hover:bg-white/90">
                <Link to="/auth">
                  <LogIn className="h-4 w-4" />
                  Sign in to get started
                </Link>
              </Button>
            )}
          </div>
          <div className="order-1 aspect-video bg-primary/70 md:order-2 md:aspect-auto" />
        </div>
      </section>

      {/* ── Already a commissioner/agent shortcut ── */}
      {!loading && user && alreadyRegistered && (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="text-muted-foreground">
              You're already registered as a {isCommissioner && isAgent ? "Commissioner and Agent" : isCommissioner ? "Commissioner" : "Agent"}.
            </p>
            <Button asChild className="mt-4">
              <Link to="/listings/new">Post a property listing</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
