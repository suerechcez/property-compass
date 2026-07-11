import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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

// Icons for the two intro cards above the fold. Upload either extension to
// /public — tries .png first, falls back to .jpg, then to the plain lucide
// icon if neither exists.
const CARD_COMMISSIONER_PNG = "/sell-card-commissioner.png";
const CARD_COMMISSIONER_JPG = "/sell-card-commissioner.jpg";
const CARD_VISIBILITY_PNG = "/sell-card-visibility.png";
const CARD_VISIBILITY_JPG = "/sell-card-visibility.jpg";

// Photos for the two option panels below. Upload either extension to
// /public — the <img> tries .jpg first and falls back to .png automatically,
// then to a plain navy panel if neither exists.
const FIND_AGENT_JPG = "/sell-find-agent.jpg";
const FIND_AGENT_PNG = "/sell-find-agent.png";
const LIST_YOURSELF_JPG = "/sell-list-yourself.jpg";
const LIST_YOURSELF_PNG = "/sell-list-yourself.png";

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

          {/* Same card styling as the landing page's Buy/Rent/Sell boxes:
              centered content, bordered white card, soft shadow, and a
              Montserrat Medium heading instead of the serif display font. */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
              <CardIcon png={CARD_COMMISSIONER_PNG} jpg={CARD_COMMISSIONER_JPG} alt="Sell with a commissioner or agent" fallback={Handshake} />
              <h2 className="mt-6 font-montserrat text-xl font-medium text-foreground">
                Sell with a commissioner or agent
              </h2>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Work with a trusted One Higala commissioner or agent who handles pricing,
                marketing, and negotiations for you — from listing to turnover.
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
              <CardIcon png={CARD_VISIBILITY_PNG} jpg={CARD_VISIBILITY_JPG} alt="Maximize your home's visibility" fallback={TrendingUp} />
              <h2 className="mt-6 font-montserrat text-xl font-medium text-foreground">
                Maximize your home's visibility
              </h2>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Reach buyers actively browsing Cagayan de Oro City listings on One Higala
                Properties, whether you list with a pro or list it yourself.
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="mt-10 rounded-full bg-white text-primary hover:bg-white/90">
            <a href="#sell-options">Get started</a>
          </Button>
        </div>
      </section>

      {/* ── Two paths ── */}
      <section id="sell-options" className="mx-auto max-w-6xl space-y-10 px-6 py-16">
        {/* Find your own agent */}
        <div className="grid min-h-[420px] overflow-hidden rounded-2xl bg-primary md:grid-cols-2">
          <PanelImage jpg={FIND_AGENT_JPG} png={FIND_AGENT_PNG} alt="Find your own agent" />
          <div className="flex flex-col justify-center p-10 md:p-14">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
              Find your own <span className="text-gold">agent</span>
            </h2>
            <ul className="mt-6 space-y-4 text-base text-white/90">
              <li className="flex gap-2.5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
                <span>
                  <strong className="text-white">Ready to work with a pro?</strong> Search
                  commissioners and agents by specialties and service areas to find the right match.
                </span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
                <span>
                  <strong className="text-white">Already have someone in mind?</strong> Browse
                  their profile, credentials, and track record before you commit.
                </span>
              </li>
            </ul>
            <Button asChild size="lg" className="mt-8 w-fit rounded-full bg-white text-primary hover:bg-white/90">
              <Link to="/agents">Find agents near you →</Link>
            </Button>
          </div>
        </div>

        {/* Sell your home yourself */}
        <div className="grid min-h-[420px] overflow-hidden rounded-2xl bg-primary md:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-10 md:order-1 md:p-14">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
              Sell your home <span className="text-gold">yourself</span>
            </h2>
            <ul className="mt-6 space-y-4 text-base text-white/90">
              <li className="flex gap-2.5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
                Reach more potential buyers with a For Sale By Owner listing.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
                Manage everything yourself — photos, pricing, and inquiries.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
                No commissioner or agent role required to get listed.
              </li>
            </ul>
            {loading ? null : user ? (
              <Button asChild size="lg" className="mt-8 w-fit rounded-full bg-white text-primary hover:bg-white/90">
                <Link to="/sell/list-your-own">List your home on One Higala Properties →</Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="mt-8 w-fit rounded-full bg-white text-primary hover:bg-white/90">
                <Link to="/auth">
                  <LogIn className="h-4 w-4" />
                  Sign in to get started
                </Link>
              </Button>
            )}
          </div>
          <div className="order-1 md:order-2">
            <PanelImage jpg={LIST_YOURSELF_JPG} png={LIST_YOURSELF_PNG} alt="Sell your home yourself" />
          </div>
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

/**
 * Icon for the two intro cards — shown at its own natural size via
 * object-contain (no circular clipping/cropping), same box treatment as the
 * landing page's Buy/Rent/Sell icons. Falls back to a small lucide icon in a
 * tinted circle only if no image has been uploaded yet.
 */
function CardIcon({
  png,
  jpg,
  alt,
  fallback: Fallback,
}: {
  png: string;
  jpg: string;
  alt: string;
  fallback: typeof Handshake;
}) {
  const [src, setSrc] = useState(png);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Fallback className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="grid h-24 w-24 place-items-center">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={() => {
          if (src === png) setSrc(jpg);
          else setFailed(true);
        }}
      />
    </div>
  );
}

function PanelImage({ jpg, png, alt }: { jpg: string; png: string; alt: string }) {
  const [src, setSrc] = useState(jpg);
  const [hidden, setHidden] = useState(false);

  if (hidden) return <div className="aspect-video bg-primary/70 md:aspect-auto md:h-full" />;

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-video w-full object-cover md:aspect-auto md:h-full"
      onError={() => {
        if (src === jpg) setSrc(png);
        else setHidden(true);
      }}
    />
  );
}
