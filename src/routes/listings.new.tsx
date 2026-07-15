import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROPERTY_TYPES, PROPERTY_STATUS, type PropertyTypeValue } from "@/lib/property-types";
import { uploadPropertyImage } from "@/lib/storage";
import { ensureSaleRecord } from "@/lib/sales";
import { toast } from "sonner";

export const Route = createFileRoute("/listings/new")({
  head: () => ({ meta: [{ title: "Post a property · One Higala Properties Inc." }] }),
  component: NewListing,
});

function NewListing() {
  return <ListingForm mode="create" />;
}

export function ListingForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string | null;
    property_type: PropertyTypeValue;
    status: "draft" | "published" | "sold" | "rented";
    price: number | string;
    location: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqm: number | string | null;
    images: string[];
    features: string[];
    for_rent: boolean;
    commissioner_id: string;
    contact_phone?: string | null;
    contact_email?: string | null;
  };
}) {
  const navigate = useNavigate();
  const { user, isCommissioner, isAgent, loading, rolesLoaded } = useAuth();
  const canPost = isCommissioner || isAgent;
  // Guard fires at most once per mount — prevents re-firing on token refresh.
  // In edit mode the guard is skipped entirely: if you're editing your own
  // listing you clearly have the role already, and running the check here
  // races against the roles fetch on fresh navigation.
  const guardFired = useRef(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<PropertyTypeValue>(initial?.property_type ?? "condo");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() ?? "");
  const [area, setArea] = useState(initial?.area_sqm?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState((initial?.features ?? []).join(", "));
  const [forRent, setForRent] = useState(initial?.for_rent ?? false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prefill contact info from the commissioner's own profile on a brand-new
  // listing (not when editing an existing one, which already has its own values).
  useEffect(() => {
    if (!user || mode === "edit") return;
    supabase
      .from("profiles")
      .select("phone, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContactPhone((prev) => prev || data.phone || "");
          setContactEmail((prev) => prev || data.email || user.email || "");
        }
      });
  }, [user, mode]);

  useEffect(() => {
    // Not ready yet — wait for both session and roles to settle.
    if (loading || !rolesLoaded) return;

    // No session — send to auth.
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    // Edit mode: skip the role guard. The listing's RLS policy will reject the
    // save if the user somehow doesn't own it — no need to gate here and risk
    // a false redirect while roles are still loading on fresh navigation.
    if (mode === "edit") return;

    // Create mode: block non-commissioners/agents. One-shot so a subsequent
    // TOKEN_REFRESHED render can't re-trigger it.
    if (!canPost && !guardFired.current) {
      guardFired.current = true;
      toast.error("You need a commissioner or agent role to post listings.");
      navigate({ to: "/dashboard" });
    }
  }, [loading, rolesLoaded, user, canPost, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFiles(files: FileList | null) {
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        uploaded.push(await uploadPropertyImage(f, user.id));
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      commissioner_id: initial?.commissioner_id ?? user.id,
      title,
      description: description || null,
      property_type: type,
      status,
      price: Number(price) || 0,
      location: location || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area_sqm: area ? Number(area) : null,
      images,
      features: features.split(",").map((s) => s.trim()).filter(Boolean),
      for_rent: forRent,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
    };
    try {
      if (mode === "edit" && initial) {
        const { error } = await supabase.from("properties").update(payload).eq("id", initial.id);
        if (error) throw error;
        if (status === "sold" && initial.status !== "sold") {
          await ensureSaleRecord(initial.id, payload.commissioner_id, payload.price);
        }
        toast.success("Listing updated");
        navigate({ to: "/properties/$id", params: { id: initial.id } });
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Listing posted");
        navigate({ to: "/properties/$id", params: { id: data.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // In create mode, don't render the form until roles are confirmed — avoids
  // a flash before the redirect fires for non-commissioners/agents.
  // In edit mode, render immediately (the parent already gated on data loading).
  if (mode === "create" && (loading || !rolesLoaded)) {
    return (
      <div className="min-h-screen site-page">
        <Nav />
        <div className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-page">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-4 font-display text-4xl font-semibold">
          {mode === "edit" ? "Edit listing" : "Post a property"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Customize photos and details so buyers and renters know exactly what they're getting.
        </p>

        <form onSubmit={save} className="mt-10 space-y-8">
          <Section title="Photos">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((url, i) => (
                <div key={url} className="group relative overflow-hidden rounded-lg border border-border">
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-xs opacity-0 transition group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? "Uploading…" : "+ Add photos"}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
            </div>
          </Section>

          <Section title="Basics">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" full>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunset Penthouse — Cagayan de Oro" />
              </Field>
              <Field label="Type">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as PropertyTypeValue)}
                >
                  {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                >
                  {PROPERTY_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {status === "sold" && initial?.status !== "sold" && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Saving will log this as a sale on your Sales tab.
                  </p>
                )}
              </Field>
              <Field label="Price (PHP ₱)">
                <Input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Location" full>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="House no., Barangay, Street, City"
                />
              </Field>
              <Field label="Bedrooms"><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
              <Field label="Bathrooms"><Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
              <Field label="Area (m²)"><Input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
              <Field label="" full>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={forRent} onChange={(e) => setForRent(e.target.checked)} />
                  Available for rent (hotels, condos)
                </label>
              </Field>
            </div>
          </Section>

          <Section title="Contact information">
            <p className="text-sm text-muted-foreground">
              Shown to buyers and renters on this listing so they can reach you directly.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Phone number">
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </Field>
              <Field label="Email (Gmail or other)">
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@gmail.com"
                />
              </Field>
            </div>
          </Section>

          <Section title="Description">
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell buyers what makes this property special…" />
            <div className="mt-4">
              <Label>Highlights (comma separated)</Label>
              <Input
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="Sea view, Pool, Gated, Furnished"
              />
            </div>
          </Section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Publish listing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      {label && <Label>{label}</Label>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
