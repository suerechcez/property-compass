/**
 * The multi-font "ONE HIGALA PROPERTIES INC. / Bringing You Home, the Higala
 * Way." wordmark, matching the desktop top bar exactly. Shared between the
 * top bar itself and the mobile burger-menu header so both stay in sync.
 *
 * `light` should only ever visually apply on mobile (it's meant for the
 * transparent hero-overlay header) — every light-mode class below carries
 * an `md:` revert back to the normal desktop colors, since the desktop bar
 * is never transparent regardless of what the page passed in.
 */
export function BrandTitle({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span className={`text-lg tracking-tight sm:text-xl ${light ? "text-white md:text-foreground" : "text-foreground"}`}>
        <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 800 }} className={light ? "text-white md:text-primary" : "text-primary"}>
          ONE HIGALA
        </span>
        <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 500 }} className={light ? "" : "text-muted-foreground"}>
          {" "}PROPERTIES INC.
        </span>
      </span>
      <span className="text-sm sm:text-base">
        <span
          className={light ? "text-white/90 md:text-primary" : "text-primary"}
          style={{ fontFamily: "var(--font-poppins)", fontWeight: 500 }}
        >
          Bringing You Home,{" "}
        </span>
        <span className="text-gold" style={{ fontFamily: "var(--font-signature)", fontSize: "1.4em", lineHeight: 1 }}>
          the Higala Way.
        </span>
      </span>
    </span>
  );
}
