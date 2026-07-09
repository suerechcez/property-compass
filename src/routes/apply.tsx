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
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";

// "a Commissioner" vs "an Agent"
function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply for Commissioner / Agent · One Higala Properties" }] }),
  component: ApplyPage,
});

function ApplyPage() {
  const { user, loading, isCommissioner, isAgent, isAdmin, isDeveloper, rolesLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || !user || !rolesLoaded) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-10 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Admins/developers already have full access — send them to the Admin
  // panel instead, where roles are granted directly rather than applied for.
  if (isAdmin || isDeveloper) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold">You already have full access</h1>
          <p className="mt-2 text-muted-foreground">
            As an admin, you can grant Commissioner or Agent roles directly from the dashboard instead of applying.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard" search={{ tab: "admin" }}>Go to Admin dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Already hold both roles — nothing left to apply for.
  if (isCommissioner && isAgent) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold">You're all set</h1>
          <p className="mt-2 text-muted-foreground">
            You already hold both the Commissioner and Agent roles.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/dashboard">Go to your dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const existingRole: "commissioner" | "agent" | null = isCommissioner ? "commissioner" : isAgent ? "agent" : null;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">← Back to profile</Link>
        <ApplicationForm
          userId={user.id}
          existingRole={existingRole}
          defaultName={profile?.full_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          defaultEmail={profile?.email ?? user.email ?? ""}
        />
      </div>
    </div>
  );
}

function ApplicationForm({
  userId,
  existingRole,
  defaultName,
  defaultPhone,
  defaultEmail,
}: {
  userId: string;
  existingRole: "commissioner" | "agent" | null;
  defaultName: string;
  defaultPhone: string;
  defaultEmail: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const missingRole = existingRole === "commissioner" ? "agent" : existingRole === "agent" ? "commissioner" : null;

  const [role, setRole] = useState<"commissioner" | "agent">(missingRole ?? "commissioner");
  const [applicantName, setApplicantName] = useState(defaultName);
  const [applicantPhone, setApplicantPhone] = useState(defaultPhone);
  const [applicantEmail, setApplicantEmail] = useState(defaultEmail);
  const [reason, setReason] = useState("");

  const targetRole = missingRole ?? role;
  const targetLabel = targetRole === "agent" ? "Agent" : "Commissioner";
  const existingLabel = existingRole === "agent" ? "Agent" : "Commissioner";

  const { data: latestRequest, isLoading } = useQuery({
    queryKey: ["my-role-request", userId, targetRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissioner_requests")
        .select("id, status, created_at, requested_role")
        .eq("user_id", userId)
        .eq("requested_role", targetRole)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!applicantName.trim() || !applicantPhone.trim() || !applicantEmail.trim() || !reason.trim()) {
        throw new Error("Please fill in your name, phone, email, and reason for applying.");
      }
      const { error } = await supabase.from("commissioner_requests").insert({
        user_id: userId,
        status: "pending",
        requested_role: targetRole,
        full_name: applicantName.trim(),
        phone: applicantPhone.trim(),
        email: applicantEmail.trim(),
        reason: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Your ${targetLabel} request was submitted for admin review.`);
      setReason("");
      qc.invalidateQueries({ queryKey: ["my-role-request", userId, targetRole] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit request"),
  });

  if (isLoading) {
    return <div className="mt-8 text-muted-foreground">Loading…</div>;
  }

  const isPending = latestRequest?.status === "pending";
  const isDenied = latestRequest?.status === "denied";

  return (
    <div className="mt-4">
      <h1 className="font-display text-3xl font-semibold">
        {missingRole ? `Become ${article(targetLabel)} ${targetLabel}` : "Apply for Commissioner or Agent"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {missingRole
          ? `You're already ${article(existingLabel)} ${existingLabel}. Fill in the details below to also apply for the ${targetLabel} role.`
          : "Choose the specific role you'd like to apply for, fill in your details, and share a reason. An admin will review your request."}
      </p>

      {isPending ? (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
          Your {targetLabel} request submitted {latestRequest?.created_at ? format(new Date(latestRequest.created_at), "MMM d, yyyy") : ""} is pending admin review.
        </div>
      ) : (
        <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6">
          {isDenied && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Your previous {targetLabel} request was not approved. You're welcome to apply again.
            </p>
          )}

          {!missingRole && (
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
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div>
              <Label htmlFor="apply-phone">Phone</Label>
              <PhoneInput id="apply-phone" value={applicantPhone} onChange={setApplicantPhone} />
            </div>
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={applicantEmail}
                onChange={(e) => setApplicantEmail(e.target.value)}
              />
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
              placeholder={`Tell the admin why you'd like to become ${article(targetLabel)} ${targetLabel} — your real estate experience, license details, or what you're hoping to do on the platform…`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? "Submitting…" : `Apply for ${targetLabel}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/profile" })}>
              Cancel
            </Button>
          </div>
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
