import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { typeLabel, formatPrice } from "@/lib/property-types";
import { predictSales } from "@/lib/predictions.functions";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { LayoutDashboard, Building2, Wallet, Sparkles, ShieldCheck, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · One Higala Properties Inc." }] }),
  component: Dashboard,
});

type Tab = "overview" | "listings" | "sales" | "forecast" | "admin";

const TAB_ICONS: Record<Tab, LucideIcon> = {
  overview: LayoutDashboard,
  listings: Building2,
  sales: Wallet,
  forecast: Sparkles,
  admin: ShieldCheck,
};

const GREETINGS = [
  "Hello",
  "Welcome back",
  "Kumusta",
  "Maayong adlaw",
  "Good to see you",
  "Hey there",
];

function pickGreeting(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
  return GREETINGS[(h + dayBucket) % GREETINGS.length];
}

function friendlyName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  const full = (meta.full_name as string) || (meta.name as string) || "";
  if (full) return full.split(" ")[0];
  const email = user.email ?? "";
  if (email) return email.split("@")[0];
  return "friend";
}

function Dashboard() {
  const { user, loading, isDeveloper, isCommissioner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const elevated = isAdmin || isDeveloper;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div><Nav /><div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading…</div></div>;
  }

  const greeting = pickGreeting(user.id);
  const name = friendlyName(user);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "listings", label: "My listings", show: isCommissioner },
    { id: "sales", label: "Sales", show: isCommissioner },
    { id: "forecast", label: "AI forecast", show: isCommissioner },
    { id: "admin", label: "Admin", show: isAdmin },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-semibold">{greeting}, {name} 👋</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening with your properties today.</p>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <DashboardRail tabs={visibleTabs} active={tab} onChange={setTab} />

          <div className="min-w-0 flex-1">
            {tab === "overview" && <Overview userId={user.id} isCommissioner={isCommissioner} isDeveloper={elevated} />}
            {tab === "listings" && <Listings userId={user.id} isDeveloper={elevated} />}
            {tab === "sales" && <Sales userId={user.id} isDeveloper={elevated} />}
            {tab === "forecast" && <Forecast />}
            {tab === "admin" && isAdmin && <AdminTools />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardRail({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: Tab; label: string }[];
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 sm:w-24 sm:shrink-0 sm:flex-col sm:gap-1.5 sm:overflow-visible sm:pb-0 sm:border-r sm:border-border sm:pr-3">
      {tabs.map((t) => {
        const Icon = TAB_ICONS[t.id];
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center transition sm:w-full ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-tight">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

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
      const totalCommission = (sales ?? []).reduce((s, r) => s + Number(r.commission), 0);
      return {
        propsCount: propsCount ?? 0,
        published: (props ?? []).filter((p) => p.status === "published").length,
        salesCount: (sales ?? []).length,
        totalSales,
        totalCommission,
      };
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label={isDeveloper ? "All listings" : "Your listings"} value={String(stats?.propsCount ?? "—")} />
      <Stat label="Published" value={String(stats?.published ?? "—")} />
      <Stat label={isDeveloper ? "All sales" : "Your sales"} value={String(stats?.salesCount ?? "—")} />
      <Stat label="Total volume" value={stats ? formatPrice(stats.totalSales) : "—"} />
      {isCommissioner && (
        <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild><Link to="/listings/new">Post a new property</Link></Button>
            <Button variant="outline" asChild><Link to="/">Browse listings</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Listings({ userId, isDeveloper }: { userId: string; isDeveloper: boolean }) {
  const qc = useQueryClient();
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing deleted");
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (properties.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">No listings yet.</p>
        <Button asChild className="mt-4"><Link to="/listings/new">Post your first property</Link></Button>
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Price</th><th /></tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="px-4 py-3">
                <Link to="/properties/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                <div className="text-xs text-muted-foreground">{p.location ?? "—"}</div>
              </td>
              <td className="px-4 py-3">{typeLabel(p.property_type)}</td>
              <td className="px-4 py-3 capitalize">{p.status}</td>
              <td className="px-4 py-3">{formatPrice(p.price)}</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="outline" asChild><Link to="/listings/$id/edit" params={{ id: p.id }}>Edit</Link></Button>
                <Button size="sm" variant="ghost" className="ml-2 text-destructive" onClick={() => { if (confirm("Delete this listing?")) del.mutate(p.id); }}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,title").eq("commissioner_id", userId);
      return data ?? [];
    },
  });

  const [propertyId, setPropertyId] = useState("");
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales").insert({
        commissioner_id: userId,
        property_id: propertyId || null,
        amount: Number(amount),
        commission: Number(commission) || 0,
        buyer_name: buyerName || null,
        sale_date: saleDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale logged");
      setAmount(""); setCommission(""); setBuyerName(""); setPropertyId("");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const chartData = useMemo(() => {
    const byMonth = new Map<string, number>();
    [...sales].reverse().forEach((s) => {
      const m = s.sale_date.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(s.amount));
    });
    return [...byMonth.entries()].map(([month, total]) => ({ month, total }));
  }, [sales]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Log a new sale</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-5"
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        >
          <div className="md:col-span-2">
            <Label>Property</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">— Select —</option>
              {myProps.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div><Label>Amount</Label><Input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Commission</Label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div className="md:col-span-4"><Label>Buyer (optional)</Label><Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
          <div className="flex items-end"><Button className="w-full" type="submit">Add sale</Button></div>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Sales over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Commission</th></tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No sales logged yet.</td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3">{format(new Date(s.sale_date), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">{(s as { properties?: { title?: string } }).properties?.title ?? "—"}</td>
                <td className="px-4 py-3">{s.buyer_name ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{formatPrice(s.amount)}</td>
                <td className="px-4 py-3 text-primary">{formatPrice(s.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Forecast() {
  const predict = useServerFn(predictSales);
  const [result, setResult] = useState<{ summary: string; forecast: { month: string; projected: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await predict({ data: {} });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">AI sales forecast</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyze your logged sales and project the next three months with Lovable AI.
            </p>
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? "Analyzing…" : "Run forecast"}
          </Button>
        </div>
      </div>

      {result && (
        <>
          {result.forecast.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">Projected volume — next 3 months</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {result.forecast.map((f) => (
                  <div key={f.month} className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{f.month}</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-primary">{formatPrice(f.projected)}</p>
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

function AdminTools() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const list = map.get(r.user_id) ?? [];
        list.push(r.role);
        map.set(r.user_id, list);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });

  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "commissioner" | "admin" }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const commissioners = users.filter((u) => u.roles.includes("commissioner"));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Users & roles</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage who can post listings and who has admin access.</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">Joined {format(new Date(u.created_at), "MMM d, yyyy")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-muted-foreground">—</span> : u.roles.map((r) => (
                        <span key={r} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!u.roles.includes("commissioner") && (
                      <Button size="sm" variant="outline" onClick={() => grant.mutate({ userId: u.id, role: "commissioner" })}>Make commissioner</Button>
                    )}
                    {!u.roles.includes("admin") && (
                      <Button size="sm" variant="ghost" className="ml-2" onClick={() => grant.mutate({ userId: u.id, role: "admin" })}>Make admin</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CommissionerRequests />
      <CommissionerTracking commissioners={commissioners} />
    </div>
  );
}

function CommissionerRequests() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["commissioner-requests"],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("commissioner_requests")
        .select("id, user_id, status, created_at, note")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (reqs ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) ?? null }));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, userId, approve }: { id: string; userId: string; approve: boolean }) => {
      if (approve) {
        const { error: rerr } = await supabase.from("user_roles").insert({ user_id: userId, role: "commissioner" });
        if (rerr && !rerr.message.includes("duplicate")) throw rerr;
      }
      const { error } = await supabase
        .from("commissioner_requests")
        .update({ status: approve ? "approved" : "denied", decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "Commissioner approved" : "Request denied");
      qc.invalidateQueries({ queryKey: ["commissioner-requests"] });
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Commissioner requests</h2>
      <p className="mt-1 text-sm text-muted-foreground">Approve or deny users who requested commissioner access.</p>
      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No pending requests.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.profile?.full_name ?? r.user_id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{r.profile?.email ?? ""}</div>
                  {r.note && <div className="mt-1 max-w-sm text-xs italic text-muted-foreground">"{r.note}"</div>}
                </td>
                <td className="px-4 py-3">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" onClick={() => decide.mutate({ id: r.id, userId: r.user_id, approve: true })}>Approve</Button>
                  <Button size="sm" variant="ghost" className="ml-2 text-destructive" onClick={() => decide.mutate({ id: r.id, userId: r.user_id, approve: false })}>Deny</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommissionerTracking({ commissioners }: { commissioners: { id: string; full_name: string | null }[] }) {
  const { data: sales = [] } = useQuery({
    queryKey: ["admin-all-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("commissioner_id, amount, commission, sale_date")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const byAgent = useMemo(() => {
    const m = new Map<string, { volume: number; commission: number; count: number; last: string | null }>();
    sales.forEach((s) => {
      const cur = m.get(s.commissioner_id) ?? { volume: 0, commission: 0, count: 0, last: null };
      cur.volume += Number(s.amount);
      cur.commission += Number(s.commission);
      cur.count += 1;
      cur.last = cur.last && cur.last > s.sale_date ? cur.last : s.sale_date;
      m.set(s.commissioner_id, cur);
    });
    return m;
  }, [sales]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Commissioner tracking</h2>
      <p className="mt-1 text-sm text-muted-foreground">Monitor sales performance across all commissioners.</p>
      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 text-right">Deals</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Commission</th>
              <th className="px-4 py-3">Last sale</th>
            </tr>
          </thead>
          <tbody>
            {commissioners.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No commissioners yet.</td></tr>
            ) : commissioners.map((c) => {
              const s = byAgent.get(c.id) ?? { volume: 0, commission: 0, count: 0, last: null };
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link to="/agents/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.full_name ?? c.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3 text-right">{s.count}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(s.volume)}</td>
                  <td className="px-4 py-3 text-right text-primary">{formatPrice(s.commission)}</td>
                  <td className="px-4 py-3">{s.last ? format(new Date(s.last), "MMM d, yyyy") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
