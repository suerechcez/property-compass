import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Handshake, LogIn } from "lucide-react";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell your property · One Higala Properties Inc." },
      { name: "description", content: "Sell your property in Cagayan de Oro City with One Higala Properties Inc." },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { user, loading, isCommissioner, isAgent } = useAuth();
  const alreadyRegistered = isCommissioner || isAgent;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
          <Handshake className="h-9 w-9" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">Sell your property</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          This page is a work in progress. Soon you'll be able to get a valuation, request a
          commissioner, and track your sale right from here. In the meantime, our commissioners
          can help you list and sell your property directly.
        </p>

        {loading ? null : user ? (
          <Button asChild size="lg" className="mt-8">
            <Link to={alreadyRegistered ? "/listings/new" : "/apply"}>
              {alreadyRegistered ? "Post a property" : "Get started"}
            </Link>
          </Button>
        ) : (
          <div className="mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <p className="font-display text-lg italic text-foreground/85">
              "Every home sold starts with someone brave enough to take the first step."
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Sign in to apply as a commissioner or agent and start selling with One Higala.
            </p>
            <Button asChild size="lg" className="mt-5">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign in to get started
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
