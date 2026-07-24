import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROPERTY_TYPES, PROPERTY_STATUS, ROOM_LABEL_PRESETS,
  type PropertyTypeValue, type ImageSection,
} from "@/lib/property-types";
import { uploadPropertyImage } from "@/lib/storage";
import { ensureSaleRecord } from "@/lib/sales";
import { toast } from "sonner";
import { X, Plus, GripVertical } from "lucide-react";

export const Route = createFileRoute("/listings/new")({
  head: () => ({ meta: [{ title: "Post a property · One Higala Properties Inc." }] }),
  component: NewListing,
});

function NewListing() {
  return <ListingForm mode="create" />;
}

/**
 * Turns the legacy flat `images: string[]` column into a single
 * "Photos" section, so listings created before image_sections existed
 * still display and edit sensibly instead of just losing their photos
 * from the form.
 */
function sectionsFromInitial(images: string[], sections: ImageSection[] | null | undefined): ImageSection[] {
  if (sections && sections.length > 0) return sections;
  if (images.length > 0) return [{ label: "Photos", images }];
  return [];
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
    status: "draft" | "pending" | "published" | "sold" | "rented" | "rejected";
    price: number | string;
    location: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqm: number | string | null;
    year_built?: number | null;
    lot_size_sqm?: number | string | null;
    images: string[];
    image_sections?: ImageSection[] | null;
    features: string[];
    for_rent: boolean;
    commissioner_id: string;
    contact_phone?: string | null;
    contact_email?: string | null;
  };
}) {
  const navigate = useNavigate();
  const { user, isCommissioner, isAgent, isAdmin, authReady } = useAuth();
  const canPost = isCommissioner || isAgent;
  const guardFired = useRef(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<PropertyTypeValue>(initial?.property_type ?? "condo");
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() ?? "");
  const [area, setArea] = useState(initial?.area_sqm?.toString() ?? "");
  const [yearBuilt, setYearBuilt] = useState(initial?.year_built?.toString() ?? "");
  const [lotSize, setLotSize] = useState(initial?.lot_size_sqm?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState((initial?.features ?? []).join(", "));
  const [forRent, setForRent] = useState(initial?.for_rent ?? false);
  const [sections, setSections] = useState<ImageSection[]>(
    sectionsFromInitial(initial?.images ?? [], initial?.image_sections)
  );
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "");
  const [uploadingSection, setUploadingSection] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingRented, setMarkingRented] = useState(false);

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
    if (!authReady) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (mode === "edit") return;
    if (!canPost && !guardFired.current) {
      guardFired.current = true;
      toast.error("You need a commissioner or agent role to post listings.");
      navigate({ to: "/dashboard" });
    }
  }, [authReady, user, canPost, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function addSection(label: string) {
    setSections((prev) => [...prev, { label, images: [] }]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function renameSection(index: number, label: string) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)));
  }

  function removeImageFromSection(sectionIndex: number, imageIndex: number) {
    setSections((prev) =>
      prev.map((s, i) => (i === sectionIndex ? { ...s, images: s.images.filter((_, j) => j !== imageIndex) } : s))
    );
  }

  async function onSectionFiles(sectionIndex: number, files: FileList | null) {
    if (!files || !user) return;
    setUploadingSection(sectionIndex);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) uploaded.push(await uploadPropertyImage(f, user.id));
      setSections((prev) =>
        prev.map((s, i) => (i === sectionIndex ? { ...s, images: [...s.images, ...uploaded] } : s))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingSection(null);
    }
  }

  // True only when the current user is an admin reviewing SOMEONE ELSE'S listing.
  // If the admin also posted the listing (commissioner+admin), they don't get the
  // status control — they edit it like a normal commissioner.
  const isAdminReviewing =
    mode === "edit" &&
    isAdmin &&
    !!initial &&
    initial.commissioner_id !== user?.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // Admins reviewing someone else's listing → use the dropdown status
    // Everyone else → keep the current status unchanged (or pending on create)
    const resolvedStatus =
      isAdminReviewing ? status :
      mode === "create" ? "pending" :
      initial?.status ?? "pending";

    // Drop any section that ended up with no photos (e.g. added then never
    // filled in) before saving, and flatten every section's images back
    // into the legacy `images` column so browse cards, agent listing
    // carousels, and recently-viewed — anything reading images[0] as a
    // thumbnail — keep working without needing any changes of their own.
    const cleanedSections = sections
      .map((s) => ({ label: s.label.trim() || "Photos", images: s.images }))
      .filter((s) => s.images.length > 0);
    const flattenedImages = cleanedSections.flatMap((s) => s.images);

    const payload = {
      commissioner_id: initial?.commissioner_id ?? user.id,
      title,
      description: description || null,
      property_type: type,
      status: resolvedStatus,
      price: Number(price) || 0,
      location: location || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area_sqm: area ? Number(area) : null,
      year_built: yearBuilt ? Number(yearBuilt) : null,
      lot_size_sqm: lotSize ? Number(lotSize) : null,
      images: flattenedImages,
      image_sections: cleanedSections,
      features: features.split(",").map((s) => s.trim()).filter(Boolean),
      for_rent: forRent,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
    };

    try {
      if (mode === "edit" && initial) {
        const { error } = await supabase.from("properties").update(payload).eq("id", initial.id);
        if (error) throw error;
        if (isAdminReviewing && status === "sold" && initial.status !== "sold") {
          await ensureSaleRecord(initial.id, payload.commissioner_id, payload.price);
        }
        toast.success("Listing updated");
        navigate({ to: "/properties/$id", params: { id: initial.id } });
      } else {
        const { data, error } = await supabase.from("properties").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Listing submitted for admin review!");
        navigate({ to: "/properties/$id", params: { id: data.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function markRented() {
    if (!initial) return;
    setMarkingRented(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ status: "rented" })
        .eq("id", initial.id);
      if (error) throw error;
      toast.success("Marked as rented — listing remains visible in Browse.");
      navigate({ to: "/properties/$id", params: { id: initial.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as rented");
    } finally {
      setMarkingRented(false);
    }
  }

  if (mode === "create" && !authReady) {
    return (
      <div className="min-h-screen site-page">
        <Nav />
        <div className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Non-admin edit = any edit where the user is NOT reviewing someone else's listing as admin
  const isNonAdminEdit = mode === "edit" && !isAdminReviewing;

  // Presets already used in an existing section shouldn't be offered again
  // (avoid two "Kitchen" sections from a single click) — "Other" is always
  // available since it starts with an empty, freely-editable label.
  const usedLabels = new Set(sections.map((s) => s.label));
  const availablePresets = ROOM_LABEL_PRESETS.filter((p) => !usedLabels.has(p));

  return (
    <div className="min-h-screen site-page">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-4 font-display text-4xl font-semibold">
          {mode === "edit" ? "Edit listing" : "Post a property"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "create"
            ? "Fill in the details below. Your listing will be reviewed by an admin before it goes live."
            : "Customize photos and details so buyers and renters know exactly what they're getting."}
        </p>

        {/* Status notices for own listings */}
        {isNonAdminEdit && initial?.status === "pending" && (
          <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            ⏳ This listing is <strong>pending admin review</strong> and is not yet visible to the public.
          </div>
        )}
        {isNonAdminEdit && initial?.status === "rejected" && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            ❌ This listing was <strong>rejected</strong> by an admin. Update the details and save to resubmit.
          </div>
        )}
        {isNonAdminEdit && initial?.status === "rented" && (
          <div className="mt-4 rounded-xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm text-purple-800">
            🏠 This listing is marked as <strong>rented</strong> and is still visible in Browse.
          </div>
        )}

        <form onSubmit={save} className="mt-10 space-y-8">
          <Section title="Photos">
            <p className="text-sm text-muted-foreground">
              Group photos by room — buyers can browse Living Room, Kitchen, and Bedroom photos separately, like on Zillow.
              The very first photo in your first section becomes this listing's cover photo.
            </p>

            <div className="mt-4 space-y-6">
              {sections.map((section, si) => (
                <div key={si} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    <Input
                      value={section.label}
                      onChange={(e) => renameSection(si, e.target.value)}
                      placeholder="Section name (e.g. Living Room)"
                      className="h-9 flex-1 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeSection(si)}
                      aria-label={`Remove ${section.label || "section"}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {section.images.map((url, ii) => (
                      <div key={url} className="group relative overflow-hidden rounded-lg border border-border">
                        <img src={url} alt="" className="aspect-square w-full object-cover" />
                        {si === 0 && ii === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImageFromSection(si, ii)}
                          className="absolute right-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-xs opacity-0 transition group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-center text-xs text-muted-foreground hover:border-primary hover:text-primary">
                      {uploadingSection === si ? "Uploading…" : "+ Add photos"}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onSectionFiles(si, e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {availablePresets.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addSection(label)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />{label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addSection("")}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" />Other section
              </button>
            </div>
            {sections.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">No photo sections yet — add one above to get started.</p>
            )}
          </Section>

          {/* "Basics" renamed to "Information" */}
          <Section title="Information">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" full>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunset Penthouse — Cagayan de Oro" />
              </Field>
              <Field label="Type">
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as PropertyTypeValue)}>
                  {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>

              {/* Status selector — ONLY for admins reviewing SOMEONE ELSE'S listing */}
              {isAdminReviewing && (
                <Field label="Status">
                  <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                    {[...PROPERTY_STATUS, { value: "pending", label: "Pending review" }, { value: "rejected", label: "Rejected" }].map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {status === "sold" && initial?.status !== "sold" && (
                    <p className="mt-1.5 text-xs text-muted-foreground">Saving will log this as a sale on the Sales tab.</p>
                  )}
                </Field>
              )}

              <Field label="Price (PHP ₱)">
                <Input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Location" full>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="House no., Barangay, Street, City" />
              </Field>
              <Field label="Bedrooms"><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
              <Field label="Bathrooms"><Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
              <Field label="Area (m²)"><Input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
              <Field label="Year built (optional)"><Input type="number" min="1800" max="2100" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} /></Field>
              <Field label="Lot size, m² (optional)"><Input type="number" min="0" value={lotSize} onChange={(e) => setLotSize(e.target.value)} /></Field>
              <Field label="" full>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={forRent} onChange={(e) => setForRent(e.target.checked)} />
                  Available for rent (hotels, condos)
                </label>
              </Field>
            </div>
          </Section>

          <Section title="Contact information">
            <p className="text-sm text-muted-foreground">Shown to buyers and renters on this listing so they can reach you directly.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Phone number">
                <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </Field>
              <Field label="Email (Gmail or other)">
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@gmail.com" />
              </Field>
            </div>
          </Section>

          <Section title="Description">
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell buyers what makes this property special…" />
            <div className="mt-4">
              <Label>Features (comma separated)</Label>
              <Input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Sea view, Pool, Gated, Furnished" />
              <p className="mt-1.5 text-xs text-muted-foreground">Shown as a checklist under "Facts and features" on the listing page.</p>
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mark as Rented — only for own published for-rent listings */}
            {isNonAdminEdit && initial?.for_rent && initial.status === "published" && (
              <Button
                type="button"
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                disabled={markingRented}
                onClick={() => {
                  if (confirm("Mark this property as rented? It will stay visible in Browse with a Rented badge."))
                    markRented();
                }}
              >
                {markingRented ? "Saving…" : "🏠 Mark as Rented"}
              </Button>
            )}
            <div className="ml-auto flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Submit for review"}
              </Button>
            </div>
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
