import { useEffect, useRef, useState } from "react";
import { loadLeaflet } from "@/lib/leaflet";
import { Loader2, MapPin } from "lucide-react";

// Cagayan de Oro City — same default center used by LocationPicker, shown
// when nothing in the current results has a pin yet.
const DEFAULT_CENTER: [number, number] = [8.4822, 124.6472];
const DEFAULT_ZOOM = 12;

const STREET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export type MapProperty = {
  id: string;
  title: string;
  price: number;
  for_rent: boolean;
  latitude: number;
  longitude: number;
  images: string[] | null;
};

/** ₱1.2M / ₱875K / ₱950 — abbreviated so the pin label stays pill-sized. */
function formatPin(n: number): string {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `₱${Math.round(n / 1_000)}K`;
  return `₱${n}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** Cheap signature of the pinned set — lets the marker-rebuild effect skip
 *  work when `properties` is a fresh array reference (re-filtered every
 *  Browse render) but the actual pinned listings haven't changed, so
 *  hovering a card doesn't reset the map's pan/zoom. */
function signatureOf(properties: MapProperty[]): string {
  return properties.map((p) => `${p.id}:${p.latitude}:${p.longitude}:${p.price}`).join("|");
}

// Price pins are always rendered in red — filled red when highlighted
// (hovered card / hovered pin), outlined red on white otherwise — so
// listing prices read clearly against the map at a glance.
const PIN_RED = "#DC2626";

function pinIcon(L: any, label: string, highlighted: boolean) {
  const bg = highlighted ? PIN_RED : "#fff";
  const fg = highlighted ? "#fff" : PIN_RED;
  const border = PIN_RED;
  // iconSize/iconAnchor left at [0,0] and centering done via the inline
  // transform instead — Leaflet's own anchor math assumes a fixed-size
  // icon, but this pill's width varies with the price label.
  return L.divIcon({
    className: "",
    html: `<div style="
      transform: translate(-50%, -100%);
      display: inline-flex;
      align-items: center;
      padding: 5px 9px;
      border-radius: 999px;
      background: ${bg};
      color: ${fg};
      border: 1.5px solid ${border};
      box-shadow: 0 2px 6px rgba(0,0,0,0.18);
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
      cursor: pointer;
    ">${escapeHtml(label)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Zillow-style results map for the Browse page — a pill-shaped price pin
 * for every currently-filtered listing that has a lat/lng, synced with
 * hover state from the card list beside it (see browse.tsx): hovering a
 * card highlights its pin and vice versa. Listings without a pin yet
 * (posted before LocationPicker was required) simply don't get a marker;
 * they're still fully browsable via the card list.
 */
export function BrowseMap({
  properties,
  hoveredId,
  onHoverMarker,
}: {
  properties: MapProperty[];
  hoveredId: string | null;
  onHoverMarker: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const signatureRef = useRef<string>("");
  const hoveredIdRef = useRef(hoveredId);
  hoveredIdRef.current = hoveredId;
  const onHoverMarkerRef = useRef(onHoverMarker);
  onHoverMarkerRef.current = onHoverMarker;

  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Mount the map once. attributionControl disabled to match the app's
  // existing Leaflet convention (see LocationPicker.tsx).
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(containerRef.current, { attributionControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer(STREET_TILE_URL, { attribution: "", maxZoom: 19 }).addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setLoadFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Rebuild markers only when the pinned set actually changes (see
  // signatureOf above) — keeps the visitor's current pan/zoom intact
  // while they filter or hover cards elsewhere on the page.
  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    const sig = signatureOf(properties);
    if (sig === signatureRef.current) return;
    signatureRef.current = sig;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const p of properties) {
      const label = formatPin(p.price) + (p.for_rent ? "/mo" : "");
      const marker = L.marker([p.latitude, p.longitude], {
        icon: pinIcon(L, label, p.id === hoveredIdRef.current),
      }).addTo(map);
      marker.__label = label;

      const thumb = p.images?.[0];
      // Preview popup — a bigger photo across the top, then the listing
      // name, then the price below it (in that order), so clicking a
      // price pin gives a proper at-a-glance preview instead of a small
      // side-by-side thumbnail.
      marker.bindPopup(
        `<a href="/properties/${p.id}" style="display:block;width:220px;text-decoration:none;color:inherit;">
          ${thumb
            ? `<img src="${escapeHtml(thumb)}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;display:block;" />`
            : `<div style="width:100%;height:140px;border-radius:8px;background:#f1f1f1;"></div>`}
          <div style="padding-top:8px;">
            <span style="display:block;font-weight:700;font-size:14px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.title)}</span>
            <span style="display:block;font-weight:700;font-size:15px;color:${PIN_RED};margin-top:2px;">${formatPin(p.price)}${p.for_rent ? "/mo" : ""}</span>
          </div>
        </a>`,
        { closeButton: true, maxWidth: 240, minWidth: 220 }
      );

      marker.on("mouseover", () => onHoverMarkerRef.current(p.id));
      marker.on("mouseout", () => onHoverMarkerRef.current(null));
      marker.on("click", () => onHoverMarkerRef.current(p.id));

      markersRef.current.set(p.id, marker);
    }

    if (properties.length > 0) {
      const bounds = L.latLngBounds(properties.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [ready, properties]);

  // Re-skins markers (bigger/filled vs. plain) as hoveredId changes,
  // without touching the marker set itself — this is what makes hovering
  // a card in the list highlight the matching pin, and vice versa.
  useEffect(() => {
    if (!leafletRef.current) return;
    const L = leafletRef.current;
    markersRef.current.forEach((marker, id) => {
      const highlighted = id === hoveredId;
      marker.setIcon(pinIcon(L, marker.__label ?? "", highlighted));
      marker.setZIndexOffset(highlighted ? 1000 : 0);
    });
  }, [hoveredId]);

  const pinnedCount = properties.length;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-muted" />

      {!ready && !loadFailed && (
        <div className="absolute inset-0 grid place-items-center bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {loadFailed && (
        <div className="absolute inset-0 grid place-items-center bg-muted p-6 text-center text-sm text-muted-foreground">
          Couldn't load the map. Check your connection and try again.
        </div>
      )}

      {ready && (
        <div className="absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {pinnedCount} pinned {pinnedCount === 1 ? "listing" : "listings"}
        </div>
      )}
    </div>
  );
}
