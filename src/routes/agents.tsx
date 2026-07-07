import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";

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
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-directory"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["commissioner", "agent"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      // If someone holds both roles, prefer showing them as "Agent".
      const roleByUser = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        if (r.role === "agent" || !roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, created_at")
        .in("id", ids);
      return (profiles ?? []).map((p) => ({ ...p, role: roleByUser.get(p.id) ?? "commissioner" }));
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Our Agents</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Meet the commissioners and agents bringing you home the higala way. View their profile, commission earnings, and complete sales history.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Loading agents…</p>
        ) : agents.length === 0 ? (
          <p className="text-muted-foreground">No agents listed yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
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
                      {a.role === "agent" ? "Agent" : "Commissioner"}
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
