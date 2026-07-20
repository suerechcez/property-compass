import { useNavigate, useRouterState } from "react-router";
import { useNavigate as useTanNavigate, useRouterState as useTanRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Rss, Heart, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchUnreadCount } from "@/lib/messages";

const SIDEBAR_RIGHT_ICON_CLASS =
  "relative flex flex-col items-center gap-1 py-3 px-2 w-full rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer select-none";

type SidebarItem = {
  icon: React.ReactNode;
  label: string;
  to: string;
  authRequired: boolean;
  guestTo?: string;
  badge?: number;
};

// Routes where the floating sidebar should never appear
const HIDDEN_ON = ["/dashboard", "/auth"];

export function RightSideBar() {
  const { user } = useAuth();
  const navigate = useTanNavigate();
  const routerState = useTanRouterState();
  const path = routerState.location.pathname;

  // Unread message count — refreshed periodically so the badge stays live
  // without needing a websocket just for the sidebar itself.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (HIDDEN_ON.some((prefix) => path.startsWith(prefix))) return null;

  // "Updates" uses Rss (a listings feed), distinct from the notification
  // Bell icon used for messages elsewhere in the app.
  const items: SidebarItem[] = [
    { icon: <Search className="h-5 w-5" />, label: "Search", to: "/browse", authRequired: false },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", to: "/messages", authRequired: true, guestTo: "/auth", badge: unreadCount },
    { icon: <Rss className="h-5 w-5" />, label: "Updates", to: "/updates", authRequired: true, guestTo: "/updates" },
    { icon: <Heart className="h-5 w-5" />, label: "Favorites", to: "/favorites", authRequired: true, guestTo: "/favorites" },
  ];

  return (
    <aside
      className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-2xl border border-r-0 border-border bg-card/90 p-1 shadow-soft backdrop-blur lg:flex"
      style={{ width: "3.75rem" }}
    >
      {items.map((item) => {
        const dest = !item.authRequired || user ? item.to : (item.guestTo ?? item.to);
        return (
          <button
            key={item.label}
            className={SIDEBAR_RIGHT_ICON_CLASS}
            onClick={() => navigate({ to: dest })}
            aria-label={item.label}
          >
            {!!item.badge && item.badge > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
            {item.icon}
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
