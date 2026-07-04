export const PROPERTY_TYPES = [
  { value: "house", label: "Houses" },
  { value: "townhome", label: "Townhomes" },
  { value: "multi_family", label: "Multi-family" },
  { value: "condo", label: "Condos/Co-ops" },
  { value: "apartment", label: "Apartments" },
  { value: "lot_land", label: "Lots/Land" },
  { value: "manufactured", label: "Manufactured" },
  { value: "hotel", label: "Hotels" },
  { value: "raw_land", label: "Raw Land" },
  { value: "resell", label: "Resell" },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];

export const PROPERTY_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
] as const;

export function typeLabel(t: string) {
  return PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t;
}

export function formatPrice(n: number | string) {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(v);
}
