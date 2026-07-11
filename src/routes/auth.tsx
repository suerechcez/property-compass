import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · One Higala Properties Inc." },
      { name: "description", content: "Sign in or create your One Higala Properties Inc. account to list properties and track sales." },
    ],
  }),
  component: AuthPage,
});

// Brand mark, stored at /public/brand-icon.png (same file used in the top bar).
const BRAND_ICON_URL = "/brand-icon.png";

// Right-side photo. Upload the file to /public/hero-auth.jpg (or .png —
// either extension works, the <img> below tries .jpg first and falls back
// to .png automatically). Shown at full height on desktop only, matching
// the Zillow-style split layout; hidden on mobile to keep the form full-width there.
const HERO_AUTH_JPG = "/hero-auth.jpg";
const HERO_AUTH_PNG = "/hero-auth.png";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestCommissioner, setRequestCommissioner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [heroSrc, setHeroSrc] = useState(HERO_AUTH_JPG);
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user && requestCommissioner) {
          await supabase.from("commissioner_requests").insert({
            user_id: data.user.id,
            status: "pending",
          });
          toast.info("Commissioner request submitted for admin review.");
        }
        toast.success("Account created. Welcome to One Higala Properties Inc..");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
      navigate({ to: "/dashboard" });
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

  return (
    <div className="min-h-screen bg-background site-page">
      <div className="flex min-h-screen">
        {/* ── Left: logo + form, everything lives here ── */}
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 md:w-[440px] md:shrink-0 lg:w-[480px] lg:px-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={BRAND_ICON_URL} alt="" className="h-9 w-9 object-contain" />
            <span
              className="text-lg tracking-tight"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 800 }}
            >
              <span className="text-foreground">ONE HIGALA</span>{" "}
              <span className="font-medium text-muted-foreground" style={{ fontWeight: 500 }}>
                PROPERTIES INC.
              </span>
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
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
            {mode === "signup" && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={requestCommissioner}
                  onChange={(e) => setRequestCommissioner(e.target.checked)}
                  className="mt-1"
                />
                Request commissioner access — an admin will review and approve before you can post listings.
              </label>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in instead"}
            </button>
          </p>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>

        {/* ── Right: full-height photo, desktop only ── */}
        <div className="relative hidden flex-1 md:block">
          {!heroHidden && (
            <img
              src={heroSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                if (heroSrc === HERO_AUTH_JPG) setHeroSrc(HERO_AUTH_PNG);
                else setHeroHidden(true);
              }}
            />
          )}
          {heroHidden && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />}
        </div>
      </div>
    </div>
  );
}
