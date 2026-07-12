import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";

/**
 * Layout route for everything under /sell — same pattern as agents.tsx.
 * Renders the shared Nav once, then <Outlet/> for whichever child matches:
 * the main Sell landing page (sell.index.tsx, "/sell") or the FSBO form
 * (sell.list-your-own.tsx, "/sell/list-your-own"). This file existing
 * alongside sell.list-your-own.tsx makes TanStack Router auto-nest them by
 * filename convention no matter what, so this MUST render an Outlet.
 */
export const Route = createFileRoute("/sell")({
  component: () => (
    <div className="min-h-screen">
      <Nav />
      <Outlet />
    </div>
  ),
});
