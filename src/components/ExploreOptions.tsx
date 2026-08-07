import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const BUY_IMAGE_URL  = "/buy-icon.png";
const RENT_IMAGE_URL = "/rent-icon.png";
const SELL_IMAGE_URL = "/sell-icon.png";

export function ExploreOptions() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">What are you looking for?</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
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
    <div
      className="flex flex-col items-center bg-card p-8 text-center animate-reveal transition hover:bg-surface"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon floats up and down gently, same as before */}
      <div className="grid h-20 w-20 place-items-center animate-float" style={{ animationDelay: `${delay * 0.4}ms` }}>
        <img src={image} alt={alt} className="h-full w-full object-contain" />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
