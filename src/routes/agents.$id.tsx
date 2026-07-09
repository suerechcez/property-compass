import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BadgeCheck, Facebook } from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Agent Profile — One Higala Properties Inc.` },
      { name: "description", content: `Agent profile, commission earnings, and sales history for agent ${params.id}.` },
    ],
  }),
  component: AgentProfile,
  errorComponent: ({ error }) => (
    <div className="min-h-screen site-page"><Nav /><div className="mx-auto max-w-4xl p-10 text-destructive">{error.message}</div></div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen site-page"><Nav /><div className="mx-auto max-w-4xl p-10">Agent not found.</div></div>
  ),
});

function AgentProfile() {
  const { id } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["agent-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, phone, email, title, bio, years_experience, created_at, license_number, agency_name, specialties, service_areas, languages, facebook_url",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  // Determine whether this person is registered as a Commissioner, an Agent,
  // or both — used as the fallback label when they haven't set a custom job title.
  const { data: roleRows = [] } = useQuery({
    queryKey: ["agent-roles", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .in("role", ["commissioner", "agent"]);
      return data ?? [];
    },
  });
  const roleLabel = roleRows.some((r) => r.role === "agent") ? "Agent" : "Commissioner";

  const { data: sales = [] } = useQuery({
    queryKey: ["agent-sales", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, properties(title, property_type, location)")
        .eq("commissioner_id", id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["agent-listings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, status")
        .eq("commissioner_id", id);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const totalVolume = sales.reduce((s, r) => s + Number(r.amount), 0);
    const totalCommission = sales.reduce((s, r) => s + Number(r.commission), 0);
    return {
      totalVolume,
      totalCommission,
      count: sales.length,
      avg: sales.length ? totalVolume / sales.length : 0,
    };
  }, [sales]);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { volume: number; commission: number }>();
    [...sales].reverse().forEach((s) => {
      const m = s.sale_date.slice(0, 7);
      const cur = byMonth.get(m) ?? { volume: 0, commission: 0 };
      cur.volume += Number(s.amount);
      cur.commission += Number(s.commission);
      byMonth.set(m, cur);
    });
    return [...byMonth.entries()].map(([month, v]) => ({ month, ...v }));
  }, [sales]);

  if (isLoading || !profile) {
    return <div className="min-h-screen site-page"><Nav /><div className="mx-auto max-w-6xl p-10 text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen site-page">
      <Nav />
      {/* Profile header */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link to="/agents" className="text-sm text-primary hover:underline">← All agents</Link>
          <div className="mt-4 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-3xl font-bold shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name ?? "Agent"} className="h-full w-full object-cover" />
              ) : (
                (profile.full_name ?? "A").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-primary">{profile.title ?? roleLabel}</p>
              <h1 className="mt-1 font-display text-4xl font-semibold">{profile.full_name ?? "Agent"}</h1>
              {profile.agency_name && (
                <p className="mt-0.5 text-sm text-muted-foreground">{profile.agency_name}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Joined {format(new Date(profile.created_at), "MMMM yyyy")}
                {profile.years_experience ? ` · ${profile.years_experience}+ years experience` : ""}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {profile.license_number && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    PRC License #{profile.license_number}
                  </span>
                )}
                {profile.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.email && <a href={`mailto:${profile.email}`} className="hover:text-primary">{profile.email}</a>}
                {profile.phone && <a href={`tel:${profile.phone}`} className="hover:text-primary">{profile.phone}</a>}
                <span>{listings.length} listings</span>
              </div>

              {profile.languages && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">Speaks:</span> {profile.languages}
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 max-w-2xl leading-relaxed text-foreground/85">{profile.bio}</p>
              )}

              {(profile.specialties?.length > 0 || profile.service_areas?.length > 0) && (
                <div className="mt-5 space-y-3">
                  {profile.specialties?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specialties</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {profile.specialties.map((s: string) => (
                          <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{typeLabel(s)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.service_areas?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service areas</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {profile.service_areas.map((a: string) => (
                          <span key={a} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Commission stats */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="font-display text-2xl font-semibold">Commission & performance</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total commission" value={formatPrice(stats.totalCommission)} highlight />
          <Stat label="Total sales volume" value={formatPrice(stats.totalVolume)} />
          <Stat label="Deals closed" value={String(stats.count)} />
          <Stat label="Average deal size" value={formatPrice(stats.avg)} />
        </div>
      </section>

      {/* Tracking chart */}
      {chartData.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-10">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Sales tracking</h2>
            <p className="mt-1 text-sm text-muted-foreground">Monthly volume and commission earned.</p>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" name="Volume" dataKey="volume" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" name="Commission" dataKey="commission" stroke="var(--color-gold)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Sales history */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold">History of sales</h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No sales recorded yet.</td></tr>
              ) : sales.map((s) => {
                const prop = (s as { properties?: { title?: string; property_type?: string; location?: string } }).properties;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(s.sale_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{prop?.title ?? "—"}</div>
                      {prop?.location && <div className="text-xs text-muted-foreground">{prop.location}</div>}
                    </td>
                    <td className="px-4 py-3">{prop?.property_type ? typeLabel(prop.property_type) : "—"}</td>
                    <td className="px-4 py-3">{s.buyer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(s.amount)}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatPrice(s.commission)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-primary/40 bg-gradient-to-br from-primary/10 to-card" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
