import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/LocationPicker";
import { PROPERTY_TYPES, ROOM_LABEL_PRESETS, type PropertyTypeValue, type ImageSection } from "@/lib/property-types";
import { uploadPropertyImage } from "@/lib/storage";
import { toast } from "sonner";
import { CheckCircle2, XCircle, X, Plus, GripVertical, Star } from "lucide-react";

export const Route = createFileRoute("/sell/list-your-own")({
  head: () => ({
    meta: [
      { title: "Post a For Sale By Owner Listing · One Higala Properties Inc." },
      { name: "description", content: "List your property yourself on One Higala Properties Inc. — no commissioner or agent role required." },
    ],
  }),
  component: ListYourOwn,
});

function ListYourOwn() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<PropertyTypeValue>("condo");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  // Precise pinpoint — same as the commissioner/agent listing form
  // (src/routes/listings.new.tsx). Letting owners drop an exact pin (via
  // LocationPicker) is what powers the exact-location map on the
  // property page, instead of just a neighborhood-level address search.
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  // Dedicated required main/cover photo — same pattern as the
  // commissioner/agent listing form (src/routes/listings.new.tsx), so
  // buyers see a consistent cover photo on Browse and at the top of the
  // property page regardless of who posted the listing.
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  // Optional room-grouped additional photos — same feature as the
  // commissioner/agent form.
  const [sections, setSections] = useState<ImageSection[]>([]);
  const [uploadingSection, setUploadingSection] = useState<number | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);

  /** LocationPicker reports NaN/NaN to mean "the pin was cleared". */
  function handleLocationChange(lat: number, lng: number) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setLatitude(null);
      setLongitude(null);
      return;
    }
    setLatitude(lat);
    setLongitude(lng);
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Prefill contact info from the owner's own profile.
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  async function onCoverFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const url = await uploadPropertyImage(file, user.id);
      setCoverImage(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  }

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!coverImage) {
      toast.error("Please upload a main showcase photo before posting.");
      return;
    }

    setSaving(true);
    try {
      // Same flattening approach as the commissioner/agent form: the
      // dedicated main photo always becomes images[0] (the cover shown on
      // Browse cards and at the top of the property page), with any
      // room-grouped section photos appended after it.
      const cleanedSections = sections
        .map((s) => ({ label: s.label.trim() || "Photos", images: s.images }))
        .filter((s) => s.images.length > 0);
      const sectionImages = cleanedSections.flatMap((s) => s.images);
      const flattenedImages = [coverImage, ...sectionImages.filter((u) => u !== coverImage)];

      const { data, error } = await supabase
        .from("properties")
        .insert({
          commissioner_id: user.id,
          is_owner_listed: true,
          title,
          description: description || null,
          property_type: type,
          status: "pending",
          price: Number(price) || 0,
          location: location || null,
          latitude,
          longitude,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          area_sqm: area ? Number(area) : null,
          year_built: yearBuilt ? Number(yearBuilt) : null,
          lot_size_sqm: lotSize ? Number(lotSize) : null,
          images: flattenedImages,
          image_sections: cleanedSections,
          features: features.split(",").map((s) => s.trim()).filter(Boolean),
          for_rent: false,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Listing submitted for admin review!");
      navigate({ to: "/properties/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post listing");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading…</div>
    );
  }

  const usedLabels = new Set(sections.map((s) => s.label));
  const availablePresets = ROOM_LABEL_PRESETS.filter((p) => !usedLabels.has(p));

  return (
    <div className="site-page">
      {/* ── Header banner ── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white">
            For Sale By Owner
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
            Post a For Sale By Owner listing
          </h1>
          <p className="mt-3 text-white/80">
            List your property yourself — no commissioner or agent role required.
          </p>
          <p className="mt-1 text-sm text-white/70">
            Your listing will be reviewed by an admin before it goes live.
          </p>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <form onSubmit={save} className="space-y-8">
          <SectionCard title="Photos">
            {/* ── Main showcase photo — required, same as the
                commissioner/agent listing form. This is what shows up as
                the thumbnail on Browse and at the top of your listing
                page. ── */}
            <div>
              <Label>Main photo</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the cover photo buyers see first — on your Browse card and at the top of your listing page.
              </p>
              <div className="mt-3">
                {coverImage ? (
                  <div className="group relative w-full max-w-sm overflow-hidden rounded-xl border border-border">
                    <img src={coverImage} alt="Main showcase" className="aspect-video w-full object-cover" />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                      <Star className="h-3 w-3 fill-current" />Main photo
                    </span>
                    <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                      <label className="cursor-pointer rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium hover:bg-background">
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onCoverFile(e.target.files)} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCoverImage(null)}
                        className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-background"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="grid aspect-video w-full max-w-sm cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:border-primary hover:text-primary">
                    {uploadingCover ? "Uploading…" : "+ Upload main photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onCoverFile(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            {/* ── Optional room-grouped additional photos ── */}
            <div className="mt-8 border-t border-border pt-6">
              <Label>Additional photos</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Optionally group more photos by room — Living Room, Kitchen, Bedroom, and so on.
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
                <p className="mt-3 text-xs text-muted-foreground">No additional sections yet — add one above if you'd like.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Property details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" full>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cozy 2BR House in Carmen" />
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
              <Field label="Price (PHP ₱)">
                <Input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Location" full>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="House no., Barangay, Street, City"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">A free-text address shown on the listing. Use the map below to also mark the exact spot.</p>
              </Field>

              {/* Precise pinpoint — same as the commissioner/agent listing
                  form. This is what powers the exact-location map on the
                  listing page, instead of just a neighborhood-level
                  address search. */}
              <Field label="" full>
                <LocationPicker latitude={latitude} longitude={longitude} onChange={handleLocationChange} />
              </Field>

              <Field label="Bedrooms"><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
              <Field label="Bathrooms"><Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
              <Field label="Area (m²)"><Input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
              <Field label="Year built (optional)"><Input type="number" min="1800" max="2100" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} /></Field>
              <Field label="Lot size, m² (optional)"><Input type="number" min="0" value={lotSize} onChange={(e) => setLotSize(e.target.value)} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Contact information">
            <p className="text-sm text-muted-foreground">Shown to buyers so they can reach you directly.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Phone number">
                <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@gmail.com" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Description">
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell buyers what makes this property special…" />
            <div className="mt-4">
              <Label>Features (comma separated)</Label>
              <Input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Sea view, Pool, Gated, Furnished" />
              <p className="mt-1.5 text-xs text-muted-foreground">Shown as a checklist under "Facts and features" on the listing page.</p>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/sell" })}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit for review"}</Button>
          </div>
        </form>
      </section>

      {/* ── How does FSBO work? ── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center font-display text-2xl font-semibold md:text-3xl">
            How does For Sale By Owner work?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            For Sale By Owner (FSBO) is a home-selling approach where you list and sell your
            home without a commissioner or agent. You handle pricing, marketing, showings,
            negotiations, and paperwork on your own.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-display text-lg font-semibold">Pros</h3>
              <div className="mt-4 space-y-4">
                <ProCon icon={CheckCircle2} tone="pro" title="Full control over listing decisions">
                  You decide the price, listing details, and showing schedule. You're in charge of every step.
                </ProCon>
                <ProCon icon={CheckCircle2} tone="pro" title="Avoid paying a commission">
                  Selling without a commissioner or agent means you keep more of the sale proceeds.
                </ProCon>
                <ProCon icon={CheckCircle2} tone="pro" title="Hands-on involvement">
                  Stay closely involved in every step, from inquiries to negotiations.
                </ProCon>
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Cons</h3>
              <div className="mt-4 space-y-4">
                <ProCon icon={XCircle} tone="con" title="You might sell for less">
                  Homes sold with a commissioner or agent often sell for more, even after their commission.
                </ProCon>
                <ProCon icon={XCircle} tone="con" title="It's a bigger time commitment">
                  Between answering inquiries, scheduling showings, and coordinating paperwork, it can be
                  time-consuming to manage on your own.
                </ProCon>
                <ProCon icon={XCircle} tone="con" title="You handle everything solo">
                  Pricing strategy, negotiations, and legal paperwork are entirely on you.
                </ProCon>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Prefer some help instead?{" "}
            <Link to="/agents" className="font-medium text-primary hover:underline">
              Find a commissioner or agent
            </Link>{" "}
            near you.
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

function ProCon({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof CheckCircle2;
  tone: "pro" | "con";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className={`h-5 w-5 shrink-0 ${tone === "pro" ? "text-primary" : "text-destructive"}`} />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
