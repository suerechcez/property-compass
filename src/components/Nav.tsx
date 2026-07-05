import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Brand mark (the "1H" logo). Upload the icon to /public/brand-icon.png in the
// repo (e.g. via GitHub's "Add file" or Lovable's asset uploader) and it will
// appear automatically. Until then this falls back to a plain "H" monogram.
const BRAND_ICON_URL = "/brand-icon.png";

export function Nav() {
  const { user, isCommissioner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [iconOk, setIconOk] = useState(true);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          {iconOk ? (
            <img
              src={BRAND_ICON_URL}
              alt="One Higala Properties Inc."
              className="h-10 w-10 object-contain"
              onError={() => setIconOk(false)}
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-lg font-bold shadow-sm">
              H
            </span>
          )}
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
              One Higala Properties Inc.
            </span>
            <span className="hidden text-[11px] italic text-muted-foreground sm:block">
              Bringing you home, the higala way
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/" className="text-foreground/70 hover:text-foreground">Browse</Link>
          <Link to="/agents" className="text-foreground/70 hover:text-foreground">Agents</Link>
          {user && (
            <>
              <Link to="/dashboard" className="text-foreground/70 hover:text-foreground">Dashboard</Link>
              <Link to="/profile" className="text-foreground/70 hover:text-foreground">Profile</Link>
            </>
          )}
          {isCommissioner && (
            <Link to="/listings/new" className="text-foreground/70 hover:text-foreground">
              Post Property
            </Link>
          )}
          {isAdmin && (
            <Link to="/dashboard" className="font-semibold text-primary hover:text-primary/80">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" onClick={signOut} size="sm">Sign out</Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
