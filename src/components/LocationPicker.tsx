import { useEffect, useRef, useState } from "react";
import { loadLeaflet, geocodeAddress, reverseGeocode } from "@/lib/leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2, X, Layers, Box } from "lucide-react";

// Cagayan de Oro City — the default center when no coordinates are set yet
// and the agent hasn't searched for an address.
const DEFAULT_CENTER: [number, number] = [8.4822, 124.6472];
const DEFAULT_ZOOM = 13;
const PINPOINT_ZOOM = 17;

const STREET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
// Esri's free World Imagery service — no API key required. Aerial/satellite
// photography rather than true extruded 3D geometry (that needs a paid
// tile provider like Google's Photorealistic 3D Tiles or Mapbox GL's
// building-extrusion styles), but it's what "3D view" means in practice for
// most real-estate map pickers: an oblique/aerial look at the actual site
// instead of a flat vector street map.
const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type ViewMode = "map" | "satellite";

/**
 * Interactive map letting a commissioner/agent pinpoint a listing's exact
 * location — click anywhere on the map (or drag the marker) to drop a pin,
 * optionally searching a typed address first to jump near the right spot.
 * The resulting lat/lng is precise, unlike the free-text `location` field
 * alone, and is what lets the property page show buyers exactly where the
 * place is instead of just the general neighborhood.
 */
export function LocationPicker({
  latitude, longitude, onChange, onAddressChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  // Optional — when provided, clicking/dragging the pin or searching an
  // address reverse-geocodes the dropped point and fills the caller's
  // free-text Location field automatically, so the agent doesn't have to
  // separately type the address after pinpointing it on the map.
  onAddressChange?: (address: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressChangeRef.current = onAddressChange;

  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reverse-geocodes a dropped point and hands the address to the caller.
  // Best-effort: a lookup failure (offline, rate-limited, no result for a
  // remote/undeveloped area) just leaves the Location field as it was
  // rather than blocking pin placement or showing an error, since the
  // precise pin itself is what actually matters for the listing.
  function fillAddress(lat: number, lng: number) {
    if (!onAddressChangeRef.current) return;
    reverseGeocode(lat, lng)
      .then((address) => { if (address) onAddressChangeRef.current?.(address); })
      .catch(() => {});
  }

  // Initialize the map once on mount. Intentionally NOT re-run when
  // latitude/longitude change afterward — the map shouldn't jump around
  // under the agent's cursor every time they click; see the effect below
  // for how existing coordinates are applied once, on load.
  useEffect(() => {
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const startCenter: [number, number] =
        latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER;
      const startZoom = latitude != null && longitude != null ? PINPOINT_ZOOM : DEFAULT_ZOOM;

      // attributionControl: false — deliberately omits Leaflet's default
      // bottom-corner "Leaflet | © OpenStreetMap contributors" watermark
      // overlay from the map UI. Both tile layers below are still created
      // with an empty `attribution` string to match (rather than leaving
      // OSM's/Esri's default text sitting unused in memory), so there's no
      // attribution control fighting to render text nobody asked to see.
      const map = L.map(containerRef.current, { attributionControl: false }).setView(startCenter, startZoom);

      streetLayerRef.current = L.tileLayer(STREET_TILE_URL, { attribution: "", maxZoom: 19 });
      satelliteLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, { attribution: "", maxZoom: 19 });
      streetLayerRef.current.addTo(map);

      function placeMarker(lat: number, lng: number, geocode: boolean) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current.getLatLng();
            onChangeRef.current(pos.lat, pos.lng);
            fillAddress(pos.lat, pos.lng);
          });
        }
        onChangeRef.current(lat, lng);
        if (geocode) fillAddress(lat, lng);
      }

      // false: don't re-geocode coordinates the listing already had on
      // load (editing an existing listing) — only newly-dropped/moved
      // pins should overwrite the Location field.
      if (latitude != null && longitude != null) placeMarker(latitude, longitude, false);

      map.on("click", (e: any) => placeMarker(e.latlng.lat, e.latlng.lng, true));

      mapRef.current = map;
      setReady(true);
    }).catch(() => setSearchError("Couldn't load the map. Check your connection and try again."));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swaps the active tile layer when the Map/3D toggle changes. Both
  // layers stay created (see the mount effect above) so switching back
  // and forth doesn't re-fetch/re-create anything — just add the wanted
  // one and remove the other from the same map instance.
  function switchView(mode: ViewMode) {
    setViewMode(mode);
    const map = mapRef.current;
    if (!map) return;
    const wanted = mode === "satellite" ? satelliteLayerRef.current : streetLayerRef.current;
    const other = mode === "satellite" ? streetLayerRef.current : satelliteLayerRef.current;
    if (other && map.hasLayer(other)) map.removeLayer(other);
    if (wanted && !map.hasLayer(wanted)) wanted.addTo(map);
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await geocodeAddress(searchQuery.trim());
      if (!result) {
        setSearchError("Couldn't find that address — try a nearby landmark, or click directly on the map instead.");
        return;
      }
      const L = window.L;
      mapRef.current?.setView([result.lat, result.lng], PINPOINT_ZOOM);
      if (markerRef.current) {
        markerRef.current.setLatLng([result.lat, result.lng]);
      } else if (mapRef.current && L) {
        markerRef.current = L.marker([result.lat, result.lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng();
          onChangeRef.current(pos.lat, pos.lng);
          fillAddress(pos.lat, pos.lng);
        });
      }
      onChangeRef.current(result.lat, result.lng);
      // The search result already carries its own address (displayName)
      // — use that directly instead of a redundant reverse-geocode call.
      onAddressChangeRef.current?.(result.displayName);
    } catch {
      setSearchError("Search failed — please try again.");
    } finally {
      setSearching(false);
    }
  }

  const hasPin = latitude != null && longitude != null;

  return (
    <div>
      <Label>Pinpoint on map</Label>
      <p className="mt-1 text-sm text-muted-foreground">
        Search an address to jump nearby, then click exactly on the map (or drag the pin) to mark the precise spot buyers will see — the Location field above fills in automatically.
      </p>

      {/*
        Intentionally a plain <div>, NOT a <form> — this whole component
        is always rendered inside the listing form's own outer <form
        onSubmit={save}> (see listings.new.tsx). A <form> is not valid
        HTML nested inside another <form>, and in practice the "Search"
        button's click was being captured by the OUTER listing form
        instead of running geocodeAddress, so pressing it just submitted
        the whole page (a full navigation/refresh) instead of searching.
        Enter-to-search and the button's onClick below both call
        performSearch() directly, so no native form submission — and
        therefore no ambiguity about which form owns the button — is
        involved at all.
      */}
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                performSearch();
              }
            }}
            placeholder="Search an address or landmark…"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" disabled={searching || !searchQuery.trim()} onClick={performSearch}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>
      {searchError && <p className="mt-1.5 text-xs text-destructive">{searchError}</p>}

      <div className="relative mt-3 overflow-hidden rounded-xl border border-border">
        <div ref={containerRef} className="h-72 w-full bg-muted" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Map / 3D (satellite) toggle — a small pill sitting over the
            top-right corner of the map, in the same spot Leaflet's
            zoom control occupies on the opposite side, so it reads as
            part of the map chrome rather than a floating stray button. */}
        {ready && (
          <div className="absolute right-2 top-2 z-[500] flex overflow-hidden rounded-full border border-border bg-card/95 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => switchView("map")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "map" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />Map
            </button>
            <button
              type="button"
              onClick={() => switchView("satellite")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "satellite" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"
              }`}
            >
              <Box className="h-3.5 w-3.5" />3D
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        {hasPin ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Pin set — {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-destructive">
            <MapPin className="h-3.5 w-3.5" />No pin placed yet — click the map above
          </span>
        )}
        {hasPin && (
          <button
            type="button"
            onClick={() => {
              markerRef.current?.remove();
              markerRef.current = null;
              onChangeRef.current(NaN, NaN); // caller treats NaN/NaN as "cleared"; see listings.new.tsx
            }}
            className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />Clear pin
          </button>
        )}
      </div>

      {/* Live preview of the exact pinned spot — only appears once a pin
          exists, so the agent can visually double-check they dropped the
          pin on the right building/street before saving, instead of only
          trusting the raw lat/lng numbers above. Uses Google's legacy
          Street View embed URL (`output=svembed`), the same no-API-key
          trick already used for the read-only map on the property detail
          page (see PropertyMap in properties.$id.tsx) — no Maps API key
          needed. Some locations (rural lots, undeveloped land) may not
          have Street View coverage; the iframe just shows Google's own
          "no imagery available" placeholder in that case rather than
          erroring, so it's safe to always render once a pin is placed. */}
      {hasPin && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />Preview at this pin
          </div>
          <div className="aspect-video w-full bg-muted">
            <iframe
              title="Street-level preview of the pinned location"
              src={`https://maps.google.com/maps?layer=c&cbll=${latitude},${longitude}&cbp=11,0,0,0,0&output=svembed`}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </div>
  );
}
