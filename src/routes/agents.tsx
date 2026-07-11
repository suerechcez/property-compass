import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";

/**
 * Layout route for everything under /agents. Renders the shared Nav once,
 * then <Outlet/> for whichever child actually matches — either the
 * directory listing (agents.index.tsx, "/agents") or a specific profile
 * (agents.$id.tsx, "/agents/$id"). This file existing alongside
 * agents.$id.tsx makes TanStack Router auto-nest them by convention no
 * matter what — so this MUST render an Outlet, or navigating to a child
 * route just updates the URL with nothing visibly changing.
 */
export const Route = createFileRoute("/agents")({
  component: () => (
    <div className="min-h-screen">
      <Nav />
      <Outlet />
    </div>
  ),
});
