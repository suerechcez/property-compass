import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Nav() {
  const { user, isCommissioner } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-lg font-bold shadow-sm">
            1H
          </span>
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
          <Link to="/updates" className="text-foreground/70 hover:text-foreground">Updates</Link>
          {user && (
            <Link to="/dashboard" className="text-foreground/70 hover:text-foreground">
              Dashboard
            </Link>
          )}
          {isCommissioner && (
            <Link to="/listings/new" className="text-foreground/70 hover:text-foreground">
              Post Property
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
