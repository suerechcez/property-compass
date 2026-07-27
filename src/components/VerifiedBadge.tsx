import { ShieldCheck } from "lucide-react";

/**
 * Sitewide "Verified" badge for profiles an admin has manually verified
 * (public.profiles.is_verified). Distinct from the "Licensed" badge shown
 * elsewhere, which just reflects a self-reported license number — this one
 * is only ever set by an admin (see the protect_verified_column trigger).
 *
 * Renders nothing when `verified` is falsy, so callers can drop
 * <VerifiedBadge verified={x.is_verified} /> inline without an extra guard.
 *
 * size="icon" renders just the shield-check glyph with no pill/border/text
 * — meant to sit directly beside a name (e.g. <h1>Name <VerifiedBadge .../></h1>)
 * without adding much visual weight or taking extra horizontal space.
 */
export function VerifiedBadge({
  verified,
  size = "md",
  className = "",
}: {
  verified: boolean | null | undefined;
  size?: "sm" | "md" | "icon";
  className?: string;
}) {
  if (!verified) return null;

  if (size === "icon") {
    return (
      <ShieldCheck
        aria-label="Verified by One Higala Properties"
        title="Verified by One Higala Properties"
        className={`h-4 w-4 shrink-0 text-primary ${className}`}
      />
    );
  }

  const isSm = size === "sm";
  return (
    <span
      title="Verified by One Higala Properties"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 font-medium text-primary ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      <ShieldCheck className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Verified
    </span>
  );
}
