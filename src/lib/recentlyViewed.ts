/**
 * @deprecated Use `@/lib/recently-viewed` instead — this file was created
 * before that module's existence was discovered and is a duplicate with an
 * incompatible API (no `viewedAt` timestamp, different function signatures).
 * Kept only as a thin re-export so nothing breaks if something already
 * imports from here; new code should import from `recently-viewed` directly.
 */
export { recordPropertyView as recordRecentlyViewed, getRecentlyViewedIds } from "./recently-viewed";
