import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings, ShieldCheck, LayoutDashboard, Building2, Wallet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Brand mark (the "1H" logo), stored at /public/brand-icon.png.
const BRAND_ICON_URL = "/brand-icon.png";

const NAV_LINK_CLASS = "text-foreground hover:text-primary";

export function Nav() {
  const { user, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [iconOk, setIconOk] = useState(true);
  const canManageListings = isCommissioner || isAgent;

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["nav-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const initial = (profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5 sm:px-10">
        {/* Left nav group — all primary links live here now */}
        <nav className="hidden items-center gap-6 text-base font-medium md:flex">
          <Link to="/browse" className={NAV_LINK_CLASS}>Buy</Link>
          <Link to="/browse" search={{ filter: "rent" }} className={NAV_LINK_CLASS}>Rent</Link>
          <Link to="/sell" className={NAV_LINK_CLASS}>Sell</Link>
          <Link to="/agents" className={NAV_LINK_CLASS}>Find an agent</Link>
        </nav>

        {/* Centered brand — clicking it goes home */}
        <Link to="/" className="col-start-2 flex items-center justify-center gap-3 justify-self-center">
          {iconOk ? (
            <img
              src={BRAND_ICON_URL}
              alt="One Higala Properties Inc."
              className="h-12 w-12 object-contain"
              onError={() => setIconOk(false)}
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display text-xl font-bold shadow-sm">
              H
            </span>
          )}
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              One Higala Properties Inc.
            </span>
            <span className="text-xs italic text-muted-foreground">
              Bringing you home, the higala way
            </span>
          </span>
        </Link>

        {/* Right side — just profile/sign-in now */}
        <div className="col-start-3 flex items-center justify-end">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-12 w-12 border border-border">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Profile"} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display text-lg font-semibold text-primary-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name || user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" search={{ tab: "admin" }} className="cursor-pointer">
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" search={{ tab: "overview" }} className="cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                {canManageListings && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" search={{ tab: "listings" }} className="cursor-pointer">
                        <Building2 className="h-4 w-4" />
                        My listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" search={{ tab: "sales" }} className="cursor-pointer">
                        <Wallet className="h-4 w-4" />
                        Sales
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/listings/new" className="cursor-pointer">
                        <Plus className="h-4 w-4" />
                        Post Property
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
