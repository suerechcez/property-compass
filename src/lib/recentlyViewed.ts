/**
 * Tracks recently-viewed property listings in the browser's own storage —
 * no login required, no server round trip. Zillow-style "You recently
 * viewed" behavior: most-recent-first, capped at a small count, de-duped
 * so revisiting a listing just bumps it back to the front.
 */

const STORAGE_KEY = "one-higala-recently-viewed";
const MAX_ENTRIES = 12;

export function recordRecentlyViewed(propertyId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewedIds();
    const next = [propertyId, ...existing.filter((id) => id !== propertyId)].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private browsing, blocked, etc.) — fail silently.
  }
}

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
