import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut, Settings, Users, ClipboardList, BarChart3,
  LayoutDashboard, Building2, Wallet, Plus, Menu, X, Bell, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchUnreadCount, fetchMessageNotifications } from "@/lib/messages";
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
const NAV_LINK_CLASS = "text-foreground hover:text-primary";

// Routes where the marketing nav links (Browse / Sell / Find an Agent) should be hidden
const DASHBOARD_ROUTES = ["/dashboard"];

export function Nav({ overlay = false }: { overlay?: boolean }) {
  const { user, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [iconOk, setIconOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const canManageListings = isCommissioner || isAgent;

  // Hide marketing nav links on the dashboard
  const isDashboard = DASHBOARD_ROUTES.some((r) =>
    routerState.location.pathname.startsWith(r)
  );

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["nav-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  // Badge count — polls every 15s
  const { data: unreadCount = 0 } = useQuery({
    enabled: !!user,
    queryKey: ["nav-unread-messages", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    refetchInterval: 15000,
  });

  // Actual notification items shown in the dropdown. Only fetched once the
  // bell is opened (no point loading full previews on every page load) but
  // also kept warm on the same 15s interval so it doesn't feel stale.
  const { data: notifications = [], isLoading: notifLoading } = useQuery({
    enabled: !!user && notifOpen,
    queryKey: ["nav-notifications", user?.id],
    queryFn: () => fetchMessageNotifications(user!.id),
    refetchInterval: 15000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const initial = (profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur transition-all duration-300">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-10">

        {/* Left — hamburger (mobile) / nav links (desktop) */}
        <div className="flex items-center">
          {/* Only render the hamburger + mobile sheet when not on the dashboard */}
          {!isDashboard && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full text-foreground transition md:hidden">
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
                </nav>
              </SheetContent>
            </Sheet>
          )}

          {/* Desktop nav links — hidden on dashboard */}
          {!isDashboard && (
            <nav className="hidden items-center gap-6 text-base font-medium md:flex">
              <Link to="/browse" className={NAV_LINK_CLASS}>Browse</Link>
              <Link to="/sell"   className={NAV_LINK_CLASS}>Sell</Link>
              <Link to="/agents" className={NAV_LINK_CLASS}>Find an agent</Link>
            </nav>
          )}
        </div>

        {/* Brand — centered normally. On the dashboard, it's icon-only (no
            title text) and sits in a fixed 4rem-wide box aligned to the
            far left, matching the collapsed sidebar rail's width so the
            icon reads as sitting directly above it. */}
        <Link
          to="/"
          className={
            isDashboard
              ? "col-start-1 flex w-16 items-center justify-center justify-self-start"
              : "col-start-2 flex items-center gap-3 justify-self-center"
          }
        >
          {iconOk ? (
            <img src={BRAND_ICON_URL} alt="One Higala Properties Inc." className="h-12 w-12 object-contain" onError={() => setIconOk(false)} />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-display text-xl font-bold text-primary-foreground shadow-sm">H</span>
          )}
          {/* Brand title text — hidden entirely on the dashboard */}
          {!isDashboard && (
            <div className="hidden items-center sm:flex">
              <BrandTitle light={false} className="items-center text-center" />
            </div>
          )}
        </Link>

        {/* Right — notification bell + profile / sign-in */}
        <div className="col-start-3 flex items-center justify-end gap-2">
          {user && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                  className="relative grid h-11 w-11 place-items-center rounded-full text-foreground/80 outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-display font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <p className="p-5 text-center text-sm text-muted-foreground">Loading…</p>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <Bell className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
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
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-12 w-12 border border-border">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Profile"} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">{initial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* ── Admin section ── */}
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
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── Commissioner / Agent section ── */}
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
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
