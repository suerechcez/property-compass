import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const BUY_IMAGE_URL  = "/buy-icon.png";
const RENT_IMAGE_URL = "/rent-icon.png";
const SELL_IMAGE_URL = "/sell-icon.png";

export function ExploreOptions() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
        {/* Separate cards with real gaps between them, each with its own
            border, rounded corners, and shadow — replacing the single
            hairline-divided container. */}
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          <OptionCard
            image={BUY_IMAGE_URL}
            alt="Buy a home"
            title="Buy a home"
            description="Browse condos, land, and resale properties across Cagayan de Oro City with clear pricing so there are no surprises."
            delay={0}
          >
            <Button
              variant="outline"
              className="rounded-full border-gold px-6 text-gold transition hover:scale-105 hover:bg-gold hover:text-gold-foreground active:scale-95"
              asChild
            >
              <Link to="/browse" search={{ filter: "sale" }}>Browse listings</Link>
            </Button>
          </OptionCard>

          <OptionCard
            image={RENT_IMAGE_URL}
            alt="Rent a home"
            title="Rent a home"
            description="Explore rent-ready condos and units across the city, from move-in ready studios to family-sized suites."
            delay={80}
          >
            <Button
              variant="outline"
              className="rounded-full border-gold px-6 text-gold transition hover:scale-105 hover:bg-gold hover:text-gold-foreground active:scale-95"
              asChild
            >
              <Link to="/browse" search={{ filter: "rent" }}>Find rentals</Link>
            </Button>
          </OptionCard>

          <OptionCard
            image={SELL_IMAGE_URL}
            alt="Sell a home"
            title="Sell a home"
            description="Whatever path you take to sell, our commissioners can help you list your property and close a successful sale."
            delay={160}
          >
            <Button
              variant="outline"
              className="rounded-full border-gold px-6 text-gold transition hover:scale-105 hover:bg-gold hover:text-gold-foreground active:scale-95"
              asChild
            >
              <Link to="/sell">List your property</Link>
            </Button>
          </OptionCard>
        </div>
      </div>
    </section>
  );
}

function OptionCard({
  image,
  alt,
  title,
  description,
  delay,
  children,
}: {
  image: string;
  alt: string;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    // Cards and icons bumped up a size: padding p-8→p-10, icon boxes
    // h-20/w-20→h-28/w-28 (sm:h-32/w-32), title/description text sizes
    // stepped up to match so the bigger icon doesn't look out of
    // proportion with everything below it.
    <div
      className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-md shadow-black/5 animate-reveal transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon floats up and down gently, same as before */}
      <div className="grid h-28 w-28 place-items-center animate-float sm:h-32 sm:w-32" style={{ animationDelay: `${delay * 0.4}ms` }}>
        <img src={image} alt={alt} className="h-full w-full object-contain" />
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
