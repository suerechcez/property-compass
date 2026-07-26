import { ShieldCheck } from "lucide-react";

/**
 * Sitewide "Verified" badge for profiles an admin has manually verified
 * (public.profiles.is_verified). Distinct from the "Licensed" badge shown
 * elsewhere, which just reflects a self-reported license number — this one
 * is only ever set by an admin (see the protect_verified_column trigger).
 *
 * Renders nothing when `verified` is falsy, so callers can drop
 * <VerifiedBadge verified={x.is_verified} /> inline without an extra guard.
 */
export function VerifiedBadge({
  verified,
  size = "md",
  className = "",
}: {
  verified: boolean | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!verified) return null;

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
