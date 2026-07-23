/**
 * Tracks recently-viewed property ids in localStorage — no auth or DB
 * table needed, so it works for anonymous visitors too (same approach
 * Zillow/Redfin use for their "recently viewed" rows). Each browser
 * just remembers its own view history client-side.
 */

const STORAGE_KEY = "ohp:recently-viewed";
const MAX_ENTRIES = 12;

type RecentlyViewedEntry = { id: string; viewedAt: number };

function readEntries(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentlyViewedEntry => typeof e?.id === "string" && typeof e?.viewedAt === "number"
    );
  } catch {
    return [];
  }
}

function writeEntries(entries: RecentlyViewedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage can be unavailable (private browsing, storage quota,
    // disabled cookies, etc.) — this is a nice-to-have feature, so fail
    // silently rather than breaking the page.
  }
}

/** Records that a property was just viewed, moving it to the front of the list. */
export function recordPropertyView(propertyId: string): void {
  const entries = readEntries().filter((e) => e.id !== propertyId);
  entries.unshift({ id: propertyId, viewedAt: Date.now() });
  writeEntries(entries.slice(0, MAX_ENTRIES));
}

/**
 * Returns recently-viewed property ids, most recent first. `excludeId` is
 * typically the property currently being viewed, so it doesn't show up in
 * its own "recently viewed" row.
 */
export function getRecentlyViewedIds(excludeId?: string, limit = 8): string[] {
  return readEntries()
    .filter((e) => e.id !== excludeId)
    .slice(0, limit)
    .map((e) => e.id);
}
