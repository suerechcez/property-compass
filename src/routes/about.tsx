import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us · One Higala Properties Inc." },
      { name: "description", content: "Learn about One Higala Properties Inc., your trusted partner in finding the perfect property in Cagayan de Oro and nearby areas." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen site-page">
      <Nav />

      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl">
            Your dream property starts with{" "}
            <span className="text-gold">One Higala Properties</span>
          </h1>

          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-sm leading-relaxed text-white/85 md:text-base">
            <p>
              Welcome to One Higala Properties, your trusted partner in finding the perfect
              property in Cagayan de Oro and nearby areas. We specialize in helping individuals,
              families, and investors discover quality real estate opportunities—from condominium
              units and residential lots to investment properties that fit every lifestyle and budget.
            </p>
            <p>
              At One Higala Properties, we believe that owning a property is more than just making
              a purchase—it's building a future. Our team is committed to providing honest advice,
              personalized service, and a smooth buying experience from property inquiry to turnover.
              Whether you're looking for your dream home, a rental investment, or your first property,
              we're here to guide you every step of the way.
            </p>
            <p>
              Driven by integrity, professionalism, and a genuine passion for helping our clients,
              One Higala Properties is dedicated to making your real estate journey simple,
              transparent, and rewarding.
            </p>
            <p className="font-semibold text-white">
              Your dream property starts with One Higala Properties.
            </p>
          </div>

          {!loading && !user && (
            <Button asChild size="lg" className="mt-8 rounded-full bg-white text-primary hover:bg-white/90">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
