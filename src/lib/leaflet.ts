/**
 * Loads Leaflet (an open-source map library, no API key required) from a
 * CDN the first time it's needed, and reuses the same promise for every
 * subsequent call — so multiple map components on a page (or React
 * re-renders / StrictMode double-invokes) never inject the script/CSS
 * twice or race each other.
 *
 * Leaflet is loaded via CDN rather than as an npm dependency so this
 * doesn't require touching package.json / the lockfile.
 */

declare global {
  interface Window {
    L?: typeof import("leaflet");
  }
}

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let leafletLoadPromise: Promise<typeof window.L> | null = null;

export function loadLeaflet(): Promise<NonNullable<typeof window.L>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only be loaded in the browser"));
  }
  if (window.L) return Promise.resolve(window.L);

  if (!leafletLoadPromise) {
    leafletLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = LEAFLET_CSS_URL;
        document.head.appendChild(link);
      }

      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.L));
        existingScript.addEventListener("error", () => reject(new Error("Failed to load map library")));
        return;
      }

      const script = document.createElement("script");
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Failed to load map library"));
      document.head.appendChild(script);
    });
  }

  return leafletLoadPromise as Promise<NonNullable<typeof window.L>>;
}

/**
 * Geocodes a free-text address into coordinates using OpenStreetMap's free
 * Nominatim API (no API key needed) — used to recenter the location picker
 * near a typed address before the agent fine-tunes the exact pin by hand.
 * Results are biased toward the Philippines since that's the platform's
 * service area.
 */
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), displayName: first.display_name };
}
