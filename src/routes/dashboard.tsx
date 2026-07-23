import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { typeLabel, formatPrice } from "@/lib/property-types";
import { markPropertySold } from "@/lib/sales";
import { predictSales } from "@/lib/predictions.functions";
import {
  fetchAllAnnouncements, createAnnouncement, setAnnouncementActive, deleteAnnouncement,
} from "@/lib/announcements";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import {
  LayoutDashboard, Building2, Wallet, Sparkles,
  Users, ClipboardList, BarChart3, CheckCircle2, XCircle,
  Plus, X, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, Menu, Megaphone, Trash2, type LucideIcon,
} from "lucide-react";

type AdminTab = "admin-users" | "admin-requests" | "admin-tracking" | "admin-listings" | "admin-announcements";
type ScrollSection = "overview" | "listings" | "sales" | "forecast";
type ActiveView = ScrollSection | AdminTab;

const ADMIN_TABS: AdminTab[] = ["admin-users", "admin-requests", "admin-tracking", "admin-listings", "admin-announcements"];
const SCROLL_SECTIONS: ScrollSection[] = ["overview", "listings", "sales", "forecast"];
const ALL_TABS: ActiveView[] = [...SCROLL_SECTIONS, ...ADMIN_TABS];

// Height of the sidebar's own top "logo row". This is set to 80px to match
// the Nav header's ACTUAL rendered height: py-4 (16px top + 16px bottom =
// 32px) plus its tallest inline element, the 48px avatar/bell row (h-12) —
// 32 + 48 = 80px. The two rows need to be pixel-identical or the sidebar's
// logo box visibly reads as a different size than the header strip beside
// it, which is what was happening at the previous (73px) guess.
const LOGO_ROW_PX = 80;
const SIDEBAR_COLLAPSED_PX = 64;  // w-16
const SIDEBAR_EXPANDED_PX = 224;  // w-56
const TOGGLE_BUTTON_PX = 28;      // h-7 w-7
const BRAND_ICON_URL = "/brand-icon.png";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (ALL_TABS.includes(search.tab as ActiveView) ? search.tab : "overview") as ActiveView,
  }),
  head: () => ({ meta: [{ title: "Dashboard · One Higala Properties Inc." }] }),
  component: Dashboard,
});

const TAB_ICONS: Record<ActiveView, LucideIcon> = {
  overview:              LayoutDashboard,
  listings:              Building2,
  sales:                 Wallet,
  forecast:              Sparkles,
  "admin-users":         Users,
  "admin-requests":      ClipboardList,
  "admin-tracking":      BarChart3,
  "admin-listings":      CheckCircle2,
  "admin-announcements": Megaphone,
};

const TAB_LABELS: Record<ActiveView, string> = {
  overview:              "Overview",
  listings:              "My listings",
  sales:                 "Sales",
  forecast:              "AI forecast",
  "admin-users":         "Users & Roles",
  "admin-requests":      "C/A Requests",
  "admin-tracking":      "C/A Tracking",
  "admin-listings":      "Listing Queue",
  "admin-announcements": "Announcements",
};

const GREETINGS = ["Hello", "Welcome back", "Kumusta", "Maayong adlaw", "Good to see you", "Hey there"];
function pickGreeting(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GREETINGS[(h + Math.floor(Date.now() / (1000 * 60 * 60 * 12))) % GREETINGS.length];
}
function friendlyName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  const full = (meta.full_name as string) || (meta.name as string) || "";
  if (full) return full.split(" ")[0];
  return user.email?.split("@")[0] ?? "friend";
}
function cssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function formatYAxis(v: number): string {
  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (v >= 1_000_000)     return `₱${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000)         return `₱${(v / 1_000).toFixed(0)}k`;
  return `₱${v}`;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-800",
  draft:     "bg-gray-100 text-gray-600",
  sold:      "bg-blue-100 text-blue-800",
  rented:    "bg-purple-100 text-purple-800",
};
const STATUS_LABEL: Record<string, string> = {
  pending:   "⏳ Pending review",
  rejected:  "❌ Rejected",
  draft:     "Draft",
  sold:      "Sold",
  rented:    "Rented",
  published: "Published",
};

function BigTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <table className="w-full text-base">
        <thead className="bg-surface text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function DashTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function SectionCard({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Left sidebar ───────────────────────────────────────────────────────────────
// The brand logo now lives INSIDE this sidebar (its own top row) rather
// than in the shared Nav header. To make that work without any gap or
// overlap, the rail spans the FULL viewport height starting at the very
// top (top: 0), and sits at a higher z-index than the header — so it
// paints directly over the header's left-hand corner, and that corner
// never needs to render anything of its own (Nav.tsx already skips
// rendering its brand block on the dashboard route for this exact reason).
// Everywhere else stays a true fixed rail: flush to the left edge, pinned
// in place through the whole page scroll.

function DashSidebar({
  canManageListings, isAdmin, activeSection, onAdminTab, adminTab, onExitAdmin, expanded, onToggleExpanded,
}: {
  canManageListings: boolean;
  isAdmin: boolean;
  activeSection: ScrollSection;
  onAdminTab: (t: AdminTab) => void;
  adminTab: AdminTab | null;
  onExitAdmin: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [iconOk, setIconOk] = useState(true);

  function scrollTo(id: ScrollSection) {
    setMobileOpen(false);
    if (adminTab) {
      onExitAdmin();
      setTimeout(() => {
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleItemClick(id: ActiveView) {
    if (ADMIN_TABS.includes(id as AdminTab)) {
      onAdminTab(id as AdminTab);
      setMobileOpen(false);
    } else {
      scrollTo(id as ScrollSection);
    }
  }

  const mainItems: { id: ScrollSection; show: boolean }[] = [
    { id: "overview", show: true },
    { id: "listings", show: canManageListings },
    { id: "sales",    show: canManageListings },
    { id: "forecast", show: canManageListings },
  ];

  const currentLabel = adminTab ? TAB_LABELS[adminTab] : TAB_LABELS[activeSection];

  /** A single nav icon button. `itemExpanded` controls icon-only (rail) vs icon+label (mobile / expanded rail). */
  function NavItemBtn({ id, isActive, expanded: itemExpanded }: { id: ActiveView; isActive: boolean; expanded: boolean }) {
    const Icon = TAB_ICONS[id];
    return (
      <button
        onClick={() => handleItemClick(id)}
        title={TAB_LABELS[id]}
        aria-label={TAB_LABELS[id]}
        className={`flex shrink-0 items-center gap-3 rounded-xl transition-all ${
          itemExpanded ? "w-full justify-start px-3 py-2.5 text-sm font-medium" : "h-10 w-10 justify-center"
        } ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {itemExpanded && <span>{TAB_LABELS[id]}</span>}
      </button>
    );
  }

  // Mobile popover always shows the labeled version — collapsing to icons
  // only makes sense on the desktop rail where there's a hover tooltip.
  const mobileContent = (
    <div className="flex flex-col gap-1 p-3">
      {mainItems.filter((t) => t.show).map((t) => (
        <NavItemBtn key={t.id} id={t.id} isActive={!adminTab && activeSection === t.id} expanded />
      ))}
      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
          {ADMIN_TABS.map((t) => (
            <NavItemBtn key={t} id={t} isActive={adminTab === t} expanded />
          ))}
        </>
      )}
    </div>
  );

  const desktopContent = (
    <div className={`flex flex-col gap-1.5 ${expanded ? "w-full items-stretch p-3" : "items-center p-2"}`}>
      {mainItems.filter((t) => t.show).map((t) => (
        <NavItemBtn key={t.id} id={t.id} isActive={!adminTab && activeSection === t.id} expanded={expanded} />
      ))}
      {isAdmin && (
        <>
          <div className={`my-2 border-t border-border ${expanded ? "" : "w-8"}`} />
          {expanded && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
          )}
          {ADMIN_TABS.map((t) => (
            <NavItemBtn key={t} id={t} isActive={adminTab === t} expanded={expanded} />
          ))}
        </>
      )}
    </div>
  );

  // Where the rail's current right edge sits, in px from the viewport's
  // left edge — used to place the standalone collapse-toggle button below.
  const railWidthPx = expanded ? SIDEBAR_EXPANDED_PX : SIDEBAR_COLLAPSED_PX;

  return (
    <>
      {/* Mobile trigger — unchanged behavior, just a labeled dropdown, laid
          out inline within the page (not fixed) since only the desktop
          rail below needs to attach to the viewport edge. */}
      <button
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium lg:hidden"
        onClick={() => setMobileOpen((o) => !o)}
      >
        <Menu className="h-4 w-4" />{currentLabel}
      </button>
      {mobileOpen && (
        <div className="rounded-2xl border border-border bg-card shadow-lg lg:hidden">{mobileContent}</div>
      )}

      {/* Desktop — fixed to the true left edge of the browser window,
          spanning the ENTIRE viewport height including the row where the
          header normally sits. z-50 keeps it painted above the header
          (z-40), so this rail — not the header — owns that top-left
          corner and its own logo. */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen flex-col overflow-y-auto border-r border-border bg-card lg:flex ${expanded ? "w-56" : "w-16"} transition-[width] duration-200`}
      >
        {/* Logo row — height matches the header's own height so this row
            lines up with it for the rest of the page. This is the ONLY
            place the brand mark renders on the dashboard. */}
        <Link
          to="/"
          className="flex shrink-0 items-center justify-center border-b border-border"
          style={{ height: LOGO_ROW_PX }}
        >
          {iconOk ? (
            <img
              src={BRAND_ICON_URL}
              alt="One Higala Properties Inc."
              className="h-9 w-9 object-contain"
              onError={() => setIconOk(false)}
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-display text-sm font-bold text-primary-foreground shadow-sm">H</span>
          )}
        </Link>

        <div className="flex flex-col items-center gap-1 py-3">
          {desktopContent}
        </div>
      </aside>

      {/* Collapse toggle — rendered as an entirely separate fixed element,
          NOT a child of the aside above. This matters: the aside has its
          own background, border, and overflow-y-auto, any of which could
          clip or paint over a button nested inside it. As a sibling, this
          button always renders on top, fully visible, regardless of the
          rail's scroll position or background. Its left offset is
          recomputed from the same width constants the rail itself uses,
          so it stays pinned exactly on the rail's right-hand border in
          both collapsed and expanded states. Its top offset sits just
          below the logo row. z-[60] keeps it above the (z-50) rail. */}
      <button
        onClick={onToggleExpanded}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="fixed z-[60] hidden h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:bg-accent hover:text-foreground lg:grid"
        style={{
          left: railWidthPx - TOGGLE_BUTTON_PX / 2,
          top: LOGO_ROW_PX + 16,
        }}
      >
        {expanded ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

// ── Dashboard shell ────────────────────────────────────────────────────────────

function Dashboard() {
  const { user, loading, isDeveloper, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { tab: urlTab } = Route.useSearch();
  const elevated = isAdmin || isDeveloper;
  const canManageListings = isCommissioner || isAgent;

  const [adminTab, setAdminTab] = useState<AdminTab | null>(
    ADMIN_TABS.includes(urlTab as AdminTab) ? (urlTab as AdminTab) : null
  );
  const [activeSection, setActiveSection] = useState<ScrollSection>("overview");
  // Lifted up from DashSidebar so the main content column can reserve
  // matching left padding for whichever width the fixed rail currently is.
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  // Reacts to `tab` changing in the URL — this covers BOTH cases: (1)
  // clicking "My listings"/"Sales" in the profile dropdown while ALREADY
  // on /dashboard (TanStack Router doesn't remount the component for a
  // search-param-only navigation, so the useState initializer above only
  // ever runs once and would otherwise silently ignore this), and (2)
  // navigating to /dashboard?tab=... fresh from an entirely different page
  // (Browse, the homepage, etc.) or the very first load.
  //
  // `loading` is deliberately included in the dependency array for case
  // (2): while auth is still resolving, the component renders nothing but
  // a "Loading…" placeholder (see the early return below) — none of the
  // <section id="section-...."> elements exist in the DOM yet, so an
  // attempted scrollIntoView at that point silently finds nothing and
  // does nothing. Once `loading` flips to false and the real page (with
  // its sections) mounts, this effect re-runs with the same `urlTab` and
  // correctly scrolls — without this, arriving at /dashboard?tab=sales
  // from outside the dashboard while logged out (or on a slow connection)
  // would always land on Overview instead.
  useEffect(() => {
    if (loading || !user) return;

    if (ADMIN_TABS.includes(urlTab as AdminTab)) {
      setAdminTab(urlTab as AdminTab);
      return;
    }
    setAdminTab(null);
    const section: ScrollSection = SCROLL_SECTIONS.includes(urlTab as ScrollSection)
      ? (urlTab as ScrollSection)
      : "overview";
    setActiveSection(section);
    if (section === "overview") return; // already at the top — nothing to scroll to

    // Retries at a few staggered delays rather than a single attempt.
    // Clicking a <Link> inside the profile dropdown (a Radix DropdownMenu)
    // fires navigation while the menu is still mid-close-transition,
    // which can leave the page briefly scroll-locked (overflow: hidden on
    // <html>/<body>) for that exit animation — a scrollIntoView call that
    // lands inside that window silently does nothing, with no later retry
    // to correct it. Repeating the call covers that gap without needing
    // to know its exact duration up front.
    const timers = [50, 250, 600].map((delay) =>
      setTimeout(() => {
        document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [urlTab, loading, user]);

  useEffect(() => {
    if (adminTab) return;
    const observers: IntersectionObserver[] = [];
    SCROLL_SECTIONS.forEach((id) => {
      const el = document.getElementById(`section-${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [adminTab]);

  if (loading || !user) {
    return <div className="site-page"><Nav /><div className="mx-auto max-w-screen-2xl px-8 py-10 text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen site-page">
      <Nav />

      {/* Fixed left-edge rail — rendered as a sibling of the centered
          content below, not nested inside it, so it's flush against the
          true viewport edge instead of the max-width container's edge. */}
      <DashSidebar
        canManageListings={canManageListings}
        isAdmin={isAdmin}
        activeSection={activeSection}
        adminTab={adminTab}
        onAdminTab={(t) => setAdminTab(t)}
        onExitAdmin={() => setAdminTab(null)}
        expanded={sidebarExpanded}
        onToggleExpanded={() => setSidebarExpanded((e) => !e)}
      />

      {/* Reserves space for the fixed rail on large screens so the centered
          content never sits underneath it. */}
      <div className={`transition-[padding] duration-200 ${sidebarExpanded ? "lg:pl-56" : "lg:pl-16"}`}>
        <div className="mx-auto max-w-screen-2xl px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold">{pickGreeting(user.id)}, {friendlyName(user)} 👋</h1>
              <p className="mt-1 text-muted-foreground">Here's what's happening with your properties today.</p>
            </div>
            {canManageListings && (
              <Button asChild><Link to="/listings/new"><Plus className="h-4 w-4" />Post Property</Link></Button>
            )}
          </div>

          {/* Mobile-only nav trigger — the fixed rail above is desktop-only (lg:flex) */}
          <div className="mt-8 lg:hidden">
            <DashSidebar
              canManageListings={canManageListings}
              isAdmin={isAdmin}
              activeSection={activeSection}
              adminTab={adminTab}
              onAdminTab={(t) => setAdminTab(t)}
              onExitAdmin={() => setAdminTab(null)}
              expanded={sidebarExpanded}
              onToggleExpanded={() => setSidebarExpanded((e) => !e)}
            />
          </div>

          {/* mt-10 so the Overview heading starts a little further down,
              giving the sidebar's first nav item (which sits below the
              logo row + toggle button) room to line up comfortably
              instead of feeling cramped right under the header. */}
          <div className="mt-10 min-w-0">
            {adminTab ? (
              <div className="space-y-6">
                <button
                  onClick={() => setAdminTab(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to dashboard
                </button>
                {adminTab === "admin-users"         && <UsersRoles />}
                {adminTab === "admin-requests"      && <CommissionerRequests />}
                {adminTab === "admin-tracking"      && <CommissionerTracking />}
                {adminTab === "admin-listings"      && <ListingQueue />}
                {adminTab === "admin-announcements" && <AnnouncementsAdmin userId={user.id} />}
              </div>
            ) : (
              <div className="space-y-16">
                <section id="section-overview">
                  <Overview userId={user.id} isCommissioner={canManageListings} isDeveloper={elevated} />
                </section>

                {canManageListings && (
                  <>
                    <section id="section-listings">
                      <div className="mb-6 flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-2xl font-semibold">My listings</h2>
                      </div>
                      <Listings userId={user.id} isDeveloper={elevated} />
                    </section>

                    <section id="section-sales">
                      <div className="mb-6 flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-2xl font-semibold">Sales</h2>
                      </div>
                      <Sales userId={user.id} isDeveloper={elevated} />
                    </section>

                    <section id="section-forecast">
                      <div className="mb-6 flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-2xl font-semibold">AI forecast</h2>
                      </div>
                      <Forecast />
                    </section>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function Overview({ userId, isCommissioner, isDeveloper }: { userId: string; isCommissioner: boolean; isDeveloper: boolean }) {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", userId, isDeveloper],
    queryFn: async () => {
      const propsQ = isDeveloper
        ? supabase.from("properties").select("id,status", { count: "exact" })
        : supabase.from("properties").select("id,status", { count: "exact" }).eq("commissioner_id", userId);
      const salesQ = isDeveloper
        ? supabase.from("sales").select("amount,commission")
        : supabase.from("sales").select("amount,commission").eq("commissioner_id", userId);
      const [{ data: props, count: propsCount }, { data: sales }] = await Promise.all([propsQ, salesQ]);
      const totalSales = (sales ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return {
        propsCount: propsCount ?? 0,
        published: (props ?? []).filter((p) => p.status === "published").length,
        salesCount: (sales ?? []).length,
        totalSales,
      };
    },
  });

  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["overview-listings", userId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (!isDeveloper) q = q.eq("commissioner_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: isCommissioner,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl font-semibold">Overview</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={isDeveloper ? "All listings" : "Your listings"} value={String(stats?.propsCount ?? "—")} />
        <Stat label="Published" value={String(stats?.published ?? "—")} />
        <Stat label={isDeveloper ? "All sales" : "Your sales"} value={String(stats?.salesCount ?? "—")} />
        <Stat label="Total volume" value={stats ? formatPrice(stats.totalSales) : "—"} />
      </div>

      {isCommissioner && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{isDeveloper ? "All listings" : "Your listings"}</h3>
            <Button variant="outline" size="sm" asChild>
              <Link to="/browse">Browse all listings →</Link>
            </Button>
          </div>
          {listingsLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : myListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">No listings yet.</p>
              <Button asChild className="mt-4"><Link to="/listings/new">Post your first property</Link></Button>
            </div>
          ) : (
            <BigTable
              head={
                <tr>
                  <th className="px-6 py-5">Property</th>
                  <th className="px-6 py-5">Type</th>
                  <th className="px-6 py-5 whitespace-nowrap">Status</th>
                  <th className="px-6 py-5">Price</th>
                  <th className="px-6 py-5">Location</th>
                </tr>
              }
            >
              {myListings.map((p) => (
                <tr key={p.id} className="h-28 border-t border-border">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.title} className="absolute inset-0 h-full w-full object-cover object-center" />
                          : <div className="absolute inset-0 grid place-items-center font-display text-base text-muted-foreground">H</div>}
                      </div>
                      <div className="min-w-0">
                        <Link to="/properties/$id" params={{ id: p.id }} className="block truncate font-semibold hover:text-primary">{p.title}</Link>
                        <p className="truncate text-sm text-muted-foreground">{p.description || "No description yet."}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">{typeLabel(p.property_type)}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-semibold whitespace-nowrap">
                    {formatPrice(p.price)}
                    {p.for_rent && <span className="text-sm font-normal text-muted-foreground"> /mo</span>}
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{p.location ?? "TBD"}</td>
                </tr>
              ))}
            </BigTable>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-28 flex-col justify-between rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-semibold leading-none">{value}</p>
    </div>
  );
}

// ── Status dropdown ───────────────────────────────────────────────────────────

type StatusOption = { label: string; value: string; className: string };
const LISTING_STATUS_OPTIONS: StatusOption[] = [
  { label: "Draft",  value: "draft",  className: "text-gray-700 hover:bg-gray-50" },
  { label: "Rented", value: "rented", className: "text-purple-700 hover:bg-purple-50" },
  { label: "Sold",   value: "sold",   className: "text-blue-700 hover:bg-blue-50" },
];
const NO_DROPDOWN_STATUSES = new Set(["sold", "pending", "rejected"]);

function StatusDropdown({ property, onSelect, loading }: {
  property: { id: string; status: string; for_rent: boolean; title: string };
  onSelect: (value: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (NO_DROPDOWN_STATUSES.has(property.status)) return null;
  const options = LISTING_STATUS_OPTIONS.filter((o) => {
    if (o.value === property.status) return false;
    if (o.value === "rented" && !property.for_rent) return false;
    return true;
  });
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  if (options.length === 0) return null;
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setOpen((o) => !o)} className="gap-1" title="Update status">
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[120px] rounded-xl border border-border bg-white shadow-lg">
          {options.map((o) => (
            <button key={o.value} className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition ${o.className}`} onClick={() => { setOpen(false); onSelect(o.value); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Listings ──────────────────────────────────────────────────────────────────

function Listings({ userId, isDeveloper }: { userId: string; isDeveloper: boolean }) {
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["my-listings", userId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (!isDeveloper) q = q.eq("commissioner_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("properties").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Listing deleted"); qc.invalidateQueries({ queryKey: ["my-listings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  async function handleStatusChange(
    p: { id: string; commissioner_id: string; price: number | string; status: string; for_rent: boolean; title: string },
    newStatus: string,
  ) {
    const confirmMsg =
      newStatus === "sold"   ? `Mark "${p.title}" as sold? This will log it under Sales.` :
      newStatus === "rented" ? `Mark "${p.title}" as rented? It will remain visible in Browse.` :
      `Move "${p.title}" back to Draft?`;
    if (!confirm(confirmMsg)) return;
    setLoadingId(p.id);
    try {
      if (newStatus === "sold") {
        await markPropertySold(p.id, p.commissioner_id, Number(p.price));
        toast.success("Marked as sold — logged under Sales.");
      } else {
        const { error } = await supabase.from("properties").update({ status: newStatus }).eq("id", p.id);
        if (error) throw error;
        toast.success(newStatus === "rented" ? "Marked as rented." : "Moved to Draft.");
      }
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["overview-listings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setLoadingId(null);
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (properties.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground">No listings yet.</p>
      <Button asChild className="mt-4"><Link to="/listings/new">Post your first property</Link></Button>
    </div>
  );

  return (
    <BigTable
      head={
        <tr>
          <th className="px-6 py-5">Title</th>
          <th className="px-6 py-5">Type</th>
          <th className="px-6 py-5 whitespace-nowrap">Status</th>
          <th className="px-6 py-5">Price</th>
          <th />
        </tr>
      }
    >
      {properties.map((p) => (
        <tr key={p.id} className="h-28 border-t border-border">
          <td className="px-6 py-5">
            <Link to="/properties/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.title}</Link>
            <div className="mt-0.5 text-sm text-muted-foreground">{p.location ?? "—"}</div>
          </td>
          <td className="px-6 py-5">{typeLabel(p.property_type)}</td>
          <td className="px-6 py-5 whitespace-nowrap">
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABEL[p.status] ?? p.status}
            </span>
          </td>
          <td className="px-6 py-5 font-semibold">{formatPrice(p.price)}</td>
          <td className="px-6 py-5 text-right whitespace-nowrap overflow-visible">
            <div className="flex items-center justify-end gap-2">
              <StatusDropdown property={p} onSelect={(val) => handleStatusChange(p, val)} loading={loadingId === p.id} />
              <Button size="sm" variant="outline" asChild>
                <Link to="/listings/$id/edit" params={{ id: p.id }}>Edit</Link>
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this listing?")) del.mutate(p.id); }}>
                Delete
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </BigTable>
  );
}

// ── Admin: Listing Approval Queue ─────────────────────────────────────────────

function ListingQueue() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["admin-listing-queue", filter],
    queryFn: async () => {
      let q = supabase
        .from("properties")
        .select("id, title, location, price, status, property_type, images, created_at, commissioner_id, for_rent")
        .order("created_at", { ascending: false });
      if (filter === "pending") q = q.eq("status", "pending");
      else q = q.in("status", ["pending", "published", "rejected"]);
      const { data: props, error: propErr } = await q;
      if (propErr) throw propErr;
      if (!props || props.length === 0) return [];
      const commissionerIds = [...new Set(props.map((p) => p.commissioner_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", commissionerIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return props.map((p) => ({ ...p, agentName: profileMap.get(p.commissioner_id) ?? "—" }));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) => {
      const newStatus = action === "approve" ? "published" : "rejected";
      const update: Record<string, unknown> = { status: newStatus };
      if (action === "reject" && note) update.rejection_note = note;
      const { error } = await supabase.from("properties").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.action === "approve" ? "Listing approved and published!" : "Listing rejected.");
      qc.invalidateQueries({ queryKey: ["admin-listing-queue"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      setOpenId(null); setRejectNote("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const pendingCount = listings.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Listing Approval Queue"
        subtitle="Review listings submitted by commissioners and agents before they go live."
        action={
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">{pendingCount} pending</span>
            )}
            <div className="flex gap-1 rounded-full border border-border bg-surface p-0.5 text-xs font-medium">
              {(["pending", "all"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 capitalize transition ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "pending" ? "Pending only" : "All listings"}
                </button>
              ))}
            </div>
          </div>
        }
      />
      {isLoading ? <p className="text-muted-foreground">Loading…</p>
      : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
          <p className="mt-3 font-medium">All clear — no {filter === "pending" ? "pending" : ""} listings.</p>
        </div>
      ) : (
        <BigTable
          head={
            <tr>
              <th className="px-6 py-5">Listing</th>
              <th className="px-6 py-5">Agent</th>
              <th className="px-6 py-5">Type</th>
              <th className="px-6 py-5">Price</th>
              {/* whitespace-nowrap on both the header and the cell prevents "Pending Review" from wrapping */}
              <th className="px-6 py-5 whitespace-nowrap">Status</th>
              <th className="px-6 py-5 whitespace-nowrap">Submitted</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          }
        >
          {listings.map((p) => {
            const isOpen = openId === p.id;
            return (
              <>
                <tr key={p.id} className="h-28 border-t border-border">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="absolute inset-0 h-full w-full object-cover object-center" /> : <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">—</div>}
                      </div>
                      <div>
                        <Link to="/properties/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.title}</Link>
                        <div className="mt-0.5 text-sm text-muted-foreground">{p.location ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{p.agentName}</td>
                  <td className="px-6 py-5">{typeLabel(p.property_type)}</td>
                  <td className="px-6 py-5 font-semibold">{formatPrice(p.price)}</td>
                  {/* whitespace-nowrap keeps the badge on one line */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    {p.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => decide.mutate({ id: p.id, action: "approve" })} className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="ml-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => { setOpenId(isOpen ? null : p.id); setRejectNote(""); }}>
                          <XCircle className="mr-1 h-3.5 w-3.5" />{isOpen ? "Cancel" : "Reject"}
                        </Button>
                      </>
                    )}
                    {p.status !== "pending" && <Button size="sm" variant="outline" asChild><Link to="/listings/$id/edit" params={{ id: p.id }}>Edit</Link></Button>}
                  </td>
                </tr>
                {isOpen && p.status === "pending" && (
                  <tr key={`${p.id}-reject`} className="border-t border-border bg-red-50/50">
                    <td colSpan={7} className="px-6 py-5">
                      <p className="mb-2 text-sm font-medium text-destructive">Rejection note (optional):</p>
                      <div className="flex gap-2">
                        <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. Missing photos, inaccurate price…" className="flex-1" />
                        <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: p.id, action: "reject", note: rejectNote })}>Confirm rejection</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </BigTable>
      )}
    </div>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────────

type GroupBy = "day" | "month";

function Sales({ userId, isDeveloper }: { userId: string; isDeveloper: boolean }) {
  const qc = useQueryClient();
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", userId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("sales").select("*, properties(title)").order("sale_date", { ascending: false });
      if (!isDeveloper) q = q.eq("commissioner_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: myProps = [] } = useQuery({
    queryKey: ["my-listings-for-sale", userId],
    queryFn: async () => { const { data } = await supabase.from("properties").select("id,title").eq("commissioner_id", userId); return data ?? []; },
  });

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [amount, setAmount]         = useState("");
  const [commission, setCommission] = useState("");
  const [buyerName, setBuyerName]   = useState("");
  const [saleDate, setSaleDate]     = useState(new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy]       = useState<GroupBy>("month");

  function resetForm() { setEditingId(null); setPropertyId(""); setAmount(""); setCommission(""); setBuyerName(""); setSaleDate(new Date().toISOString().slice(0, 10)); }
  function startEdit(s: { id: string; property_id: string | null; amount: number | string; commission: number | string; buyer_name: string | null; sale_date: string }) {
    setEditingId(s.id); setPropertyId(s.property_id ?? ""); setAmount(String(s.amount)); setCommission(String(s.commission)); setBuyerName(s.buyer_name ?? ""); setSaleDate(s.sale_date.slice(0, 10));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { property_id: propertyId || null, amount: Number(amount), commission: Number(commission) || 0, buyer_name: buyerName || null, sale_date: saleDate };
      if (editingId) { const { error } = await supabase.from("sales").update(payload).eq("id", editingId); if (error) throw error; }
      else           { const { error } = await supabase.from("sales").insert({ ...payload, commissioner_id: userId }); if (error) throw error; }
    },
    onSuccess: () => { toast.success(editingId ? "Sale updated" : "Sale logged"); resetForm(); qc.invalidateQueries({ queryKey: ["sales"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sales").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Sale deleted"); qc.invalidateQueries({ queryKey: ["sales"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const chartData = useMemo(() => {
    const bucket = new Map<string, number>();
    [...sales].reverse().forEach((s) => {
      const key = groupBy === "day" ? s.sale_date.slice(0, 10) : s.sale_date.slice(0, 7);
      bucket.set(key, (bucket.get(key) ?? 0) + Number(s.amount));
    });
    return [...bucket.entries()].map(([label, total]) => ({ label, total }));
  }, [sales, groupBy]);

  const formatXTick = (val: string) => {
    if (groupBy === "month") { const [y, m] = val.split("-"); return format(new Date(Number(y), Number(m) - 1, 1), "MMM yy"); }
    return format(new Date(val), "MMM d");
  };
  const chartColors = useMemo(() => ({
    border: cssVar("--border"), mutedFg: cssVar("--muted-foreground"),
    primary: cssVar("--primary"), card: cssVar("--card"), cardFg: cssVar("--card-foreground"),
  }), []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{editingId ? "Edit sale" : "Log a new sale"}</h3>
          {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel edit</Button>}
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="md:col-span-2">
            <Label>Property</Label>
            <select className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">— Select —</option>
              {myProps.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div><Label>Amount</Label><Input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Commission</Label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div className="md:col-span-4"><Label>Buyer (optional)</Label><Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
          <div className="flex items-end"><Button className="w-full" type="submit">{editingId ? "Save changes" : "Add sale"}</Button></div>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold">Sales over time</h3>
            <div className="flex gap-1 rounded-full border border-border bg-surface p-0.5 text-xs font-medium">
              {(["day", "month"] as GroupBy[]).map((g) => (
                <button key={g} onClick={() => setGroupBy(g)} className={`rounded-full px-3 py-1 capitalize transition ${groupBy === g ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {g === "day" ? "Day by day" : "Month by month"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
                <XAxis dataKey="label" tickFormatter={formatXTick} stroke={chartColors.mutedFg} tick={{ fill: chartColors.mutedFg, fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke={chartColors.mutedFg} tick={{ fill: chartColors.mutedFg, fontSize: 11 }} tickFormatter={formatYAxis} width={60} />
                <Tooltip formatter={(v: number) => [formatPrice(v), "Volume"]} labelFormatter={formatXTick} contentStyle={{ background: chartColors.card, border: `1px solid ${chartColors.border}`, borderRadius: 8, color: chartColors.cardFg }} />
                <Line type="monotone" dataKey="total" stroke={chartColors.primary} strokeWidth={2.5} dot={{ r: 4, fill: chartColors.primary, strokeWidth: 0 }} activeDot={{ r: 6, fill: chartColors.primary, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <DashTable
        head={<tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Property</th><th className="px-5 py-4">Buyer</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Commission</th><th /></tr>}
      >
        {sales.length === 0
          ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No sales logged yet.</td></tr>
          : sales.map((s) => (
            <tr key={s.id} className="h-20 border-t border-border">
              <td className="px-5 py-4">{format(new Date(s.sale_date), "MMM d, yyyy")}</td>
              <td className="px-5 py-4">{(s as { properties?: { title?: string } }).properties?.title ?? "—"}</td>
              <td className="px-5 py-4">{s.buyer_name ?? "—"}</td>
              <td className="px-5 py-4 font-medium">{formatPrice(s.amount)}</td>
              <td className="px-5 py-4 text-primary">{formatPrice(s.commission)}</td>
              <td className="px-5 py-4 text-right whitespace-nowrap">
                <Button size="sm" variant="outline" onClick={() => startEdit(s)}>Edit</Button>
                <Button size="sm" variant="ghost" className="ml-2 text-destructive" onClick={() => { if (confirm("Delete this sale?")) del.mutate(s.id); }}>Delete</Button>
              </td>
            </tr>
          ))
        }
      </DashTable>
    </div>
  );
}

// ── Forecast ──────────────────────────────────────────────────────────────────

function Forecast() {
  const predict = useServerFn(predictSales);
  const [result, setResult] = useState<{ summary: string; forecast: { month: string; projected: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try { const r = await predict({ data: {} }); setResult(r); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Prediction failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Analyze your logged sales and project the next three months.</p>
        <Button onClick={run} disabled={loading} className="shrink-0">{loading ? "Analyzing…" : "Run forecast"}</Button>
      </div>
      {result && (
        <>
          {result.forecast.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">Projected volume — next 3 months</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {result.forecast.map((f) => (
                  <div key={f.month} className="flex h-28 flex-col justify-between rounded-xl border border-border bg-surface p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{f.month}</p>
                    <p className="font-display text-2xl font-semibold text-primary leading-none">{formatPrice(f.projected)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">AI analysis</h3>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">{result.summary}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin: Users & Roles ──────────────────────────────────────────────────────

function UsersRoles() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, created_at");
      const { data: roles }    = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r) => { const list = map.get(r.user_id) ?? []; list.push(r.role); map.set(r.user_id, list); });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });
  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "commissioner" | "agent" | "admin" }) => { const { error } = await supabase.from("user_roles").insert({ user_id: userId, role }); if (error) throw error; },
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const revoke = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => { const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role); if (error) throw error; },
    onSuccess: (_d, v) => { toast.success(`${v.role} role revoked`); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Users & Roles" subtitle="Manage who can post listings and who has admin access." />
      <BigTable head={<tr><th className="px-6 py-5">User</th><th className="px-6 py-5">Roles</th><th className="px-6 py-5 text-right">Actions</th></tr>}>
        {users.map((u) => (
          <tr key={u.id} className="h-28 border-t border-border">
            <td className="px-6 py-5">
              <div className="font-semibold">{u.full_name ?? u.id.slice(0, 8)}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">Joined {format(new Date(u.created_at), "MMM d, yyyy")}</div>
            </td>
            <td className="px-6 py-5">
              <div className="flex flex-wrap gap-1.5">
                {u.roles.length === 0 ? <span className="text-muted-foreground">—</span> : u.roles.map((r) => {
                  const isRevocable = r === "commissioner" || r === "agent";
                  return (
                    <span key={r} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1.5 text-sm">
                      {r}
                      {isRevocable && (
                        <button type="button" onClick={() => { if (confirm(`Revoke "${r}" from ${u.full_name ?? "this user"}?`)) revoke.mutate({ userId: u.id, role: r }); }} className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </td>
            <td className="px-6 py-5 text-right whitespace-nowrap">
              {!u.roles.includes("commissioner") && <Button size="sm" variant="outline" onClick={() => grant.mutate({ userId: u.id, role: "commissioner" })}>Make commissioner</Button>}
              {!u.roles.includes("agent")        && <Button size="sm" variant="outline" className="ml-2" onClick={() => grant.mutate({ userId: u.id, role: "agent" })}>Make agent</Button>}
              {!u.roles.includes("admin")        && <Button size="sm" variant="ghost"   className="ml-2" onClick={() => grant.mutate({ userId: u.id, role: "admin" })}>Make admin</Button>}
            </td>
          </tr>
        ))}
      </BigTable>
    </div>
  );
}

// ── Admin: C/A Requests ───────────────────────────────────────────────────────

function CommissionerRequests() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["commissioner-requests"],
    queryFn: async () => {
      const { data: reqs } = await supabase.from("commissioner_requests").select("id, user_id, status, created_at, note, full_name, phone, email, reason, requested_role").eq("status", "pending").order("created_at", { ascending: false });
      const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, phone").in("id", ids);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (reqs ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) ?? null }));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, userId, role }: { id: string; userId: string; role: "commissioner" | "agent" | null }) => {
      if (role) { const { error: rerr } = await supabase.from("user_roles").insert({ user_id: userId, role }); if (rerr && !rerr.message.includes("duplicate")) throw rerr; }
      const { error } = await supabase.from("commissioner_requests").update({ status: role ? "approved" : "denied", decided_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.role ? `Approved as ${v.role}` : "Request denied"); qc.invalidateQueries({ queryKey: ["commissioner-requests"] }); qc.invalidateQueries({ queryKey: ["all-users"] }); setOpenId(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Commissioner / Agent Requests" subtitle="Review pending applications and approve or deny them." />
      <BigTable head={<tr><th className="px-6 py-5">Applicant</th><th className="px-6 py-5">Requested role</th><th className="px-6 py-5 whitespace-nowrap">Date</th><th className="px-6 py-5 text-right">Actions</th></tr>}>
        {requests.length === 0
          ? <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No pending requests.</td></tr>
          : requests.map((r) => {
            const isOpen = openId === r.id;
            const displayName = r.full_name ?? r.profile?.full_name ?? r.user_id.slice(0, 8);
            const requestedLabel = r.requested_role === "agent" ? "Agent" : r.requested_role === "commissioner" ? "Commissioner" : "—";
            return (
              <>
                <tr key={r.id} className="h-28 border-t border-border">
                  <td className="px-6 py-5"><div className="font-semibold">{displayName}</div><div className="mt-0.5 text-sm text-muted-foreground">{r.email ?? r.profile?.email ?? ""}</div></td>
                  <td className="px-6 py-5">{r.requested_role ? <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">{requestedLabel}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-6 py-5 whitespace-nowrap">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                  <td className="px-6 py-5 text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(isOpen ? null : r.id)}>{isOpen ? "Close" : "View details"}</Button></td>
                </tr>
                {isOpen && (
                  <tr key={`${r.id}-detail`} className="border-t border-border bg-surface/60">
                    <td colSpan={4} className="px-6 py-6">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</p><p className="mt-1 text-sm">{displayName}</p></div>
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p><p className="mt-1 text-sm">{r.phone ?? r.profile?.phone ?? "—"}</p></div>
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p><p className="mt-1 text-sm">{r.email ?? r.profile?.email ?? "—"}</p></div>
                      </div>
                      <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</p><p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.reason ?? r.note ?? "No reason provided."}</p></div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant={r.requested_role === "commissioner" ? "default" : "outline"} onClick={() => decide.mutate({ id: r.id, userId: r.user_id, role: "commissioner" })}>Approve as Commissioner</Button>
                        <Button size="sm" variant={r.requested_role === "agent" ? "default" : "outline"} onClick={() => decide.mutate({ id: r.id, userId: r.user_id, role: "agent" })}>Approve as Agent</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => decide.mutate({ id: r.id, userId: r.user_id, role: null })}>Deny</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })
        }
      </BigTable>
    </div>
  );
}

// ── Admin: C/A Tracking ───────────────────────────────────────────────────────

function CommissionerTracking() {
  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, created_at");
      const { data: roles }    = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r) => { const list = map.get(r.user_id) ?? []; list.push(r.role); map.set(r.user_id, list); });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });
  const commissioners = users.filter((u) => u.roles.includes("commissioner") || u.roles.includes("agent"));
  const { data: sales = [] } = useQuery({
    queryKey: ["admin-all-sales"],
    queryFn: async () => { const { data, error } = await supabase.from("sales").select("commissioner_id, amount, commission, sale_date").order("sale_date", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const byAgent = useMemo(() => {
    const m = new Map<string, { volume: number; commission: number; count: number; last: string | null }>();
    sales.forEach((s) => {
      const cur = m.get(s.commissioner_id) ?? { volume: 0, commission: 0, count: 0, last: null };
      cur.volume += Number(s.amount); cur.commission += Number(s.commission); cur.count += 1;
      cur.last = cur.last && cur.last > s.sale_date ? cur.last : s.sale_date;
      m.set(s.commissioner_id, cur);
    });
    return m;
  }, [sales]);

  return (
    <div className="space-y-6">
      <SectionCard title="Commissioner / Agent Tracking" subtitle="Monitor sales performance across all commissioners and agents." />
      <BigTable head={<tr><th className="px-6 py-5">Agent</th><th className="px-6 py-5 text-right">Deals</th><th className="px-6 py-5 text-right">Volume</th><th className="px-6 py-5 text-right">Commission</th><th className="px-6 py-5 whitespace-nowrap">Last sale</th></tr>}>
        {commissioners.length === 0
          ? <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No commissioners or agents yet.</td></tr>
          : commissioners.map((c) => {
            const s = byAgent.get(c.id) ?? { volume: 0, commission: 0, count: 0, last: null };
            return (
              <tr key={c.id} className="h-28 border-t border-border">
                <td className="px-6 py-5"><Link to="/agents/$id" params={{ id: c.id }} className="font-semibold hover:text-primary">{c.full_name ?? c.id.slice(0, 8)}</Link></td>
                <td className="px-6 py-5 text-right">{s.count}</td>
                <td className="px-6 py-5 text-right font-semibold">{formatPrice(s.volume)}</td>
                <td className="px-6 py-5 text-right text-primary font-semibold">{formatPrice(s.commission)}</td>
                <td className="px-6 py-5 whitespace-nowrap">{s.last ? format(new Date(s.last), "MMM d, yyyy") : "—"}</td>
              </tr>
            );
          })
        }
      </BigTable>
    </div>
  );
}

// ── Admin: Announcements ───────────────────────────────────────────────────────
// Where admins author the platform-wide announcements that show up as a
// Megaphone dropdown in the dashboard topbar for every commissioner/agent
// (see Nav.tsx). Archiving (rather than deleting) keeps history around;
// deleting removes it entirely for everyone, including from history here.

function AnnouncementsAdmin({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: fetchAllAnnouncements,
  });

  const create = useMutation({
    mutationFn: () => createAnnouncement(title.trim(), body.trim(), userId),
    onSuccess: () => {
      toast.success("Announcement pushed to all commissioners and agents.");
      setTitle(""); setBody("");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["nav-announcements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create announcement"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setAnnouncementActive(id, isActive),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? "Announcement re-activated" : "Announcement archived");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["nav-announcements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["nav-announcements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Announcements"
        subtitle="Push a platform-wide notice to every commissioner and agent — it appears as a megaphone dropdown in their dashboard topbar."
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">New announcement</h3>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (title.trim() && body.trim()) create.mutate(); }}
        >
          <div>
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New listing guidelines updated" className="mt-1.5" />
          </div>
          <div>
            <Label>Message</Label>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details for commissioners and agents…"
              className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>
          <Button type="submit" disabled={create.isPending || !title.trim() || !body.trim()}>
            <Megaphone className="h-4 w-4" />{create.isPending ? "Publishing…" : "Publish announcement"}
          </Button>
        </form>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <BigTable
          head={
            <tr>
              <th className="px-6 py-5">Announcement</th>
              <th className="px-6 py-5 whitespace-nowrap">Status</th>
              <th className="px-6 py-5 whitespace-nowrap">Published</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          }
        >
          {announcements.map((a) => (
            <tr key={a.id} className="h-28 border-t border-border">
              <td className="px-6 py-5">
                <p className="font-semibold">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 max-w-md text-sm text-muted-foreground">{a.body}</p>
              </td>
              <td className="px-6 py-5 whitespace-nowrap">
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${a.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {a.is_active ? "Active" : "Archived"}
                </span>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy")}</td>
              <td className="px-6 py-5 text-right whitespace-nowrap">
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: a.id, isActive: !a.is_active })}>
                  {a.is_active ? "Archive" : "Re-activate"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 text-destructive"
                  onClick={() => { if (confirm("Delete this announcement permanently?")) del.mutate(a.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </BigTable>
      )}
    </div>
  );
}
