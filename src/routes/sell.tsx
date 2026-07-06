import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Handshake } from "lucide-react";

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
        <Button asChild size="lg" className="mt-8">
          <Link to="/profile">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
