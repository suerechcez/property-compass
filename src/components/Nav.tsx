import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut, Settings, Users, ClipboardList, BarChart3,
  LayoutDashboard, Building2, Wallet, Plus, Menu, X, Bell, MessageSquare, Megaphone,
  Home, KeyRound, ChevronDown, Rss, Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchUnreadCount, fetchMessageNotifications, type NotificationItem } from "@/lib/messages";
import { fetchActiveAnnouncements, getUnseenCount, markAnnouncementsSeen, announcementsToNotifications } from "@/lib/announcements";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BrandTitle } from "@/components/BrandTitle";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";

const BRAND_ICON_URL = "/brand-icon.png";
const DASHBOARD_ROUTES = ["/dashboard"];

function NavLink({ to, children, overlay }: { to: string; children: string; overlay?: boolean }) {
  return (
    <Link
      to={to}
      className={`group relative py-1 text-base font-semibold tracking-wide transition-colors ${
        overlay ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
      }`}
    >
      {children}
      <span
        className={`pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100 ${
          overlay ? "bg-white" : "bg-primary"
        }`}
      />
    </Link>
  );
}

export function Nav({ overlay = false }: { overlay?: boolean }) {
  const { user, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [iconOk, setIconOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const canManageListings = isCommissioner || isAgent;

  // "Browse" mega-dropdown — hover-triggered, shows Buy/Rent/Updates/
  // Favorites below the full-width header (Updates and Favorites moved
  // here from the floating RightSideBar rail, alongside its own Messages
  // shortcut moving into the topbar next to the bell — see below). A
  // short close delay (via ref'd timeout, not state, so it survives
  // re-renders without re-triggering effects) keeps the panel open while
  // the cursor travels from the trigger down into the panel itself;
  // without it, the small vertical gap between them would register as a
  // mouseleave and the panel would flicker shut.
  const [browseOpen, setBrowseOpen] = useState(false);
  const browseCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function openBrowseMenu() {
    if (browseCloseTimer.current) clearTimeout(browseCloseTimer.current);
    setBrowseOpen(true);
  }
  function closeBrowseMenuSoon() {
    browseCloseTimer.current = setTimeout(() => setBrowseOpen(false), 150);
  }

  const isDashboard = DASHBOARD_ROUTES.some((r) =>
    routerState.location.pathname.startsWith(r)
  );

  // `overlay` (passed only by the homepage hero) makes the bar transparent
  // and floats it over the hero photo — at EVERY breakpoint now, since the
  // homepage hero itself is a single full-bleed photo at every breakpoint
  // (see routes/index.tsx). Icons/links/avatar switch to white for
  // contrast; the bar is `absolute` rather than `sticky`, so like the rest
  // of the hero content it scrolls away with the page instead of staying
  // pinned once you scroll past the photo.
  const isOverlay = overlay && !isDashboard;
  const iconColor = isOverlay ? "text-white" : "text-foreground/80";

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["nav-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    enabled: !!user,
    queryKey: ["nav-unread-messages", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    refetchInterval: 15000,
  });

  const { data: messageNotifications = [], isLoading: notifLoading } = useQuery({
    enabled: !!user && notifOpen,
    queryKey: ["nav-notifications", user?.id],
    queryFn: () => fetchMessageNotifications(user!.id),
    refetchInterval: 15000,
  });

  const { data: announcements = [] } = useQuery({
    enabled: !!user && canManageListings,
    queryKey: ["nav-announcements", user?.id],
    queryFn: fetchActiveAnnouncements,
    refetchInterval: 60000,
  });
  const unseenAnnouncementCount = getUnseenCount(announcements);

  const showAnnouncements = isDashboard && canManageListings;

  const announcementNotifications = announcementsToNotifications(announcements);
  const combinedNotifications: NotificationItem[] = [...announcementNotifications, ...messageNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const bellBadgeCount = unreadCount + announcementNotifications.length;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const initial = (profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header
      // Two modes: normal (every page) is the solid brand-gradient wash,
      // always sticky. Overlay mode (homepage only) removes the
      // background/border entirely and floats the bar via `absolute` over
      // the hero photo instead, at every breakpoint.
      className={
        isOverlay
          ? "absolute inset-x-0 top-0 z-40 w-full bg-transparent"
          : `z-40 w-full border-b border-border bg-gradient-to-r from-primary/22 via-background/80 to-gold/24 backdrop-blur ${
              isDashboard ? "relative" : "sticky top-0"
            }`
      }
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-10">

        <div className="flex items-center">
          {!isDashboard && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className={`grid h-10 w-10 place-items-center rounded-full transition md:hidden ${iconColor}`}
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" hideClose className="w-full max-w-xs p-0">
                <div className="relative flex items-center justify-center border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <img src={BRAND_ICON_URL} alt="One Higala" className="h-8 w-8 object-contain" onError={() => {}} />
                    <span className="text-base font-extrabold tracking-tight text-primary" style={{ fontFamily: "var(--font-montserrat)" }}>ONE HIGALA</span>
                  </div>
                  <SheetClose asChild>
                    <button aria-label="Close menu" className="absolute right-3 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
                  </SheetClose>
                </div>
                <nav className="divide-y divide-border">
                  <SheetClose asChild><Link to="/browse" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">Browse</Link></SheetClose>
                  <SheetClose asChild><Link to="/sell"   className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">Sell</Link></SheetClose>
                  <SheetClose asChild><Link to="/agents" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">Find an agent</Link></SheetClose>
                  <SheetClose asChild><Link to="/updates" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">Updates</Link></SheetClose>
                  <SheetClose asChild><Link to="/favorites" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">Favorites</Link></SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          )}

          {!isDashboard && (
            <nav className="hidden items-center gap-7 md:flex">
              {/* Browse trigger — hover opens the full-width mega-dropdown
                  rendered below, right before </header>. It's a plain span
                  (not NavLink) since it's a hover target rather than a
                  direct link itself; the chevron rotates to signal the
                  open state. */}
              <div
                className="relative"
                onMouseEnter={openBrowseMenu}
                onMouseLeave={closeBrowseMenuSoon}
              >
                <Link
                  to="/browse"
                  className={`group relative flex items-center gap-1 py-1 text-base font-semibold tracking-wide transition-colors ${
                    isOverlay ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  Browse
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${browseOpen ? "rotate-180" : ""}`} />
                  <span
                    className={`pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                      isOverlay ? "bg-white" : "bg-primary"
                    }`}
                  />
                </Link>
              </div>
              <NavLink to="/sell" overlay={isOverlay}>Sell</NavLink>
              <NavLink to="/agents" overlay={isOverlay}>Find an agent</NavLink>
            </nav>
          )}

          {isDashboard && (
            <div className="hidden items-center gap-3 md:flex">
              <div aria-hidden className="h-12 w-12 shrink-0" />
              <Link to="/" className="flex items-center gap-3">
                {iconOk ? (
                  <img src={BRAND_ICON_URL} alt="One Higala Properties Inc." className="h-10 w-10 object-contain" onError={() => setIconOk(false)} />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-display text-lg font-bold text-primary-foreground shadow-sm">H</span>
                )}
                <BrandTitle light={false} className="items-start text-left" />
              </Link>
            </div>
          )}
        </div>

        {!isDashboard && (
          <Link to="/" className="col-start-2 flex items-center gap-3 justify-self-center">
            {iconOk ? (
              <img src={BRAND_ICON_URL} alt="One Higala Properties Inc." className="h-12 w-12 object-contain" onError={() => setIconOk(false)} />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-display text-xl font-bold text-primary-foreground shadow-sm">H</span>
            )}
            {/* Light (white) text lockup while overlay is active, since the
                bar stays transparent over the photo at every breakpoint
                now — dark navy text would have no contrast guarantee. */}
            <div className="hidden items-center md:flex">
              <BrandTitle light={isOverlay} className="items-center text-center" />
            </div>
          </Link>
        )}

        <div className="col-start-3 flex items-center justify-end gap-2">
          {/* Messages — moved here from the floating RightSideBar rail,
              right beside the notification bell. Guests land on /auth,
              same fallback the sidebar used to use for this shortcut. */}
          <Link
            to={user ? "/messages" : "/auth"}
            aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : "Messages"}
            className={`relative grid h-11 w-11 place-items-center rounded-full outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ${iconColor}`}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {showAnnouncements && (
            <DropdownMenu
              open={announceOpen}
              onOpenChange={(open) => {
                setAnnounceOpen(open);
                if (open && announcements.length > 0) markAnnouncementsSeen(announcements);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={unseenAnnouncementCount > 0 ? `${unseenAnnouncementCount} new announcements` : "Announcements"}
                  className="relative grid h-11 w-11 place-items-center rounded-full text-foreground/80 outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Megaphone className="h-5 w-5" />
                  {unseenAnnouncementCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-gold-foreground">
                      {unseenAnnouncementCount > 9 ? "9+" : unseenAnnouncementCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="border-b border-border px-4 py-3">
                  <span className="font-display font-semibold">Announcements</span>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <Megaphone className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No announcements right now.</p>
                    </div>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className="border-b border-border px-4 py-3 last:border-b-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <DropdownMenu
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open && announcementNotifications.length > 0) markAnnouncementsSeen(announcements);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={bellBadgeCount > 0 ? `${bellBadgeCount} unread notifications` : "Notifications"}
                  className={`relative grid h-11 w-11 place-items-center rounded-full outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ${iconColor}`}
                >
                  <Bell className="h-5 w-5" />
                  {bellBadgeCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                      {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-display font-semibold">Notifications</span>
                  {bellBadgeCount > 0 && (
                    <span className="text-xs text-muted-foreground">{bellBadgeCount} unread</span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <p className="p-5 text-center text-sm text-muted-foreground">Loading…</p>
                  ) : combinedNotifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <Bell className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">You're all caught up!</p>
                    </div>
                  ) : (
                    combinedNotifications.map((n) =>
                      n.type === "message" ? (
                        <Link
                          key={n.id}
                          to="/messages"
                          search={{ c: n.href.split("c=")[1] }}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-3 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-accent"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
                            {n.avatarUrl
                              ? <img src={n.avatarUrl} alt="" className="h-full w-full object-cover" />
                              : <MessageSquare className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/20 text-gold-foreground">
                            <Megaphone className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className={`h-12 w-12 border ${isOverlay ? "border-white/70" : "border-border"}`}>
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Profile"} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">{initial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isAdmin && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "admin-users" }} className="cursor-pointer">
                          <Users className="h-4 w-4" />Users & Roles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "admin-requests" }} className="cursor-pointer">
                          <ClipboardList className="h-4 w-4" />C/A Requests
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "admin-tracking" }} className="cursor-pointer">
                          <BarChart3 className="h-4 w-4" />C/A Tracking
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "admin-announcements" }} className="cursor-pointer">
                          <Megaphone className="h-4 w-4" />Announcements
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                {canManageListings && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "overview" }} className="cursor-pointer">
                          <LayoutDashboard className="h-4 w-4" />Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "listings" }} className="cursor-pointer">
                          <Building2 className="h-4 w-4" />My listings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" search={{ tab: "sales" }} className="cursor-pointer">
                          <Wallet className="h-4 w-4" />Sales
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/listings/new" className="cursor-pointer">
                          <Plus className="h-4 w-4" />Post Property
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Settings className="h-4 w-4" />Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/*
        Browse mega-dropdown — full-bleed edge-to-edge panel. Positioned
        `absolute inset-x-0 top-full` against <header> itself (which is
        always a valid containing block for absolutely-positioned
        descendants — `sticky`/`relative` normally, `absolute` in overlay
        mode), so it spans the ENTIRE header width left-to-right regardless
        of how narrow the "Browse" trigger text is — not just the width of
        its own immediate parent. Kept mounted (hidden via
        opacity/pointer-events, not conditionally rendered) so the
        open/close transition animates instead of popping instantly. Four
        destinations (Buy/Rent/Updates/Favorites) — Updates and Favorites
        moved in from the floating RightSideBar rail.

        The 2x2 item grid is deliberately confined to `sm:w-1/2` (roughly
        the left half of this full-bleed panel) rather than stretching
        across the whole thing — it sits over the header's own left
        padding, leaving the right half of the panel open over the
        background image/gradient instead of the grid spanning edge to
        edge. Items themselves have no card chrome (no border, no
        bg-card, no shadow) — just a small icon chip, so they read as
        plain rows sitting transparently on the panel rather than boxed
        buttons.

        Background is fully opaque (was a low-alpha gradient +
        backdrop-blur, which let page content show through underneath —
        including, in overlay mode, the hero photo itself). Tailwind's
        per-stop opacity modifiers (e.g. from-primary/40) are literal
        alpha — even pairing a transparent edge stop with an opaque middle
        stop still lets content bleed through right at the edges — so the
        tint is mixed into fully solid colors via color-mix() in an inline
        style instead of relying on alpha anywhere in the gradient.
        Desktop-only concern — hidden on mobile along with the "Browse"
        trigger link that opens it.
      */}
      {!isDashboard && (
        <div
          onMouseEnter={openBrowseMenu}
          onMouseLeave={closeBrowseMenuSoon}
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in srgb, var(--primary) 12%, var(--background)), var(--background), color-mix(in srgb, var(--gold) 12%, var(--background)))",
          }}
          className={`absolute inset-x-0 top-full z-30 hidden border-b border-border shadow-lg transition-all duration-200 md:block ${
            browseOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
          }`}
        >
          <div className="px-4 py-5 sm:px-10">
            <div className="grid w-full grid-cols-2 gap-x-3 gap-y-1 sm:w-1/2 sm:max-w-md">
              <Link
                to="/browse"
                search={{ filter: "sale", q: "" }}
                onClick={() => setBrowseOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-foreground/5 active:scale-95"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Home className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Buy</span>
                  <span className="block text-xs text-muted-foreground">Condos, hotels, land, and resell.</span>
                </span>
              </Link>
              <Link
                to="/browse"
                search={{ filter: "rent", q: "" }}
                onClick={() => setBrowseOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-foreground/5 active:scale-95"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground transition group-hover:bg-gold group-hover:text-primary-foreground">
                  <KeyRound className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Rent</span>
                  <span className="block text-xs text-muted-foreground">Find a place to rent in CDO.</span>
                </span>
              </Link>
              <Link
                to="/updates"
                onClick={() => setBrowseOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-foreground/5 active:scale-95"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Rss className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Updates</span>
                  <span className="block text-xs text-muted-foreground">New and recently changed listings.</span>
                </span>
              </Link>
              <Link
                to="/favorites"
                onClick={() => setBrowseOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-foreground/5 active:scale-95"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground transition group-hover:bg-gold group-hover:text-primary-foreground">
                  <Heart className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Favorites</span>
                  <span className="block text-xs text-muted-foreground">Properties you've saved.</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
