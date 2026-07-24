import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { typeLabel, formatPrice, type ImageSection } from "@/lib/property-types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Phone, Mail, Star, Heart, MessageSquare, ChevronLeft, ChevronRight, X, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite, fetchFavoriteIds } from "@/lib/favorites";
import { startConversation } from "@/lib/messages";
import { recordPropertyView, getRecentlyViewedIds } from "@/lib/recently-viewed";

export const Route = createFileRoute("/properties/$id")({
  head: () => ({
    meta: [
      { title: "Property · One Higala Properties Inc." },
      { name: "description", content: "View this property listing with One Higala Properties Inc." },
    ],
  }),
  component: PropertyDetail,
});

/** Small, grey, Zillow-style label used for card headings in the right rail
 *  (Mortgage calculator, Listed by, etc.) — deliberately much quieter than
 *  the bold black headings in the main content column, matching how
 *  Zillow visually de-emphasizes its sidebar card titles. */
const ASIDE_TITLE_CLASS = "text-sm font-semibold text-muted-foreground";

/**
 * Falls back to a single synthetic "Photos" section built from the legacy
 * flat `images` column when a listing has no image_sections yet (created
 * before this feature existed), so older listings still render a gallery
 * instead of nothing.
 */
function resolveSections(images: string[], sections: ImageSection[] | null | undefined): ImageSection[] {
  if (sections && sections.length > 0) return sections;
  if (images.length > 0) return [{ label: "Photos", images }];
  return [];
}

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isDeveloper, isAdmin } = useAuth();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!property) return null;

      const { data: agent } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, title, phone, email")
        .eq("id", property.commissioner_id)
        .maybeSingle();

      return { ...property, agent };
    },
  });

  const { data: favoriteIds = new Set<string>() } = useQuery({
    enabled: !!user,
    queryKey: ["favorite-ids"],
    queryFn: fetchFavoriteIds,
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ isFav }: { isFav: boolean }) => toggleFavorite(id, isFav),
    onSuccess: (_, { isFav }) => {
      qc.invalidateQueries({ queryKey: ["favorite-ids"] });
      qc.invalidateQueries({ queryKey: ["favorites-page"] });
      toast.success(isFav ? "Removed from favorites" : "Saved to favorites");
    },
    onError: () => toast.error("Failed to update favorites"),
  });

  function handleHeart() {
    if (!user) { navigate({ to: "/favorites" }); return; }
    favoriteMutation.mutate({ isFav: favoriteIds.has(id) });
  }

  const toggleFeatured = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from("properties").update({ is_featured: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "Placed as a Featured Sale on your profile" : "Removed from Featured Sales");
      qc.invalidateQueries({ queryKey: ["properties", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  // Records this property in the visitor's local "recently viewed" history
  // (localStorage-based, no auth required) once the listing has actually
  // loaded successfully — so we never record a 404/invalid id.
  useEffect(() => {
    if (data?.id) recordPropertyView(data.id);
  }, [data?.id]);

  if (isLoading) {
    return (
      <div className="site-page"><Nav /><div className="mx-auto max-w-5xl px-6 py-12 text-muted-foreground">Loading…</div></div>
    );
  }
  if (!data) {
    return (
      <div className="site-page">
        <Nav />
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">Listing not found</h1>
          <Button asChild className="mt-6"><Link to="/browse">Back to listings</Link></Button>
        </div>
      </div>
    );
  }

  const canEdit = user && (user.id === data.commissioner_id || isDeveloper || isAdmin);
  const isOwnListing = user?.id === data.commissioner_id;
  const contactPhone = data.contact_phone || data.agent?.phone;
  const contactEmail = data.contact_email || data.agent?.email;
  const isFav = favoriteIds.has(id);

  const sections = resolveSections(data.images ?? [], data.image_sections as ImageSection[] | null);
  // Sourced straight from the legacy `images` column rather than flattening
  // `sections` — this is deliberate. The dedicated "main photo" saved from
  // the listing form is prepended to `images` (so images[0] is always the
  // cover), but it isn't necessarily part of any room section, so building
  // this list from the sections could silently drop it. Using `images`
  // directly guarantees the hero gallery below always starts with the same
  // cover photo shown on the Browse card for this listing, and includes
  // every photo regardless of whether it's grouped into a room or not.
  const flatImages: string[] = data.images ?? [];

  return (
    <div className="min-h-screen site-page">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← Back to listings</Link>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{typeLabel(data.property_type)}</span>
              {data.for_rent && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">For Rent</span>}
              <span className="rounded-full border border-border px-2 py-0.5 capitalize">{data.status}</span>
              {data.is_featured && (
                <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">
                  <Star className="h-3 w-3 fill-current" /> Featured Sale
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{data.title}</h1>
            <p className="mt-2 text-muted-foreground">{data.location ?? "Location not set"}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-semibold text-primary">
              {formatPrice(data.price)}
              {data.for_rent && <span className="text-lg text-muted-foreground"> /mo</span>}
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {/* Heart / favorite button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleHeart}
                className={isFav ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                {isFav ? "Saved" : "Save"}
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant={data.is_featured ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFeatured.mutate(!data.is_featured)}
                    disabled={toggleFeatured.isPending}
                  >
                    <Star className={`h-4 w-4 ${data.is_featured ? "fill-current" : ""}`} />
                    {data.is_featured ? "Remove from Featured Sales" : "Place as Featured Sale"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: "/listings/$id/edit", params: { id: data.id } })}>
                    Edit listing
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main two-column layout: photos + facts on the left, a sticky
            right rail (map, calculator, listed-by) beside them from the
            very top — rather than the rail only starting after the whole
            gallery + facts section, which pushed it far down the page
            and left the gallery looking like the only thing on the page. */}
        <div className="mt-8 grid gap-10 md:grid-cols-3 md:items-start">
          <div className="min-w-0 md:col-span-2">
            {/* Hero gallery — the main photo (same one used as the cover
                on Browse cards) shown big at the top, with prev/next
                arrows and a thumbnail strip when there's more than one
                photo, Zillow-style. This is always the first thing shown,
                regardless of whether the listing also uses room-grouped
                sections below. */}
            <HeroGallery images={flatImages} title={data.title} onOpenPhoto={setLightboxIndex} />

            {/* Room-by-room breakdown — only shown when the listing
                actually uses more than one named section; with just one
                section (or the legacy single "Photos" fallback) every
                photo is already visible in the hero gallery above, so
                repeating them here would just be a duplicate of the same
                photos. Section indices are offset to match their position
                in the flattened `images` list (cover photo is always
                index 0), so the lightbox's prev/next still lines up. */}
            {sections.length > 1 && (
              <div className="mt-10">
                <SectionedGallery sections={sections} title={data.title} allImages={flatImages} onOpenPhoto={setLightboxIndex} />
              </div>
            )}

            <h2 className="mt-10 font-display text-2xl font-semibold">About this property</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">
              {data.description || "No description provided yet."}
            </p>

            <FactsAndFeatures data={data} />
          </div>

          {/* Sticky right rail — stays in view alongside the gallery/facts
              as the visitor scrolls, instead of only appearing once
              they've scrolled all the way past everything on the left. */}
          <div className="space-y-6 md:sticky md:top-24 md:self-start">
            {/* Map embed — driven off the free-text `location` field (no
                lat/lng columns exist yet), so it's a Maps *search* embed
                rather than a pinpoint marker. Good enough to orient a
                buyer to the neighborhood at a glance. */}
            <PropertyMap location={data.location} />

            {/* Mortgage calculator for sale listings; a simple total-cost
                estimator for rentals, since a mortgage calc doesn't apply
                to renting. */}
            {data.for_rent
              ? <RentCalculator rent={Number(data.price)} />
              : <MortgageCalculator price={Number(data.price)} />}

            <aside className="rounded-2xl border border-border bg-card p-6">
              <h3 className={ASIDE_TITLE_CLASS}>Listed by</h3>
              <Link
                to="/agents/$id"
                params={{ id: data.commissioner_id }}
                className="mt-3 flex items-center gap-3 rounded-lg -mx-2 p-2 transition hover:bg-accent"
              >
                <Avatar className="h-12 w-12 border border-border">
                  {data.agent?.avatar_url && <AvatarImage src={data.agent.avatar_url} alt={data.agent.full_name ?? "Agent"} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
                    {(data.agent?.full_name ?? "A").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{data.agent?.full_name ?? "One Higala commissioner"}</p>
                  {data.agent?.title && <p className="truncate text-xs text-muted-foreground">{data.agent.title}</p>}
                </div>
              </Link>

              <div className="mt-4 space-y-2">
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="truncate">{contactPhone}</span>
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{contactEmail}</span>
                  </a>
                )}
                {!contactPhone && !contactEmail && (
                  <p className="text-sm text-muted-foreground">
                    No contact info provided yet — visit the agent's profile for more ways to reach them.
                  </p>
                )}
              </div>
            </aside>

            {/* Message the agent about this specific property */}
            {!isOwnListing && (
              <MessageAgentBox
                propertyId={data.id}
                commissionerId={data.commissioner_id}
                agentName={data.agent?.full_name ?? "the agent"}
                agentEmail={contactEmail}
                listingTitle={data.title}
              />
            )}
          </div>
        </div>

        {/* "You recently viewed" — Zillow-style engagement row, driven by
            localStorage view history rather than the DB, so it works for
            signed-out visitors too. */}
        <RecentlyViewed excludeId={id} />
      </div>

      {lightboxIndex !== null && flatImages.length > 0 && (
        <PhotoLightbox
          images={flatImages}
          title={data.title}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

/**
 * Zillow-style hero gallery shown at the very top of the property page.
 * Always leads with the cover photo (images[0]). With a single photo it's
 * just a static image; with more than one, hover/tap reveals prev/next
 * arrows over the photo plus a scrollable thumbnail strip underneath for
 * jumping straight to any photo. Clicking the big photo opens the full
 * lightbox at the currently-shown index.
 */
function HeroGallery({
  images, title, onOpenPhoto,
}: {
  images: string[];
  title: string;
  onOpenPhoto: (globalIndex: number) => void;
}) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[16/9] place-items-center rounded-2xl bg-surface font-display text-4xl text-muted-foreground">
        H
      </div>
    );
  }

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl bg-muted">
        <button onClick={() => onOpenPhoto(current)} className="block w-full" aria-label="View full-size photo">
          <img
            src={images[current]}
            alt={current === 0 ? `${title} — main photo` : `${title} — photo ${current + 1}`}
            className="aspect-[16/9] w-full object-cover"
          />
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              {current + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === current ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Room-by-room photo breakdown shown below the hero gallery — a heading
 * per section (Living Room, Kitchen, ...) followed by that section's
 * photos. Every photo's onClick passes its GLOBAL index within `allImages`
 * (the same flattened, cover-first list the hero gallery and lightbox use)
 * rather than its position within its own section, so opening a photo from
 * here lands the lightbox on the correct photo and prev/next still moves
 * seamlessly across section boundaries.
 */
function SectionedGallery({
  sections, title, allImages, onOpenPhoto,
}: {
  sections: ImageSection[];
  title: string;
  allImages: string[];
  onOpenPhoto: (globalIndex: number) => void;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section, si) => {
        const [cover, ...rest] = section.images;
        return (
          <div key={si} className={si > 0 ? "border-t border-border pt-8" : ""}>
            <h2 className="font-display text-lg font-bold">{section.label}</h2>
            {cover && (
              <button
                onClick={() => onOpenPhoto(Math.max(allImages.indexOf(cover), 0))}
                className="group mt-3 block w-full overflow-hidden rounded-xl"
              >
                <img
                  src={cover}
                  alt={`${title} — ${section.label} photo 1`}
                  className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </button>
            )}
            {rest.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {rest.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenPhoto(Math.max(allImages.indexOf(url), 0))}
                    className="group overflow-hidden rounded-lg"
                  >
                    <img
                      src={url}
                      alt={`${title} — ${section.label} photo ${i + 2}`}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full-screen photo viewer. Click any gallery tile to open it at that
 * photo's index; arrow keys / on-screen arrows / thumbnail strip all move
 * between photos, Escape or the backdrop closes it. Body scroll is locked
 * while open so the page behind it doesn't scroll along with keyboard
 * arrow presses.
 */
function PhotoLightbox({
  images, title, index, onClose, onNavigate,
}: {
  images: string[];
  title: string;
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, images.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo gallery`}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-white/70">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Close gallery" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((index - 1 + images.length) % images.length)}
            aria-label="Previous photo"
            className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img
          src={images[index]}
          alt={`${title} photo ${index + 1}`}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((index + 1) % images.length)}
            aria-label="Next photo"
            className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto p-4" onClick={(e) => e.stopPropagation()}>
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${
                i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Structured "Facts and features" section — replaces the old plain
 * description-only + tag-list "Highlights" with a proper labeled facts
 * grid (bedrooms, bathrooms, area, type, year built, lot size, listing
 * terms) plus a checklist of the listing's free-form features.
 */
function FactsAndFeatures({ data }: {
  data: {
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqm: number | string | null;
    property_type: string;
    year_built?: number | null;
    lot_size_sqm?: number | string | null;
    for_rent: boolean;
    features: string[];
  };
}) {
  const facts: { label: string; value: string }[] = [];
  if (data.bedrooms != null) facts.push({ label: "Bedrooms", value: String(data.bedrooms) });
  if (data.bathrooms != null) facts.push({ label: "Bathrooms", value: String(data.bathrooms) });
  if (data.area_sqm != null) facts.push({ label: "Interior area", value: `${data.area_sqm} m²` });
  facts.push({ label: "Property type", value: typeLabel(data.property_type) });
  if (data.year_built) facts.push({ label: "Year built", value: String(data.year_built) });
  if (data.lot_size_sqm != null) facts.push({ label: "Lot size", value: `${data.lot_size_sqm} m²` });
  facts.push({ label: "Listing terms", value: data.for_rent ? "For rent" : "For sale" });

  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl font-semibold">Facts and features</h2>

      <div className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex justify-between border-b border-border/70 py-2.5 text-sm">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="font-medium">{f.value}</dd>
          </div>
        ))}
      </div>

      {data.features?.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display text-lg font-semibold">Features</h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {data.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Map embed driven off the free-text `location` field. There's no lat/lng
 * stored for properties yet, so this uses Google Maps' query-based embed
 * (a location *search*, not a precise pinpoint) — enough to orient a buyer
 * to the neighborhood without needing a Maps API key or a geocoding step.
 */
function PropertyMap({ location }: { location: string | null }) {
  const query = encodeURIComponent(
    location ? `${location}, Cagayan de Oro City, Philippines` : "Cagayan de Oro City, Philippines"
  );
  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-video w-full bg-muted">
        <iframe
          title="Property location map"
          src={`https://www.google.com/maps?q=${query}&output=embed`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex items-start gap-2 p-4">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{location ?? "Location not set"}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${query}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on Google Maps →
          </a>
        </div>
      </div>
    </aside>
  );
}

const LOAN_TERM_OPTIONS = [15, 20, 30] as const;

/**
 * Standard amortization formula (principal & interest only — doesn't
 * factor in taxes/insurance, same convention Zillow's own calculator
 * uses for its headline number). Down payment / rate are sliders so
 * buyers can play with different scenarios without leaving the page.
 */
function MortgageCalculator({ price }: { price: number }) {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [termYears, setTermYears] = useState<(typeof LOAN_TERM_OPTIONS)[number]>(30);

  const downPayment = (price * downPaymentPct) / 100;
  const principal = Math.max(price - downPayment, 0);
  const monthlyRate = rate / 100 / 12;
  const numPayments = termYears * 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / numPayments
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

  return (
    <aside className="rounded-2xl border border-border bg-card p-6">
      <h3 className={ASIDE_TITLE_CLASS}>Mortgage calculator</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Estimate your monthly payment — for reference only, actual terms vary by lender.
      </p>

      <div className="mt-4 rounded-xl bg-surface p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Est. monthly payment</p>
        <p className="mt-1 font-display text-3xl font-bold text-primary">
          {formatPrice(monthlyPayment)}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Home price</span>
          <span className="text-muted-foreground">{formatPrice(price)}</span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="down-payment-slider" className="font-medium">Down payment</label>
            <span className="text-muted-foreground">{downPaymentPct}% · {formatPrice(downPayment)}</span>
          </div>
          <input
            id="down-payment-slider"
            type="range"
            min={0}
            max={90}
            step={1}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="rate-slider" className="font-medium">Interest rate</label>
            <span className="text-muted-foreground">{rate.toFixed(2)}%</span>
          </div>
          <input
            id="rate-slider"
            type="range"
            min={2}
            max={15}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div>
          <p className="font-medium">Loan term</p>
          <div className="mt-2 flex gap-2">
            {LOAN_TERM_OPTIONS.map((yrs) => (
              <button
                key={yrs}
                type="button"
                onClick={() => setTermYears(yrs)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  termYears === yrs ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {yrs} yrs
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Loan amount</span><span>{formatPrice(principal)}</span></div>
        <div className="flex justify-between">
          <span>Total paid over {termYears} yrs</span>
          <span>{formatPrice(monthlyPayment * numPayments + downPayment)}</span>
        </div>
      </div>
    </aside>
  );
}

/**
 * Simple total-monthly-cost estimator for rentals — a mortgage calculation
 * doesn't apply to renting, but buyers/renters still want to see rent plus
 * the usual extras (utilities, renter's insurance) added up at a glance.
 */
function RentCalculator({ rent }: { rent: number }) {
  const [utilities, setUtilities] = useState(3000);
  const [insurance, setInsurance] = useState(500);
  const total = rent + utilities + insurance;

  return (
    <aside className="rounded-2xl border border-border bg-card p-6">
      <h3 className={ASIDE_TITLE_CLASS}>Monthly cost estimator</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Estimate your total monthly cost including rent and typical extras.
      </p>

      <div className="mt-4 rounded-xl bg-surface p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Est. total monthly cost</p>
        <p className="mt-1 font-display text-3xl font-bold text-primary">
          {formatPrice(total)}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Rent</span>
          <span className="text-muted-foreground">{formatPrice(rent)}</span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="utilities-slider" className="font-medium">Est. utilities</label>
            <span className="text-muted-foreground">{formatPrice(utilities)}</span>
          </div>
          <input
            id="utilities-slider"
            type="range"
            min={0}
            max={10000}
            step={500}
            value={utilities}
            onChange={(e) => setUtilities(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="insurance-slider" className="font-medium">Renter's insurance</label>
            <span className="text-muted-foreground">{formatPrice(insurance)}</span>
          </div>
          <input
            id="insurance-slider"
            type="range"
            min={0}
            max={2000}
            step={100}
            value={insurance}
            onChange={(e) => setInsurance(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      </div>
    </aside>
  );
}

function MessageAgentBox({
  propertyId, commissionerId, agentName, agentEmail, listingTitle,
}: {
  propertyId: string;
  commissionerId: string;
  agentName: string;
  agentEmail?: string | null;
  listingTitle: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(`Hi, I'm interested in "${listingTitle}". Is it still available?`);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();

    if (user) {
      if (!message.trim()) { toast.error("Write a message before sending."); return; }
      setSending(true);
      try {
        const conversationId = await startConversation({
          buyerId: user.id,
          commissionerId,
          propertyId,
          body: message.trim(),
        });
        toast.success(`Message sent to ${agentName}`);
        navigate({ to: "/messages", search: { c: conversationId } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setSending(false);
      }
      return;
    }

    // Guest fallback
    if (!agentEmail) { toast.error("This agent hasn't listed a contact email yet."); return; }
    window.location.href = `mailto:${agentEmail}?subject=${encodeURIComponent(`Inquiry: ${listingTitle}`)}&body=${encodeURIComponent(message)}`;
    toast.success("Opening your email app…");
  }

  return (
    <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h3 className={`flex items-center gap-2 ${ASIDE_TITLE_CLASS}`}>
        {user && <MessageSquare className="h-3.5 w-3.5 text-primary" />}
        Message {agentName.split(" ")[0]}
      </h3>
      <form className="mt-3 space-y-3" onSubmit={send}>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Sending…" : user ? "Send message" : "Contact agent"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {user
            ? "Opens a conversation in your Messages inbox, tied to this listing."
            : (
              <>
                Opens your email app to reach out. <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to message in-app instead.
              </>
            )}
        </p>
      </form>
    </aside>
  );
}

/**
 * "You recently viewed" row — reads property ids out of the visitor's
 * localStorage view history (see src/lib/recently-viewed.ts), fetches
 * those properties, and renders them as a horizontally-scrollable strip
 * of small cards at the bottom of the page. Renders nothing at all if
 * there's no view history yet, or if none of those listings still exist.
 */
function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Read fresh on every render (cheap localStorage read) rather than
  // useState — this naturally picks up the parent's recordPropertyView
  // effect from the previous page visit without any extra plumbing.
  const ids = getRecentlyViewedIds(excludeId, 8);

  const { data: properties = [] } = useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, images, price, for_rent, location, bedrooms, bathrooms, area_sqm, property_type")
        .in("id", ids);
      if (error) throw error;
      // .in() doesn't preserve input order, so re-sort to match the
      // most-recently-viewed-first order from `ids`.
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      return ids.map((pid) => byId.get(pid)).filter((p): p is NonNullable<typeof p> => !!p);
    },
    enabled: ids.length > 0,
  });

  if (ids.length === 0 || properties.length === 0) return null;

  return (
    <div className="mt-16 border-t border-border pt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">You recently viewed</h2>
        <div className="flex gap-1.5">
          <button
            aria-label="Scroll left"
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {properties.map((p) => (
          <Link
            key={p.id}
            to="/properties/$id"
            params={{ id: p.id }}
            className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>}
            </div>
            <div className="p-3">
              <p className="font-display text-lg font-bold">
                {formatPrice(p.price)}
                {p.for_rent && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  p.bedrooms != null && `${p.bedrooms} bd`,
                  p.bathrooms != null && `${p.bathrooms} ba`,
                  p.area_sqm != null && `${p.area_sqm} m²`,
                ].filter(Boolean).join(" | ") || typeLabel(p.property_type)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.location ?? "Cagayan de Oro City"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
