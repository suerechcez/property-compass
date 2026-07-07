import { useEffect, useState } from "react";
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
    if (!session?.user) {
      setRoles([]);
      setRolesLoaded(true);
      return;
    }
    setRolesLoaded(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
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
