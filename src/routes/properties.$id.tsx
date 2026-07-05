import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { typeLabel, formatPrice } from "@/lib/property-types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/properties/$id")({
  head: () => ({
    meta: [
      { title: "Property · One Higala Properties Inc." },
      { name: "description", content: "View this property listing with One Higala Properties Inc." },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isDeveloper, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, profiles!properties_commissioner_id_fkey(full_name, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div><Nav /><div className="mx-auto max-w-5xl px-6 py-12 text-muted-foreground">Loading…</div></div>
    );
  }
  if (!data) {
    return (
      <div>
        <Nav />
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">Listing not found</h1>
          <Button asChild className="mt-6"><Link to="/browse">Back to listings</Link></Button>
        </div>
      </div>
    );
  }

  const canEdit = user && (user.id === data.commissioner_id || isDeveloper || isAdmin);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← Back to listings</Link>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{typeLabel(data.property_type)}</span>
              {data.for_rent && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
              <span className="rounded-full border border-border px-2 py-0.5 capitalize">{data.status}</span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{data.title}</h1>
            <p className="mt-2 text-muted-foreground">{data.location ?? "Location not set"}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-semibold text-primary">
              {formatPrice(data.price)}
              {data.for_rent && <span className="text-lg text-muted-foreground"> /mo</span>}
            </p>
            {canEdit && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate({ to: "/listings/$id/edit", params: { id: data.id } })}>
                Edit listing
              </Button>
            )}
          </div>
        </header>

        {data.images?.length ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="overflow-hidden rounded-2xl md:col-span-2 md:row-span-2">
              <img src={data.images[0]} alt={data.title} className="aspect-[4/3] h-full w-full object-cover" />
            </div>
            {data.images.slice(1, 5).map((url, i) => (
              <div key={i} className="overflow-hidden rounded-2xl">
                <img src={url} alt={`${data.title} ${i + 2}`} className="aspect-[4/3] h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid aspect-[3/1] place-items-center rounded-2xl bg-surface font-display text-4xl text-muted-foreground">
            H
          </div>
        )}

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl font-semibold">About this property</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">
              {data.description || "No description provided yet."}
            </p>
            {data.features?.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-lg font-semibold">Highlights</h3>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {data.features.map((f) => (
                    <li key={f} className="rounded-md border border-border bg-card px-3 py-2">{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <aside className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">Quick facts</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {data.bedrooms != null && <Fact label="Bedrooms" value={String(data.bedrooms)} />}
              {data.bathrooms != null && <Fact label="Bathrooms" value={String(data.bathrooms)} />}
              {data.area_sqm != null && <Fact label="Area" value={`${data.area_sqm} m²`} />}
              <Fact label="Type" value={typeLabel(data.property_type)} />
              <Fact label="Listed by" value={(data as { profiles?: { full_name?: string } }).profiles?.full_name ?? "Commissioner"} />
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/70 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
