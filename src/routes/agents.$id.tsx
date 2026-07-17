import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatPrice, typeLabel } from "@/lib/property-types";
import { toast } from "sonner";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Mail,
  Phone,
  Users,
  Star,
  Flag,
} from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Agent Profile — One Higala Properties Inc.` },
      { name: "description", content: `Agent profile, listings, and sales history for agent ${params.id}.` },
    ],
  }),
  component: AgentProfile,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-4xl p-10 text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl p-10">Agent not found.</div>
  ),
});

type Property = {
  id: string;
  title: string;
  price: number | string;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | string | null;
  images: string[];
  for_rent: boolean;
  status: string;
  property_type: string;
  is_featured: boolean;
  updated_at?: string;
  created_at: string;
};

type Review = {
  id: string;
  agent_id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
  reviewer?: { full_name: string | null; avatar_url: string | null } | null;
};

function AgentProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["agent-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, email, title, bio, years_experience, created_at, license_number, agency_name, specialties, languages, facebook_url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: roleRows = [] } = useQuery({
    queryKey: ["agent-roles", id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", id).in("role", ["commissioner", "agent"]);
      return data ?? [];
    },
  });
  const isAgent = roleRows.some((r) => r.role === "agent");
  const roleLabel = isAgent ? "Agent" : "Commissioner";

  const { data: sales = [] } = useQuery({
    queryKey: ["agent-sales", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, properties(id, title, property_type, location, images, bedrooms, bathrooms, area_sqm, status)")
        .eq("commissioner_id", id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["agent-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("commissioner_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });

  // Ratings-only query for the profile card summary.
  // Uses a DISTINCT key ("agent-review-ratings") so it never collides with
  // the full reviews query ("agent-reviews") used by ReviewsSection below.
  const { data: ratingRows = [] } = useQuery({
    queryKey: ["agent-review-ratings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_reviews")
        .select("rating")
        .eq("agent_id", id);
      if (error) throw error;
      return (data ?? []) as { rating: number }[];
    },
  });

  const sold     = useMemo(() => listings.filter((p) => p.status === "sold"), [listings]);
  const forSale  = useMemo(() => listings.filter((p) => p.status === "published" && !p.for_rent), [listings]);
  const forRent  = useMemo(() => listings.filter((p) => p.status === "published" && p.for_rent), [listings]);
  const featured = useMemo(() => listings.filter((p) => p.is_featured && p.status !== "sold"), [listings]);
  const galleryImages = useMemo(() => listings.flatMap((p) => p.images ?? []).slice(0, 10), [listings]);

  const stats = useMemo(() => {
    const prices = listings.map((p) => Number(p.price)).filter((n) => n > 0);
    const avgRating = ratingRows.length
      ? ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length
      : null;
    return {
      count: sales.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      reviewCount: ratingRows.length,
      avgRating,
    };
  }, [sales, listings, ratingRows]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: profile?.full_name ?? "Agent profile", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    }
  }

  if (isLoading || !profile) {
    return <div className="mx-auto max-w-6xl p-10 text-muted-foreground">Loading…</div>;
  }

  const isOwnProfile = user?.id === id;

  return (
    <div className="site-page">
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-muted-foreground">
            <Link to="/agents" className="hover:text-primary">Cagayan de Oro City</Link>
            {" · "}
            <span className="text-foreground">{profile.full_name ?? roleLabel}</span>
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Profile card */}
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid place-items-center bg-primary p-8">
                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border-4 border-white/20 bg-gradient-to-br from-primary-foreground/20 to-primary-foreground/5 font-display text-4xl font-bold text-primary-foreground shadow-lg">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.full_name ?? "Agent"} className="h-full w-full object-cover" />
                    : (profile.full_name ?? "A").slice(0, 1).toUpperCase()}
                </div>
              </div>

              <div className="flex flex-col items-center bg-card p-6 text-center">
                {profile.license_number && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />Licensed
                  </span>
                )}
                <h1 className="mt-2 font-display text-2xl font-bold">{profile.full_name ?? roleLabel}</h1>

                {stats.avgRating !== null && (
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(stats.avgRating!) ? "fill-yellow-400 text-yellow-400" : "fill-none text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{stats.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({stats.reviewCount} review{stats.reviewCount !== 1 ? "s" : ""})</span>
                  </div>
                )}

                <p className="mt-1.5 text-sm text-muted-foreground">{profile.title ?? roleLabel}</p>
                {profile.agency_name && <p className="mt-1 text-sm font-medium">{profile.agency_name}</p>}
                <p className="text-sm text-muted-foreground">One Higala {roleLabel}</p>

                <div className="mt-4 flex w-full justify-center gap-2">
                  <Button className="flex-1" onClick={() => document.getElementById("contact-agent")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Contact {roleLabel}
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Share profile" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {(profile.email || profile.phone) && (
                  <div className="mt-4 w-full space-y-1.5 border-t border-border pt-4 text-sm">
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                        <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{profile.email}</span>
                      </a>
                    )}
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                        <Phone className="h-3.5 w-3.5 shrink-0" />{profile.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Listing gallery */}
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {galleryImages.length > 0
                ? <ImageGallery images={galleryImages} />
                : <div className="grid h-full min-h-[280px] place-items-center font-display text-4xl text-muted-foreground">H</div>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
            <Stat label="Sales" value={String(stats.count)} />
            <Stat label="Listings" value={String(listings.length)} />
            <Stat label="Price range" value={stats.minPrice != null ? `${formatPrice(stats.minPrice)}–${formatPrice(stats.maxPrice!)}` : "—"} />
            <Stat label="Average price" value={stats.avgPrice ? formatPrice(stats.avgPrice) : "—"} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-12">
          <ListingCarousel title="Featured sales" items={featured} badge="Featured" badgeIcon={Star} />
          {isAgent && <TeamSection profile={profile} roleLabel={roleLabel} />}
          <ListingCarousel title="Sold" items={sold} badge="Sold" />
          <ListingCarousel title="For sale" items={forSale} badge="For sale" />
          <ListingCarousel title="For rent" items={forRent} badge="For rent" isRent />
          <ReviewsSection agentId={id} roleLabel={roleLabel} isOwnProfile={isOwnProfile} currentUserId={user?.id ?? null} />
        </div>

        <aside id="contact-agent" className="h-fit lg:sticky lg:top-24">
          <ContactForm agentName={profile.full_name ?? roleLabel} agentEmail={profile.email} roleLabel={roleLabel} />
        </aside>
      </div>
    </div>
  );
}

// ── Reviews section ──────────────────────────────────────────────────────────

const REVIEWS_PER_PAGE = 6;

function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (onChange ? (hovered || value) : value);
        return (
          <button
            key={n}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => onChange && setHovered(n)}
            onMouseLeave={() => onChange && setHovered(0)}
            className={onChange ? "cursor-pointer" : "cursor-default"}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={`${sz} transition ${filled ? "fill-yellow-400 text-yellow-400" : "fill-none text-muted-foreground/40"}`} />
          </button>
        );
      })}
    </div>
  );
}

function ReviewsSection({
  agentId, roleLabel, isOwnProfile, currentUserId,
}: {
  agentId: string;
  roleLabel: string;
  isOwnProfile: boolean;
  currentUserId: string | null;
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage]           = useState(0);
  const [rating, setRating]       = useState(5);
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");

  // "agent-reviews" key — full objects with body + reviewer join.
  // Deliberately different from "agent-review-ratings" used in AgentProfile
  // so the two queries never overwrite each other's cache entries.
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["agent-reviews", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_reviews")
        .select("*, reviewer:profiles!agent_reviews_reviewer_id_fkey(full_name, avatar_url)")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const avgRating    = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
  const myReview     = reviews.find((r) => r.reviewer_id === currentUserId);
  const pageCount    = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const visibleReviews = reviews.slice(page * REVIEWS_PER_PAGE, (page + 1) * REVIEWS_PER_PAGE);

  function startEdit(r: Review) {
    setEditingId(r.id); setRating(r.rating); setTitle(r.title ?? ""); setBody(r.body); setShowForm(true);
    setTimeout(() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function resetForm() { setShowForm(false); setEditingId(null); setRating(5); setTitle(""); setBody(""); }

  const upsert = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Please write your review before submitting.");
      if (!currentUserId) throw new Error("Sign in to leave a review.");
      if (editingId) {
        const { error } = await supabase.from("agent_reviews").update({ rating, title: title || null, body }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agent_reviews").insert({ agent_id: agentId, reviewer_id: currentUserId, rating, title: title || null, body });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Review updated" : "Review submitted — thank you!");
      resetForm();
      // Invalidate both query keys so the profile card summary updates too
      qc.invalidateQueries({ queryKey: ["agent-reviews", agentId] });
      qc.invalidateQueries({ queryKey: ["agent-review-ratings", agentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit review"),
  });

  const del = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("agent_reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["agent-reviews", agentId] });
      qc.invalidateQueries({ queryKey: ["agent-review-ratings", agentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  if (isLoading) return null;

  const canReview = !!currentUserId && !isOwnProfile;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">
            {roleLabel} Reviews
            <span className="ml-2 font-normal text-muted-foreground">({reviews.length})</span>
          </h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={Math.round(avgRating)} size="sm" />
              <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">average</span>
            </div>
          )}
        </div>
        {canReview && !myReview && !showForm && <Button size="sm" onClick={() => setShowForm(true)}>Write a review</Button>}
        {canReview && myReview && !showForm && <Button size="sm" variant="outline" onClick={() => startEdit(myReview)}>Edit your review</Button>}
      </div>

      {reviews.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {ratingCounts.map(({ n, count }) => (
            <div key={n} className="flex items-center gap-2 text-xs">
              <span className="w-4 shrink-0 text-right text-muted-foreground">{n}</span>
              <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }} />
              </div>
              <span className="w-5 shrink-0 text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && canReview && (
        <div id="review-form" className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">{editingId ? "Edit your review" : `Review this ${roleLabel}`}</h3>
          <div className="mt-4 space-y-4">
            <div><Label>Your rating</Label><div className="mt-1.5"><StarRating value={rating} onChange={setRating} /></div></div>
            <div>
              <Label>Title (optional)</Label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your experience" className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <Label>Your review</Label>
              <textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Tell others about your experience working with this ${roleLabel.toLowerCase()}…`} className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>{upsert.isPending ? "Submitting…" : editingId ? "Save changes" : "Submit review"}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No reviews yet — be the first to leave one.</p>
          {canReview && <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>Write a review</Button>}
          {!currentUserId && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review.
            </p>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visibleReviews.map((r) => (
              <ReviewCard key={r.id} review={r} isOwn={r.reviewer_id === currentUserId} onEdit={() => startEdit(r)} onDelete={() => { if (confirm("Delete your review?")) del.mutate(r.id); }} />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReviewCard({ review, isOwn, onEdit, onDelete }: { review: Review; isOwn: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 220;
  const body = review.body ?? "";
  const needsTruncation = body.length > TRUNCATE_AT;
  const displayBody = expanded || !needsTruncation ? body : body.slice(0, TRUNCATE_AT) + "…";
  const initials = (review.reviewer?.full_name ?? "?").slice(0, 1).toUpperCase();
  const dateStr = new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
  const reviewerName = review.reviewer?.full_name ?? "Anonymous";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <StarRating value={review.rating} size="sm" />
          <span className="text-xs text-muted-foreground">{dateStr} · {reviewerName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isOwn ? (
            <><button onClick={onEdit} className="rounded px-2 py-1 text-xs text-primary hover:bg-accent">Edit</button><button onClick={onDelete} className="rounded px-2 py-1 text-xs text-destructive hover:bg-accent">Delete</button></>
          ) : (
            <button title="Report review" className="rounded p-1 text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground"><Flag className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
      {review.title && <p className="font-semibold leading-snug">{review.title}</p>}
      <p className="text-sm leading-relaxed text-foreground/80">{displayBody}</p>
      {needsTruncation && <button onClick={() => setExpanded(!expanded)} className="self-start text-sm font-semibold text-primary hover:underline">{expanded ? "Show less" : "Show more"}</button>}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
          {review.reviewer?.avatar_url ? <img src={review.reviewer.avatar_url} alt={reviewerName} className="h-full w-full object-cover" /> : initials}
        </div>
        <span className="text-xs font-medium">{reviewerName}</span>
      </div>
    </div>
  );
}

// ── Supporting components ────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex h-full flex-col">
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
        <img src={images[active]} alt="" className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto p-2">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === active ? "border-primary" : "border-transparent opacity-70"}`}>
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselShell({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{title}{count != null && <span className="ml-1 font-normal text-muted-foreground">({count})</span>}</h2>
        <div className="flex gap-1.5">
          <button aria-label="Scroll left" onClick={() => ref.current?.scrollBy({ left: -300, behavior: "smooth" })} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Scroll right" onClick={() => ref.current?.scrollBy({ left: 300, behavior: "smooth" })} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
    </div>
  );
}

function TeamSection({ profile, roleLabel }: { profile: { id: string; full_name: string | null; avatar_url: string | null; title: string | null }; roleLabel: string }) {
  const members = [profile];
  return (
    <div>
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Meet the team</h2></div>
      <p className="mt-1 text-sm text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {members.map((m) => (
          <Link key={m.id} to="/agents/$id" params={{ id: m.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 font-display font-semibold text-primary-foreground">
              {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name ?? ""} className="h-full w-full object-cover" /> : (m.full_name ?? "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{m.full_name ?? roleLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{m.title ?? roleLabel}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ListingCarousel({ title, items, isRent, badge, badgeIcon: BadgeIcon }: { title: string; items: Property[]; isRent?: boolean; badge: string; badgeIcon?: typeof Star }) {
  if (items.length === 0) return null;
  return (
    <CarouselShell title={title} count={items.length}>
      {items.map((p) => (
        <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">H</div>}
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-foreground/85 px-2 py-0.5 text-[11px] font-semibold text-background">
              {BadgeIcon && <BadgeIcon className="h-3 w-3 fill-current" />}{badge}
            </span>
          </div>
          <div className="p-3">
            <p className="font-display text-lg font-bold">{formatPrice(p.price)}{isRent && <span className="text-xs font-normal text-muted-foreground">/mo</span>}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{[p.bedrooms != null && `${p.bedrooms} bd`, p.bathrooms != null && `${p.bathrooms} ba`, p.area_sqm != null && `${p.area_sqm} sqft`].filter(Boolean).join(" | ") || typeLabel(p.property_type)}</p>
            <p className="truncate text-xs text-muted-foreground">{p.location ?? "Cagayan de Oro City"}</p>
          </div>
        </Link>
      ))}
    </CarouselShell>
  );
}

function ContactForm({ agentName, agentEmail, roleLabel }: { agentName: string; agentEmail: string | null; roleLabel: string }) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentEmail) { toast.error("This agent hasn't listed a contact email yet."); return; }
    const body = `Name: ${name}\nPhone: ${phone}\n\n${message}`;
    window.location.href = `mailto:${agentEmail}?subject=${encodeURIComponent("Inquiry via One Higala Properties")}&body=${encodeURIComponent(body)}`;
    toast.success("Opening your email app…");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Contact {agentName}</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div><Label>Name</Label><input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></div>
        <div><Label>Phone</Label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></div>
        <div><Label>Email</Label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></div>
        <div>
          <Label>Message (optional)</Label>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Hi ${agentName.split(" ")[0]}, I'd like to know more about...`} className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm" />
        </div>
        <Button type="submit" className="w-full">Contact {roleLabel}</Button>
        <p className="text-[11px] text-muted-foreground">Submitting opens your email app with this message pre-filled to {agentName}.</p>
      </form>
    </div>
  );
}
