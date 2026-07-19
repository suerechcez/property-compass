import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { typeLabel } from "@/lib/property-types";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
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

const HERO_IMAGE_URL = "/hero-agents.png";
// .agent-card / .agent-card-row are plain hand-authored CSS (see
// styles.css) — NOT Tailwind utilities — so the fixed card width can
// never be affected by content-scanning/purging. Every card is always
// h-64 tall and exactly the same width, whether there's 1 result or 20.
const CARD_CLASS =
  "agent-card group flex h-64 gap-5 border border-border bg-card p-7 shadow-md transition hover:-translate-y-1 hover:border-primary hover:shadow-xl";

function AgentsList() {
  const [tab, setTab] = useState<RoleTab>("all");
  const [q, setQ] = useState("");
  const [heroImageOk, setHeroImageOk] = useState(true);

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
        .select("id, full_name, avatar_url, phone, email, created_at, agency_name, title, bio, specialties")
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
    <div className="site-page">
      <Nav />
      <section className="relative h-[420px] overflow-hidden bg-gradient-to-br from-primary/85 via-primary to-primary/70 md:h-[460px]">
        {heroImageOk && (
          <img
            src={HERO_IMAGE_URL}
            alt="One Higala Properties agents and commissioners"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            onError={() => setHeroImageOk(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/30" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl">
            Where trusted <span className="text-[hsl(210,90%,70%)]">agents</span> meet committed{" "}
            <span className="text-gold">commissioners</span>
          </h1>
          <div className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-full bg-white px-5 py-3 shadow-2xl shadow-black/30">
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Agent name"
              className="flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground md:text-base"
            />
            <Search className="h-5 w-5 shrink-0 text-primary" />
          </div>
          <p className="mt-3 text-sm text-white/80">Find a real estate agent / commissioner</p>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <RoleTabNav tab={tab} onChange={setTab} counts={counts} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Loading agents…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No matching agents or commissioners.</p>
        ) : (
          // .agent-card-row is plain CSS (styles.css), not a Tailwind
          // grid/flex utility — guaranteed present in every build.
          <div className="agent-card-row">
            {filtered.map((a) => (
              <Link key={a.id} to="/agents/$id" params={{ id: a.id }} className={CARD_CLASS}>
                {/* Fixed-size avatar */}
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-3xl font-bold">
                  {a.avatar_url
                    ? <img src={a.avatar_url} alt={a.full_name ?? "Agent"} className="h-full w-full object-cover" />
                    : (a.full_name ?? "A").slice(0, 1).toUpperCase()}
                </div>

                {/* Content — overflow-hidden prevents it from stretching the card */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap gap-1">
                    {a.roles.includes("commissioner") && (
                      <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-foreground">Commissioner</span>
                    )}
                    {a.roles.includes("agent") && (
                      <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-foreground">Agent</span>
                    )}
                  </div>
                  <h3 className="mt-1 truncate font-display text-xl font-bold group-hover:text-primary">
                    {a.full_name ?? "Agent"}
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
