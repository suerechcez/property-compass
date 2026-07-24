import { useEffect, useRef, useState } from "react";
import { loadLeaflet, geocodeAddress } from "@/lib/leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2, X } from "lucide-react";

// Cagayan de Oro City — the default center when no coordinates are set yet
// and the agent hasn't searched for an address.
const DEFAULT_CENTER: [number, number] = [8.4822, 124.6472];
const DEFAULT_ZOOM = 13;
const PINPOINT_ZOOM = 17;

/**
 * Interactive map letting a commissioner/agent pinpoint a listing's exact
 * location — click anywhere on the map (or drag the marker) to drop a pin,
 * optionally searching a typed address first to jump near the right spot.
 * The resulting lat/lng is precise, unlike the free-text `location` field
 * alone, and is what lets the property page show buyers exactly where the
 * place is instead of just the general neighborhood.
 */
export function LocationPicker({
  latitude, longitude, onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

      const map = L.map(containerRef.current).setView(startCenter, startZoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      function placeMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current.getLatLng();
            onChangeRef.current(pos.lat, pos.lng);
          });
        }
        onChangeRef.current(lat, lng);
      }

      if (latitude != null && longitude != null) placeMarker(latitude, longitude);

      map.on("click", (e: any) => placeMarker(e.latlng.lat, e.latlng.lng));

      mapRef.current = map;
      setReady(true);
    }).catch(() => setSearchError("Couldn't load the map. Check your connection and try again."));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
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
        });
      }
      onChangeRef.current(result.lat, result.lng);
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
        Search an address to jump nearby, then click exactly on the map (or drag the pin) to mark the precise spot buyers will see.
      </p>

      <form className="mt-3 flex gap-2" onSubmit={handleSearch}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search an address or landmark…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={searching || !searchQuery.trim()}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>
      {searchError && <p className="mt-1.5 text-xs text-destructive">{searchError}</p>}

      <div className="relative mt-3 overflow-hidden rounded-xl border border-border">
        <div ref={containerRef} className="h-72 w-full bg-muted" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
    </div>
  );
}
