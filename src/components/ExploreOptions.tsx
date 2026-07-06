import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Illustration images. Upload these three files to /public in the repo
// (buy-icon.png, rent-icon.png, sell-icon.png) and they'll appear here
// automatically. If a file hasn't been uploaded yet, that image will
// simply fail to load.
const BUY_IMAGE_URL =
  "https://raw.githubusercontent.com/suerechcez/property-compass/main/public/buy-icon.png";
const RENT_IMAGE_URL =
  "https://raw.githubusercontent.com/suerechcez/property-compass/main/public/rent-icon.png";
const SELL_IMAGE_URL =
  "https://raw.githubusercontent.com/suerechcez/property-compass/main/public/sell-icon.png";

export function ExploreOptions() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <OptionCard
            image={BUY_IMAGE_URL}
            alt="Buy a home"
            title="Buy a home"
            description="Browse condos, land, and resale properties across Cagayan de Oro City with clear pricing so there are no surprises."
          >
            <Button variant="outline" className="rounded-full px-6" asChild>
              <Link to="/browse" search={{ filter: "sale" }}>Browse listings</Link>
            </Button>
          </OptionCard>

          <OptionCard
            image={RENT_IMAGE_URL}
            alt="Rent a home"
            title="Rent a home"
            description="Explore rent-ready condos and units across the city, from move-in ready studios to family-sized suites."
          >
            <Button variant="outline" className="rounded-full px-6" asChild>
              <Link to="/browse" search={{ filter: "rent" }}>Find rentals</Link>
            </Button>
          </OptionCard>

          <OptionCard
            image={SELL_IMAGE_URL}
            alt="Sell a home"
            title="Sell a home"
            description="Whatever path you take to sell, our commissioners can help you list your property and close a successful sale."
          >
            <Button variant="outline" className="rounded-full px-6" asChild>
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
  children,
}: {
  image: string;
  alt: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
      <div className="grid h-24 w-24 place-items-center">
        <img src={image} alt={alt} className="h-full w-full object-contain" />
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
