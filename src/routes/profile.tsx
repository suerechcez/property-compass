import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/PhoneInput";
import { uploadAvatarImage } from "@/lib/storage";
import { toast } from "sonner";
import { format } from "date-fns";
import { PROPERTY_TYPES } from "@/lib/property-types";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile · One Higala Properties" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, isCommissioner, isAgent, isAdmin, isDeveloper, rolesLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: profile, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [years, setYears] = useState<string>("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Agent credibility fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setTitle(profile.title ?? "");
    setPhone(profile.phone ?? "");
    setEmail(profile.email ?? user?.email ?? "");
    setYears(profile.years_experience ? String(profile.years_experience) : "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setLicenseNumber(profile.license_number ?? "");
    setAgencyName(profile.agency_name ?? "");
    setSpecialties(profile.specialties ?? []);
    setLanguages(profile.languages ?? "");
    setFacebookUrl(profile.facebook_url ?? "");
  }, [profile, user?.email]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          title: title || null,
          phone: phone || null,
          email: email || null,
          years_experience: years ? Number(years) : null,
          bio: bio || null,
          avatar_url: avatarUrl,
          license_number: licenseNumber || null,
          agency_name: agencyName || null,
          specialties,
          languages: languages || null,
          facebook_url: facebookUrl || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatarImage(file, user.id);
      setAvatarUrl(url);
      // persist immediately so nav/agent page reflect it
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const showProfessionalFields = isCommissioner || isAgent || isAdmin || isDeveloper;

  if (loading || !user) {
    return <div><Nav /><div className="mx-auto max-w-3xl p-10 text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold">My profile</h1>
            <p className="mt-1 text-muted-foreground">Manage how you appear to buyers and renters.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/agents/$id" params={{ id: user.id }}>View public profile</Link>
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-3xl font-bold shadow">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (fullName || user.email || "A").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <Label htmlFor="avatar" className="text-sm font-medium">Profile photo</Label>
              <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Square works best.</p>
              <div className="mt-3 flex items-center gap-3">
                <Input id="avatar" type="file" accept="image/*" onChange={onPickAvatar} disabled={uploading} className="max-w-xs" />
                {avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setAvatarUrl(null);
                      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
                      toast.success("Photo removed");
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {uploading && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>
        </div>

        {rolesLoaded && !isCommissioner && !isAgent && !isAdmin && !isDeveloper && (
          <CommissionerApplication userId={user.id} />
        )}

        <form
          className="mt-6 space-y-6"
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Basic info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <Label>Job title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Licensed Real Estate Broker" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="profile-phone">Phone</Label>
                <PhoneInput id="profile-phone" value={phone} onChange={setPhone} />
              </div>
              <div>
                <Label>Years of experience</Label>
                <Input type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Bio</Label>
              <textarea
                rows={5}
                className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell buyers about your specialties, neighborhoods you serve in Cagayan de Oro City, and what makes working with you different."
              />
            </div>
          </section>

          {showProfessionalFields && (
            <>
              <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
                <div>
                  <h2 className="font-display text-xl font-semibold">Credentials</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Builds buyer trust — a visible PRC license number is one of the strongest signals a client looks for.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>PRC license number</Label>
                    <Input
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. 0012345"
                    />
                  </div>
                  <div>
                    <Label>Agency / brokerage</Label>
                    <Input
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. One Higala Properties Inc."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Languages spoken</Label>
                    <Input
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="English, Cebuano, Tagalog"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Facebook page or profile</Label>
                    <Input
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
                <div>
                  <h2 className="font-display text-xl font-semibold">Specialties</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Property types you focus on. Helps buyers find the right agent for what they need.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <Chip
                      key={t.value}
                      active={specialties.includes(t.value)}
                      onClick={() => toggle(specialties, setSpecialties, t.value)}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </section>
            </>
          )}

          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</Button>
        </form>
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/70 hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function CommissionerApplication({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<"commissioner" | "agent">("commissioner");
  const [reason, setReason] = useState("");

  const { data: latestRequest, isLoading } = useQuery({
    queryKey: ["my-commissioner-request", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissioner_requests")
        .select("id, status, created_at, decided_at, requested_role")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error("Please share a reason for applying.");
      }
      const { error } = await supabase.from("commissioner_requests").insert({
        user_id: userId,
        status: "pending",
        requested_role: role,
        reason: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Your ${role === "agent" ? "Agent" : "Commissioner"} request was submitted for admin review.`);
      setReason("");
      qc.invalidateQueries({ queryKey: ["my-commissioner-request", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit request"),
  });

  if (isLoading) return null;

  const isPending = latestRequest?.status === "pending";
  const isDenied = latestRequest?.status === "denied";
  const pendingRoleLabel = latestRequest?.requested_role === "agent" ? "Agent" : "Commissioner";
  const roleLabel = role === "agent" ? "Agent" : "Commissioner";

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Apply for Commissioner or Agent</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the specific role you'd like to apply for. An admin will review your request.
      </p>

      {isPending ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
          Your {pendingRoleLabel} request submitted {latestRequest?.created_at ? format(new Date(latestRequest.created_at), "MMM d, yyyy") : ""} is pending admin review.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {isDenied && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Your previous request was not approved. You're welcome to apply again.
            </p>
          )}

          <div>
            <Label>Which role are you applying for?</Label>
            <div className="mt-1.5 flex gap-2">
              <RoleChoice active={role === "commissioner"} onClick={() => setRole("commissioner")}>
                Commissioner
              </RoleChoice>
              <RoleChoice active={role === "agent"} onClick={() => setRole("agent")}>
                Agent
              </RoleChoice>
            </div>
          </div>

          <div>
            <Label>Reason for applying</Label>
            <textarea
              required
              rows={4}
              className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Tell the admin why you'd like to become a ${roleLabel} — your real estate experience, license details, or what you're hoping to do on the platform…`}
            />
          </div>

          <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
            {apply.isPending ? "Submitting…" : `Apply for ${roleLabel}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function RoleChoice({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/70 hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
