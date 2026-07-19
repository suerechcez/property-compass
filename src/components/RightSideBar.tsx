import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Bell, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";

const SIDEBAR_RIGHT_ICON_CLASS =
  "flex flex-col items-center gap-1 py-3 px-2 w-full rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer select-none";

type SidebarItem = {
  icon: React.ReactNode;
  label: string;
  to: string;
  authRequired: boolean;
  guestTo?: string;
};

const ITEMS: SidebarItem[] = [
  { icon: <Search className="h-5 w-5" />, label: "Search",    to: "/browse",    authRequired: false },
  { icon: <Bell   className="h-5 w-5" />, label: "Updates",   to: "/updates",   authRequired: true, guestTo: "/updates" },
  { icon: <Heart  className="h-5 w-5" />, label: "Favorites", to: "/favorites", authRequired: true, guestTo: "/favorites" },
];

// Routes where the floating sidebar should never appear
const HIDDEN_ON = ["/dashboard", "/auth"];

export function RightSideBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const path = routerState.location.pathname;

  if (HIDDEN_ON.some((prefix) => path.startsWith(prefix))) return null;

  return (
    <aside
      className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-2xl border border-r-0 border-border bg-card/90 p-1 shadow-soft backdrop-blur lg:flex"
      style={{ width: "3.75rem" }}
    >
      {ITEMS.map((item) => {
        const dest = !item.authRequired || user ? item.to : (item.guestTo ?? item.to);
        return (
          <button
            key={item.label}
            className={SIDEBAR_RIGHT_ICON_CLASS}
            onClick={() => navigate({ to: dest })}
            aria-label={item.label}
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
