import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for everything under /agents.
 * Nav is intentionally NOT rendered here — each child page (agents.index.tsx,
 * agents.$id.tsx) renders its own Nav so we don't get a double header.
 */
export const Route = createFileRoute("/agents")({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
});
