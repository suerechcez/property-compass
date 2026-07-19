import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · One Higala Properties Inc." },
      { name: "description", content: "Sign in or create your One Higala Properties Inc. account to list properties and track sales." },
    ],
  }),
  component: AuthPage,
});

const BRAND_ICON_URL = "/brand-icon.png";
const HERO_AUTH_JPG  = "/hero-auth.jpg";
const HERO_AUTH_PNG  = "/hero-auth.png";

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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Base fields
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // C/A request fields
  const [requestRole, setRequestRole]       = useState(false);
  const [caRole, setCaRole]                 = useState<"commissioner" | "agent">("commissioner");
  const [caPhone, setCaPhone]               = useState("");
  const [caEmail, setCaEmail]               = useState(""); // may differ from auth email
  const [caReason, setCaReason]             = useState("");

  const [loading, setLoading]       = useState(false);
  const [heroSrc, setHeroSrc]       = useState(HERO_AUTH_JPG);
  const [heroHidden, setHeroHidden] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [requestedCaRole, setRequestedCaRole] = useState<"commissioner" | "agent" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  // Keep caEmail in sync with the auth email by default
  useEffect(() => {
    if (!caEmail) setCaEmail(email);
  }, [email]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setPassword("");
    setRequestRole(false);
    setCaPhone("");
    setCaEmail("");
    setCaReason("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        // Validate C/A extra fields if requested
        if (requestRole) {
          if (!caPhone.trim())   throw new Error("Please enter your phone number for the role application.");
          if (!caEmail.trim())   throw new Error("Please enter your contact email for the role application.");
          if (!caReason.trim())  throw new Error("Please provide a reason for your role application.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;

        if (data.user && requestRole) {
          await supabase.from("commissioner_requests").insert({
            user_id:        data.user.id,
            status:         "pending",
            requested_role: caRole,
            full_name:      fullName.trim(),
            phone:          caPhone.trim(),
            email:          caEmail.trim(),
            reason:         caReason.trim(),
          });
        }

        setRegisteredEmail(email);
        setRequestedCaRole(requestRole ? caRole : null);
        setAwaitingConfirmation(true);
        return;
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          const roleSet = new Set((roles ?? []).map((r) => r.role));
          const hasElevatedRole =
            roleSet.has("commissioner") || roleSet.has("agent") ||
            roleSet.has("admin")        || roleSet.has("developer");

          toast.success("Signed in.");
          navigate({ to: hasElevatedRole ? "/dashboard" : "/browse" });
        } else {
          toast.success("Signed in.");
          navigate({ to: "/browse" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  }

  // ── Email confirmation screen ──────────────────────────────────────────────
  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-background site-page flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Check your email</h1>
          <p className="mt-3 text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{registeredEmail}</span>.
            Open it to verify your account — it may take a minute or two to arrive.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't forget to check your <span className="font-medium">spam or junk</span> folder too.
          </p>

          {requestedCaRole && (
            <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 text-left">
              <p className="font-semibold mb-1">
                {requestedCaRole === "commissioner" ? "Commissioner" : "Agent"} application submitted ✓
              </p>
              <p>
                An admin will review your application after you confirm your email. You'll be able to post listings once approved.
              </p>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={() => { setAwaitingConfirmation(false); setMode("signin"); setPassword(""); }}>
              Back to sign in
            </Button>
            <p className="text-sm text-muted-foreground">
              Wrong email?{" "}
              <button className="font-medium text-primary hover:underline" onClick={() => { setAwaitingConfirmation(false); setMode("signup"); setPassword(""); }}>
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background site-page">
      <div className="flex min-h-screen">
        {/* Left photo */}
        <div className="relative hidden flex-1 md:block">
          {!heroHidden && (
            <img
              src={heroSrc} alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => { if (heroSrc === HERO_AUTH_JPG) setHeroSrc(HERO_AUTH_PNG); else setHeroHidden(true); }}
            />
          )}
          {heroHidden && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />}
        </div>

        {/* Right: form */}
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 md:w-[480px] md:shrink-0 lg:w-[520px] lg:px-16 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3">
            <img src={BRAND_ICON_URL} alt="" className="h-9 w-9 object-contain" />
            <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 800 }}>
              <span className="text-foreground">ONE HIGALA</span>{" "}
              <span className="font-medium text-muted-foreground" style={{ fontWeight: 500 }}>PROPERTIES INC.</span>
            </span>
          </Link>

          <h1 className="mt-10 font-display text-2xl font-semibold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to manage your listings and sales."
              : "Join One Higala Properties Inc. in less than a minute."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* ── Base fields ── */}
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {/* ── C/A request toggle ── */}
            {mode === "signup" && (
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={requestRole}
                  onChange={(e) => setRequestRole(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  Apply for Commissioner or Agent access — an admin will review and approve before you can post listings.
                </span>
              </label>
            )}

            {/* ── C/A extra fields (only when checked) ── */}
            {mode === "signup" && requestRole && (
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Which role are you applying for?</p>
                  <div className="flex gap-2">
                    <RoleChoice active={caRole === "commissioner"} onClick={() => setCaRole("commissioner")}>Commissioner</RoleChoice>
                    <RoleChoice active={caRole === "agent"}        onClick={() => setCaRole("agent")}>Agent</RoleChoice>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Phone number</Label>
                    <Input
                      type="tel"
                      required={requestRole}
                      value={caPhone}
                      onChange={(e) => setCaPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <Label>Contact email</Label>
                    <Input
                      type="email"
                      required={requestRole}
                      value={caEmail}
                      onChange={(e) => setCaEmail(e.target.value)}
                      placeholder="Same or different from login email"
                    />
                  </div>
                </div>

                <div>
                  <Label>
                    Why do you want to become {caRole === "commissioner" ? "a Commissioner" : "an Agent"}?
                  </Label>
                  <textarea
                    required={requestRole}
                    rows={4}
                    className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={caReason}
                    onChange={(e) => setCaReason(e.target.value)}
                    placeholder={
                      caRole === "commissioner"
                        ? "Share your real estate experience, PRC license number if applicable, and what you're hoping to do on the platform…"
                        : "Tell us about your experience as an agent, the properties you handle, and why you'd like to list on One Higala…"
                    }
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Sign in instead"}
            </button>
          </p>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        </div>
      </div>
    </div>
  );
}
