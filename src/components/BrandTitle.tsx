/**
 * The multi-font "ONE HIGALA PROPERTIES INC. / Bringing You Home, the Higala
 * Way." wordmark, matching the desktop top bar exactly. Shared between the
 * top bar itself, the mobile burger-menu header, and anywhere else (e.g. the
 * sign-in page) that needs the exact same brand styling.
 *
 * "ONE HIGALA" is always plain black/foreground — never white, regardless
 * of the `light` (mobile hero-overlay) mode — only the tagline line below
 * it uses `light` to switch to white on the mobile hero photo.
 *
 * Pass `nameOnly` to render just the "ONE HIGALA PROPERTIES INC." line
 * without the "Bringing You Home, the Higala Way." tagline underneath.
 */
export function BrandTitle({
  light = false,
  nameOnly = false,
  className = "",
}: {
  light?: boolean;
  nameOnly?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span className={`text-lg tracking-tight sm:text-xl ${light ? "text-white md:text-foreground" : "text-foreground"}`}>
        <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 800 }} className="text-foreground">
          ONE HIGALA
        </span>
        <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 500 }} className={light ? "" : "text-muted-foreground"}>
          {" "}PROPERTIES INC.
        </span>
      </span>
      {!nameOnly && (
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
      )}
    </span>
  );
}
