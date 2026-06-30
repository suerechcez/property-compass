import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { format } from "date-fns";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Developer updates · 1HP Portal" },
      { name: "description", content: "Latest product updates and announcements from the 1HP Portal developer team." },
    ],
  }),
  component: Updates,
});

function Updates() {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["developer_updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold">Developer updates</h1>
        <p className="mt-2 text-muted-foreground">News, features, and improvements to the 1HP Portal.</p>

        <div className="mt-10 space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No updates posted yet.
            </div>
          ) : updates.map((u) => (
            <article key={u.id} className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {format(new Date(u.created_at), "MMMM d, yyyy")}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{u.title}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/85">{u.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
