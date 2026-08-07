import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { typeLabel } from "@/lib/property-types";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Users, Building2, Handshake, User, Search, Mail, Phone } from "lucide-react";

type RoleTab = "all" | "agent" | "commissioner";

export const Route = createFileRoute("/agents/")({
  head: () => ({
    meta: [
      { title: "Find an Agent — One Higala Properties Inc." },
      { name: "description", content: "Find trusted agents and committed commissioners at One Higala Properties Inc." },
    ],
  }),
  component: AgentsList,
});

const CARD_CLASS =
  "group flex h-64 w-full gap-5 border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-black/5";

function AgentsList() {
  const [tab, setTab] = useState<RoleTab>("all");
  const [q, setQ] = useState("");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-directory"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["commissioner", "agent"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, email, created_at, agency_name, title, bio, specialties, is_verified")
        .in("id", ids);
      return (profiles ?? []).map((p) => {
        const rs = rolesByUser.get(p.id) ?? [];
        return { ...p, roles: rs };
      });
    },
  });

  const filtered = useMemo(() => {
    let list = tab === "all" ? agents : agents.filter((a) => a.roles.includes(tab));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((a) => (a.full_name ?? "").toLowerCase().includes(needle));
    }
    return list;
  }, [agents, tab, q]);

  const counts = useMemo(
    () => ({
      all: agents.length,
      agent: agents.filter((a) => a.roles.includes("agent")).length,
      commissioner: agents.filter((a) => a.roles.includes("commissioner")).length,
    }),
    [agents],
  );

  return (
    <div className="site-page bg-background">
      <Nav />

      {/* Header — soft navy/gold gradient wash, widened (max-w-4xl, up from
          3xl) with more side padding at large breakpoints, matching the
          homepage's wider treatment. */}
      <section className="border-b border-border bg-gradient-to-br from-primary/8 via-background to-gold/10">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-12 md:py-20 xl:px-20">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Directory</span>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">
            Where trusted agents meet committed <span className="text-primary">commissioners</span>
          </h1>
          <div className="mt-8 flex w-full items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-sm">
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Agent name"
              className="flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground md:text-base"
            />
            <Search className="h-5 w-5 shrink-0 text-primary" />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-12 xl:px-20">
          <RoleTabNav tab={tab} onChange={setTab} counts={counts} />
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-12 lg:px-12 xl:px-20">
        {isLoading ? (
          <p className="text-muted-foreground">Loading agents…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No matching agents or commissioners.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a, i) => (
              <Link
                key={a.id}
                to="/agents/$id"
                params={{ id: a.id }}
                className={`${CARD_CLASS} animate-reveal`}
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-3xl font-bold">
                  {a.avatar_url
                    ? <img src={a.avatar_url} alt={a.full_name ?? "Agent"} className="h-full w-full object-cover" />
                    : (a.full_name ?? "A").slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1">
                    {a.roles.includes("commissioner") && (
                      <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-foreground">Commissioner</span>
                    )}
                    {a.roles.includes("agent") && (
                      <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-foreground">Agent</span>
                    )}
                  </div>
                  <h3 className="mt-1 flex items-center gap-1 truncate font-display text-xl font-bold group-hover:text-primary">
                    {a.full_name ?? "Agent"}
                    <VerifiedBadge verified={a.is_verified} size="icon" />
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">{a.agency_name || "One Higala Properties Inc."}</p>
                  <div className="mt-4 space-y-1.5 text-sm">
                    {a.email && (
                      <p className="flex items-center gap-1.5 truncate text-foreground/80">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{a.email}</span>
                      </p>
                    )}
                    {a.phone && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{a.phone}
                      </p>
                    )}
                    {a.specialties && a.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {a.specialties.map((s: string) => (
                          <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{typeLabel(s)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {a.bio && <p className="mt-3 line-clamp-2 text-sm text-foreground/70">{a.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

function RoleTabNav({ tab, onChange, counts }: {
  tab: RoleTab;
  onChange: (t: RoleTab) => void;
  counts: Record<RoleTab, number>;
}) {
  const items: { id: RoleTab; label: string; icon: typeof Users }[] = [
    { id: "all", label: "All", icon: Users },
    { id: "agent", label: "Agents", icon: Handshake },
    { id: "commissioner", label: "Commissioners", icon: Building2 },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{it.label}
            <span className="ml-0.5 text-[10px] opacity-70">({counts[it.id]})</span>
          </button>
        );
      })}
    </nav>
  );
}
