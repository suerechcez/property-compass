import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "developer" | "commissioner" | "agent" | "buyer" | "admin";

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  isDeveloper: boolean;
  isCommissioner: boolean;
  isAgent: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  // Track which user id we last fetched roles for so we never flip
  // rolesLoaded→false for the same user (avoids the false-negative redirect
  // on TOKEN_REFRESHED / duplicate INITIAL_SESSION events).
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id ?? null;

    // User signed out — clear roles immediately.
    if (!userId) {
      lastFetchedUserId.current = null;
      setRoles([]);
      setRolesLoaded(true);
      return;
    }

    // Same user as last fetch (e.g. TOKEN_REFRESHED) — roles are still valid,
    // don't reset rolesLoaded and don't re-fetch.
    if (userId === lastFetchedUserId.current) return;

    // New user id — fetch fresh roles.
    lastFetchedUserId.current = userId;
    setRolesLoaded(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        // Guard: ignore stale response if user changed while this was in-flight.
        if (userId !== lastFetchedUserId.current) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoaded(true);
      });
  }, [session?.user?.id]);

  const isCommissioner = rolesLoaded && roles.includes("commissioner");
  const isAgent = rolesLoaded && roles.includes("agent");
  const isAdmin = rolesLoaded && roles.includes("admin");

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    rolesLoaded,
    isDeveloper: rolesLoaded && roles.includes("developer"),
    isCommissioner,
    isAgent,
    isAdmin,
  };
}
