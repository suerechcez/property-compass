import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut, Settings, Users, ClipboardList, BarChart3,
  LayoutDashboard, Building2, Wallet, Plus, Menu, X, Bell, MessageSquare, Megaphone,
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

function NavLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="group relative py-1 text-sm font-medium tracking-wide text-foreground/80 transition-colors hover:text-foreground">
      {children}
      <span className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100" />
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

  const isDashboard = DASHBOARD_ROUTES.some((r) =>
    routerState.location.pathname.startsWith(r)
  );

  void overlay;

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
      className={`z-40 w-full border-b border-border bg-background/95 backdrop-blur ${
        isDashboard ? "relative" : "sticky top-0"
      }`}
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-10">

        <div className="flex items-center">
          {!isDashboard && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="grid h-10 w-10 place-items-center rounded-full text-foreground transition md:hidden"
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
                </nav>
              </SheetContent>
            </Sheet>
          )}

          {!isDashboard && (
            <nav className="hidden items-center gap-7 md:flex">
              <NavLink to="/browse">Browse</NavLink>
              <NavLink to="/sell">Sell</NavLink>
              <NavLink to="/agents">Find an agent</NavLink>
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
            <div className="hidden items-center sm:flex">
              <BrandTitle light={false} className="items-center text-center" />
            </div>
          </Link>
        )}

        <div className="col-start-3 flex items-center justify-end gap-2">
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
                  className="relative grid h-11 w-11 place-items-center rounded-full text-foreground/80 outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
                  <Avatar className="h-12 w-12 border border-border">
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
    </header>
  );
}
