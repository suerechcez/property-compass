import { supabase } from "@/integrations/supabase/client";

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actorName: string;
};

const ACTION_LABELS: Record<string, string> = {
  role_granted: "Granted role",
  role_revoked: "Revoked role",
  listing_created: "Created listing",
  listing_deleted: "Deleted listing",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Fetches recent audit log entries with the actor's display name resolved.
 * Rows are produced entirely by database triggers (see the create_audit_log
 * migration) — role grants/revokes and listing creation/deletion are logged
 * automatically regardless of which part of the app performed them.
 */
export async function fetchAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = Array.from(new Set((data ?? []).map((d) => d.actor_id).filter(Boolean))) as string[];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (data ?? []).map((d) => ({
    ...d,
    actorName: d.actor_id ? nameMap.get(d.actor_id) ?? "Unknown user" : "System",
  }));
}
