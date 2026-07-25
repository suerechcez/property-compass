import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { typeLabel, formatPrice, type ImageSection } from "@/lib/property-types";
import { X, Check, ExternalLink } from "lucide-react";

/**
 * Read-only preview of a full listing — every photo, section, description,
 * and fact, exactly as a buyer would see it — without any of the editable
 * form controls. Used from the admin Listing Queue so admins can inspect a
 * submission in full before approving/rejecting/deleting it, without being
 * able to change any of its content from that screen (that stays reserved
 * for the owning commissioner/agent, or an admin explicitly opening Edit).
 */
export function ListingPreviewModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["listing-preview", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sections: ImageSection[] =
    data?.image_sections && (data.image_sections as ImageSection[]).length > 0
      ? (data.image_sections as ImageSection[])
      : data?.images?.length
      ? [{ label: "Photos", images: data.images }]
      : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Read-only preview</p>
            <h2 className="font-display text-xl font-semibold">{data?.title ?? "Loading…"}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {isLoading || !data ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              {/* Cover photo */}
              {data.images?.[0] ? (
                <img src={data.images[0]} alt={data.title} className="aspect-video w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-video place-items-center rounded-xl bg-surface font-display text-3xl text-muted-foreground">H</div>
              )}

              <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <span>{typeLabel(data.property_type)}</span>
                    {data.for_rent && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
                    <span className="rounded-full border border-border px-2 py-0.5 capitalize">{data.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{data.location ?? "Location not set"}</p>
                </div>
                <p className="font-display text-2xl font-semibold text-primary">
                  {formatPrice(data.price)}
                  {data.for_rent && <span className="text-sm font-normal text-muted-foreground"> /mo</span>}
                </p>
              </div>

              {/* Facts */}
              <div className="mt-5 grid gap-x-8 gap-y-1 border-t border-border pt-5 sm:grid-cols-2">
                {data.bedrooms != null && <Fact label="Bedrooms" value={String(data.bedrooms)} />}
                {data.bathrooms != null && <Fact label="Bathrooms" value={String(data.bathrooms)} />}
                {data.area_sqm != null && <Fact label="Interior area" value={`${data.area_sqm} m²`} />}
                {data.year_built && <Fact label="Year built" value={String(data.year_built)} />}
                {data.lot_size_sqm != null && <Fact label="Lot size" value={`${data.lot_size_sqm} m²`} />}
              </div>

              {/* Description */}
              <div className="mt-5 border-t border-border pt-5">
                <h3 className="font-display text-base font-semibold">Description</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                  {data.description || "No description provided."}
                </p>
              </div>

              {/* Features */}
              {data.features?.length > 0 && (
                <div className="mt-5 border-t border-border pt-5">
                  <h3 className="font-display text-base font-semibold">Features</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {data.features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* All photo sections */}
              {sections.length > 0 && (
                <div className="mt-5 space-y-6 border-t border-border pt-5">
                  <h3 className="font-display text-base font-semibold">Photos</h3>
                  {sections.map((s, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {s.images.map((url, j) => (
                          <img key={j} src={url} alt={`${s.label} ${j + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-border pt-5">
                <Link
                  to="/properties/$id"
                  params={{ id: propertyId }}
                  target="_blank"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Open full listing page <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/70 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
