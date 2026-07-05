import { Link } from "@tanstack/react-router";
import { Home, KeyRound, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExploreOptionsProps {
  onBuyClick: () => void;
  onRentClick: () => void;
}

export function ExploreOptions({ onBuyClick, onRentClick }: ExploreOptionsProps) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <OptionCard
            iconBg="bg-primary/10"
            iconColor="text-primary"
            icon={<Home className="h-9 w-9" />}
            title="Buy a home"
            description="Browse condos, land, and resale properties across Cagayan de Oro City with clear pricing so there are no surprises."
          >
            <Button variant="outline" className="rounded-full px-6" onClick={onBuyClick}>
              Browse listings
            </Button>
          </OptionCard>

          <OptionCard
            iconBg="bg-gold/20"
            iconColor="text-gold-foreground"
            icon={<KeyRound className="h-9 w-9" />}
            title="Rent a home"
            description="Explore rent-ready condos and units across the city, from move-in ready studios to family-sized suites."
          >
            <Button variant="outline" className="rounded-full px-6" onClick={onRentClick}>
              Find rentals
            </Button>
          </OptionCard>

          <OptionCard
            iconBg="bg-accent/60"
            iconColor="text-accent-foreground"
            icon={<Handshake className="h-9 w-9" />}
            title="Sell a home"
            description="Whatever path you take to sell, our commissioners can help you list your property and close a successful sale."
          >
            <Button variant="outline" className="rounded-full px-6" asChild>
              <Link to="/auth">List your property</Link>
            </Button>
          </OptionCard>
        </div>
      </div>
    </section>
  );
}

function OptionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
      <div className={`grid h-24 w-24 place-items-center rounded-full ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
