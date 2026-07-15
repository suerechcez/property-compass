import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "developer" | "commissioner" | "agent" | "buyer" | "admin";

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  /** True once getSession() has resolved — session may still be null (logged out). */
  loading: boolean;
  /** True once roles have been fetched for the current user (or confirmed no user). */
  rolesLoaded: boolean;
  /**
   * The single flag to gate on. True only when BOTH the session check AND the
   * roles fetch have completed. Use this instead of checking loading + rolesLoaded
   * separately to avoid any window where both appear settled but roles are stale.
   */
  authReady: boolean;
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

    // No user — clear roles but only mark rolesLoaded after the session check
    // itself has finished (loading=false). This prevents the brief window where
    // session=null + rolesLoaded=true fires before getSession() resolves with
    // the actual logged-in session.
    if (!userId) {
      // If we were previously tracking a user, clear them now.
      if (lastFetchedUserId.current !== null) {
        lastFetchedUserId.current = null;
        setRoles([]);
      }
      // Only mark roles as "loaded" (empty) once we actually know there's no
      // session — i.e. after the initial session check completes.
      if (!loading) {
        setRolesLoaded(true);
      }
      return;
    }

    // Same user — roles already fetched, nothing to do.
    if (userId === lastFetchedUserId.current) return;

    // New user — fetch roles fresh.
    lastFetchedUserId.current = userId;
    setRolesLoaded(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (userId !== lastFetchedUserId.current) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoaded(true);
      });
  }, [session?.user?.id, loading]);

  const isCommissioner = rolesLoaded && roles.includes("commissioner");
  const isAgent = rolesLoaded && roles.includes("agent");
  const isAdmin = rolesLoaded && roles.includes("admin");

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    rolesLoaded,
    // authReady is the single safe flag: session check done AND roles settled.
    authReady: !loading && rolesLoaded,
    isDeveloper: rolesLoaded && roles.includes("developer"),
    isCommissioner,
    isAgent,
    isAdmin,
  };
}
