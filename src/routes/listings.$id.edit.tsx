import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingForm } from "./listings.new";
import { Nav } from "@/components/Nav";

export const Route = createFileRoute("/listings/$id/edit")({
  head: () => ({ meta: [{ title: "Edit listing · One Higala Properties Inc." }] }),
  component: EditListing,
});

function EditListing() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["properties", id, "edit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="site-page"><Nav /><div className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading…</div></div>;
  if (!data) return <div className="site-page"><Nav /><div className="mx-auto max-w-3xl px-6 py-10">Not found</div></div>;
  return <ListingForm mode="edit" initial={data} />;
}
