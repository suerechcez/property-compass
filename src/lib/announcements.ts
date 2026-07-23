import { supabase } from "@/integrations/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
};

/** Active announcements only — what commissioners/agents see in the topbar dropdown. */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** All announcements (active + archived) — for the admin management panel. */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(title: string, body: string, createdBy: string): Promise<void> {
  const { error } = await supabase.from("announcements").insert({ title, body, created_by: createdBy });
  if (error) throw error;
}

export async function setAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("announcements").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ── "Seen" tracking ───────────────────────────────────────────────────────────
// Kept client-side (localStorage) rather than a server table — announcements
// are a lightweight, low-stakes broadcast, and per-device "seen" state (like
// a browser reads a notice once) is enough here without adding another table
// + RLS surface for what's essentially a read marker.

const SEEN_KEY = "one-higala-seen-announcements";

function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getUnseenCount(announcements: Announcement[]): number {
  const seen = new Set(getSeenIds());
  return announcements.filter((a) => !seen.has(a.id)).length;
}

export function markAnnouncementsSeen(announcements: Announcement[]): void {
  if (typeof window === "undefined") return;
  try {
    const seen = new Set(getSeenIds());
    announcements.forEach((a) => seen.add(a.id));
    // Cap stored history so this doesn't grow unbounded over a long-lived browser profile.
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-200)));
  } catch {
    // ignore
  }
}
