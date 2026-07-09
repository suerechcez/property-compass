import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings, ShieldCheck, LayoutDashboard, Building2, Wallet, Plus, Menu } from "lucide-react";
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
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

// Brand mark (the "1H" logo), stored at /public/brand-icon.png.
const BRAND_ICON_URL = "/brand-icon.png";

const NAV_LINK_CLASS = "text-foreground hover:text-primary";

const MOBILE_LINKS = [
  { to: "/browse", label: "Browse" },
  { to: "/browse", search: { filter: "sale" as const }, label: "Buy" },
  { to: "/browse", search: { filter: "rent" as const }, label: "Rent" },
  { to: "/sell", label: "Sell" },
  { to: "/agents", label: "Find an agent" },
];

/**
 * `overlay` — when true, the header floats transparently on top of the
 * page's own hero image on mobile only (matching the Zillow mobile
 * reference: hamburger + logo + "Sign in", all white, no background,
 * hero photo running full-bleed behind it). Desktop is unaffected either
 * way — always the normal solid bar with full nav links.
 *
 * Pages using this must render <Nav overlay /> as the first element inside
 * a `relative` hero section (see routes/index.tsx) so the header's
 * `absolute` positioning sits over the photo instead of pushing it down.
 */
export function Nav({ overlay = false }: { overlay?: boolean }) {
  const { user, isCommissioner, isAgent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [iconOk, setIconOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40 bg-transparent md:sticky md:border-b md:border-border/60 md:bg-background/85 md:backdrop-blur"
          : "sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur"
      }
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5 sm:px-10">
        {/* Left — hamburger on mobile, full link row on desktop */}
        <div className="flex items-center">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className={
                  overlay
                    ? "grid h-10 w-10 place-items-center rounded-full text-white md:hidden"
                    : "grid h-10 w-10 place-items-center rounded-full text-foreground md:hidden"
                }
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display">One Higala Properties Inc.</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 text-base font-medium">
                {MOBILE_LINKS.map((l) => (
                  <SheetClose asChild key={l.label}>
                    <Link
                      to={l.to}
                      search={"search" in l ? l.search : undefined}
                      className="rounded-lg px-3 py-2.5 text-foreground hover:bg-accent"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              {!user && (
                <div className="mt-6 border-t border-border pt-6">
                  <SheetClose asChild>
                    <Button asChild className="w-full"><Link to="/auth">Sign in</Link></Button>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <nav className="hidden items-center gap-6 text-base font-medium md:flex">
            {/* Invisible spacer — keeps "Buy" sitting where it did back when
                "Browse" was still the first link, without showing the text. */}
            <span aria-hidden="true" className="invisible select-none">Browse</span>
            <Link to="/browse" className={NAV_LINK_CLASS}>Buy</Link>
            <Link to="/browse" search={{ filter: "rent" }} className={NAV_LINK_CLASS}>Rent</Link>
            <Link to="/sell" className={NAV_LINK_CLASS}>Sell</Link>
            <Link to="/agents" className={NAV_LINK_CLASS}>Find an agent</Link>
          </nav>
        </div>

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
          <span className="hidden flex-col items-center text-center leading-tight sm:flex">
            <span className={`text-xl tracking-tight sm:text-2xl ${overlay ? "text-white md:text-foreground" : ""}`}>
              <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 800 }}>ONE HIGALA</span>
              <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 500 }}> PROPERTIES INC.</span>
            </span>
            <span className="text-base sm:text-lg">
              <span
                className={overlay ? "text-white/90 md:text-primary" : "text-primary"}
                style={{ fontFamily: "var(--font-poppins)", fontWeight: 500 }}
              >
                Bringing You Home,{" "}
              </span>
              <span className="text-gold" style={{ fontFamily: "var(--font-signature)", fontSize: "1.4em", lineHeight: 1 }}>the Higala Way.</span>
            </span>
          </span>
        </Link>

        {/* Right side — profile/sign-in */}
        <div className="col-start-3 flex items-center justify-end">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className={overlay ? "h-10 w-10 border-2 border-white md:h-12 md:w-12 md:border md:border-border" : "h-12 w-12 border border-border"}>
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
          ) : overlay ? (
            <Link to="/auth" className="text-base font-medium text-white md:hidden">Sign in</Link>
          ) : null}
          {!user && (
            <Button asChild size="sm" className={overlay ? "hidden md:inline-flex" : ""}>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
