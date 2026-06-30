import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Nav() {
  const { user, isCommissioner, isDeveloper } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-display text-lg font-semibold">
            1
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            1HP Portal
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/" className="text-foreground/70 hover:text-foreground">Browse</Link>
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
          {isDeveloper && (
            <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-gold-foreground">
              Developer
            </span>
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
