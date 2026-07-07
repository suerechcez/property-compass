import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { Users, Building2, Handshake } from "lucide-react";

type RoleTab = "all" | "agent" | "commissioner";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Our Agents — One Higala Properties Inc." },
      { name: "description", content: "Meet the commissioners and agents at One Higala Properties Inc. and view their sales track record." },
    ],
  }),
  component: AgentsList,
});

function AgentsList() {
  const [tab, setTab] = useState<RoleTab>("all");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-directory"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["commissioner", "agent"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      // Track every role a person holds (not just one) so someone with both
      // Commissioner and Agent shows up correctly under both tabs below.
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, created_at")
        .in("id", ids);
      return (profiles ?? []).map((p) => {
        const rs = rolesByUser.get(p.id) ?? [];
        return { ...p, roles: rs, primaryRole: rs.includes("agent") ? "agent" : "commissioner" };
      });
    },
  });

  const filtered = useMemo(() => {
    if (tab === "all") return agents;
    return agents.filter((a) => a.roles.includes(tab));
  }, [agents, tab]);

  const counts = useMemo(
    () => ({
      all: agents.length,
      agent: agents.filter((a) => a.roles.includes("agent")).length,
      commissioner: agents.filter((a) => a.roles.includes("commissioner")).length,
    }),
    [agents],
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Our Agents</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Meet the commissioners and agents bringing you home the higala way. View their profile, commission earnings, and complete sales history.
          </p>

          {/* TODO: this page will be redesigned later — for now, a simple
              dashboard-style tab list to switch between Agents and
              Commissioners so both roles are easy to verify at a glance. */}
          <RoleTabNav tab={tab} onChange={setTab} counts={counts} />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Loading agents…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">
            {tab === "all" ? "No agents listed yet." : `No ${tab}s listed yet.`}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Link
                key={a.id}
                to="/agents/$id"
                params={{ id: a.id }}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-xl font-bold">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt={a.full_name ?? "Agent"} className="h-full w-full object-cover" />
                    ) : (
                      (a.full_name ?? "A").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold group-hover:text-primary">{a.full_name ?? "Agent"}</h3>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {a.primaryRole === "agent" ? "Agent" : "Commissioner"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-primary">View profile & sales →</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleTabNav({
  tab,
  onChange,
  counts,
}: {
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
    <nav className="mt-6 flex gap-1 overflow-x-auto">
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
            <Icon className="h-3.5 w-3.5" />
            {it.label}
            <span className="ml-0.5 text-[10px] opacity-70">({counts[it.id]})</span>
          </button>
        );
      })}
    </nav>
  );
}
