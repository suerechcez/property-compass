import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const BUY_IMAGE_URL  = "/buy-icon.png";
const RENT_IMAGE_URL = "/rent-icon.png";
const SELL_IMAGE_URL = "/sell-icon.png";

export function ExploreOptions() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">What are you looking for?</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          <Link
            to="/browse"
            search={{ filter: "sale" }}
            className="group flex flex-col bg-card p-8 animate-reveal transition hover:bg-surface"
          >
            <CardIcon image={BUY_IMAGE_URL} alt="Buy a home" />
            <h3 className="mt-6 font-display text-lg font-semibold text-foreground">Buy a home</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Browse condos, land, and resale properties across Cagayan de Oro City with clear pricing so there are no surprises.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Browse listings
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/browse"
            search={{ filter: "rent" }}
            className="group flex flex-col bg-card p-8 animate-reveal transition hover:bg-surface"
            style={{ animationDelay: "80ms" }}
          >
            <CardIcon image={RENT_IMAGE_URL} alt="Rent a home" />
            <h3 className="mt-6 font-display text-lg font-semibold text-foreground">Rent a home</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Explore rent-ready condos and units across the city, from move-in ready studios to family-sized suites.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Find rentals
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/sell"
            className="group flex flex-col bg-card p-8 animate-reveal transition hover:bg-surface"
            style={{ animationDelay: "160ms" }}
          >
            <CardIcon image={SELL_IMAGE_URL} alt="Sell a home" />
            <h3 className="mt-6 font-display text-lg font-semibold text-foreground">Sell a home</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Whatever path you take to sell, our commissioners can help you list your property and close a successful sale.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              List your property
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CardIcon({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface">
      <img src={image} alt={alt} className="h-7 w-7 object-contain" />
    </div>
  );
}
