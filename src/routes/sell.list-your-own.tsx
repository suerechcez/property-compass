import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROPERTY_TYPES, type PropertyTypeValue } from "@/lib/property-types";
import { uploadPropertyImage } from "@/lib/storage";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

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
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    try {
      const { data, error } = await supabase
        .from("properties")
        .insert({
          commissioner_id: user.id,
          is_owner_listed: true,
          title,
          description: description || null,
          property_type: type,
          status: "published",
          price: Number(price) || 0,
          location: location || null,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          area_sqm: area ? Number(area) : null,
          images,
          for_rent: false,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Your listing is live!");
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
        </div>
      </section>

      {/* ── Form ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <form onSubmit={save} className="space-y-8">
          <SectionCard title="Photos">
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
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
              </label>
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
              </Field>
              <Field label="Bedrooms"><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
              <Field label="Bathrooms"><Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
              <Field label="Area (m²)"><Input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Contact information">
            <p className="text-sm text-muted-foreground">Shown to buyers so they can reach you directly.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Phone number">
                <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
              </Field>
              <Field label="Email">
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@gmail.com" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Description">
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell buyers what makes this property special…" />
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/sell" })}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Posting…" : "Post listing"}</Button>
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
