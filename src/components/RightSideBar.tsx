import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Rss, Heart, MessageSquare, GripHorizontal } from "lucide-react";
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

// Remembers where the user dragged the sidebar to, across reloads
const DRAG_STORAGE_KEY = "one-higala-sidebar-position";

type Position = { x: number; y: number };

export function RightSideBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const path = routerState.location.pathname;

  const asideRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  // Restore a previously-dragged position on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAG_STORAGE_KEY);
      if (saved) setPosition(JSON.parse(saved));
    } catch {
      // ignore malformed/blocked storage
    }
  }, []);

  // Unread message count — refreshed periodically so the badge stays live
  // without needing a websocket just for the sidebar itself.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (HIDDEN_ON.some((prefix) => path.startsWith(prefix))) return null;

  function clampToViewport(x: number, y: number): Position {
    const el = asideRef.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 260;
    const maxX = Math.max(window.innerWidth - w, 0);
    const maxY = Math.max(window.innerHeight - h, 0);
    return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) };
  }

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    const el = asideRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    setDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPosition(clampToViewport(drag.origX + dx, drag.origY + dy));
  }

  function handleDragEnd() {
    dragStateRef.current = null;
    setDragging(false);
    setPosition((p) => {
      if (p) {
        try { localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
      }
      return p;
    });
  }

  /** Double-clicking the handle snaps the sidebar back to its default
   *  right-edge, vertically-centered position. */
  function resetPosition() {
    setPosition(null);
    try { localStorage.removeItem(DRAG_STORAGE_KEY); } catch { /* ignore */ }
  }

  // "Updates" uses Rss (a listings feed), distinct from the notification
  // Bell icon used for messages elsewhere in the app.
  const items: SidebarItem[] = [
    { icon: <Search className="h-5 w-5" />, label: "Search", to: "/browse", authRequired: false },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", to: "/messages", authRequired: true, guestTo: "/auth", badge: unreadCount },
    { icon: <Rss className="h-5 w-5" />, label: "Updates", to: "/updates", authRequired: true, guestTo: "/updates" },
    { icon: <Heart className="h-5 w-5" />, label: "Favorites", to: "/favorites", authRequired: true, guestTo: "/favorites" },
  ];

  // When the user hasn't dragged it yet, keep the original CSS-based
  // positioning (right edge, vertically centered). Once dragged, switch to
  // absolute pixel coordinates that follow the pointer.
  const positionStyle: React.CSSProperties = position
    ? { position: "fixed", left: position.x, top: position.y, right: "auto", transform: "none" }
    : {};

  return (
    <aside
      ref={asideRef}
      className={`fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/90 p-1 shadow-soft backdrop-blur transition-shadow lg:flex ${
        position ? "rounded-2xl" : "rounded-l-2xl border-r-0"
      } ${dragging ? "shadow-xl" : ""}`}
      style={{ width: "3.75rem", ...positionStyle }}
    >
      {/* Drag handle — grabbing anywhere else on the sidebar would fight
          with clicking the nav buttons, so dragging is scoped to this
          dedicated strip at the top. touch-action: none stops the page
          itself from scrolling while dragging on a touchscreen. */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onDoubleClick={resetPosition}
        title="Drag to move · double-click to reset"
        aria-label="Drag to move this menu"
        className={`flex w-full touch-none items-center justify-center rounded-t-xl py-1.5 text-muted-foreground/50 transition hover:text-muted-foreground ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none" }}
      >
        <GripHorizontal className="h-3.5 w-3.5" />
      </div>

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
