import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings, ShieldCheck, LayoutDashboard, Building2, Wallet, Plus, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BrandTitle } from "@/components/BrandTitle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";

const BRAND_ICON_URL = "/brand-icon.png";
const NAV_LINK_CLASS = "text-foreground hover:text-primary";

export function Nav({ overlay = false }: { overlay?: boolean }) {
  const { user, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [iconOk, setIconOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const canManageListings = isCommissioner || isAgent;

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

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
  const mobileTransparent = overlay && !scrolled;

  return (
    <header
      className={[
        "z-40 w-full transition-all duration-300",
        overlay
          ? scrolled
            ? "fixed top-0 border-b border-border/60 bg-background/95 backdrop-blur"
            : "absolute top-0 bg-transparent"
          : "sticky top-0 border-b border-border/60 bg-background/85 backdrop-blur",
        "md:sticky md:border-b md:border-border/60 md:bg-background/85 md:backdrop-blur md:top-0",
      ].join(" ")}
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-10">

        {/* Left — hamburger (mobile) / nav links (desktop) */}
        <div className="flex items-center">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className={[
                  "grid h-10 w-10 place-items-center rounded-full transition md:hidden",
                  mobileTransparent ? "text-white" : "text-foreground",
                ].join(" ")}
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>

            <SheetContent side="left" hideClose className="w-full max-w-xs p-0">
              {/* Drawer header — logo + name centered, close button pinned right */}
              <div className="relative flex items-center justify-center border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <img src={BRAND_ICON_URL} alt="One Higala" className="h-8 w-8 object-contain" onError={() => {}} />
                  <span
                    className="text-base font-extrabold tracking-tight text-primary"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    ONE HIGALA
                  </span>
                </div>
                <SheetClose asChild>
                  <button
                    aria-label="Close menu"
                    className="absolute right-3 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>

              {/* Nav links */}
              <nav className="divide-y divide-border">
                <SheetClose asChild>
                  <Link to="/browse" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">
                    Browse
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/sell" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">
                    Sell
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/agents" className="flex items-center px-5 py-4 text-base font-medium text-foreground hover:bg-accent">
                    Find an agent
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-6 text-base font-medium md:flex">
            <Link to="/browse" className={NAV_LINK_CLASS}>Browse</Link>
            <Link to="/sell"   className={NAV_LINK_CLASS}>Sell</Link>
            <Link to="/agents" className={NAV_LINK_CLASS}>Find an agent</Link>
          </nav>
        </div>

        {/* Center — brand */}
        <Link to="/" className="col-start-2 flex items-center justify-center gap-3 justify-self-center">
          {iconOk ? (
            <img
              src={BRAND_ICON_URL}
              alt="One Higala Properties Inc."
              className="h-12 w-12 object-contain"
              onError={() => setIconOk(false)}
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-display text-xl font-bold text-primary-foreground shadow-sm">
              H
            </span>
          )}
          <div className="hidden items-center sm:flex">
            <BrandTitle light={false} className="items-center text-center" />
          </div>
        </Link>

        {/* Right — profile / sign-in */}
        <div className="col-start-3 flex items-center justify-end">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className={[
                    "border",
                    mobileTransparent ? "h-9 w-9 border-white/60" : "h-10 w-10 border-border md:h-12 md:w-12",
                  ].join(" ")}>
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Profile"} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" search={{ tab: "admin" }} className="cursor-pointer">
                      <ShieldCheck className="h-4 w-4" />Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                {canManageListings && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" search={{ tab: "overview" }} className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" search={{ tab: "listings" }} className="cursor-pointer">
                        <Building2 className="h-4 w-4" />My listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" search={{ tab: "sales" }} className="cursor-pointer">
                        <Wallet className="h-4 w-4" />Sales
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/listings/new" className="cursor-pointer">
                        <Plus className="h-4 w-4" />Post Property
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Settings className="h-4 w-4" />Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            mobileTransparent
              ? <Link to="/auth" className="text-sm font-semibold text-white md:hidden">Sign in</Link>
              : null
          )}
          {!user && (
            <Button asChild size="sm" className={mobileTransparent ? "hidden md:inline-flex" : ""}>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
