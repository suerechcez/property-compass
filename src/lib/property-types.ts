export const PROPERTY_TYPES = [
  { value: "condo", label: "Condo" },
  { value: "hotel", label: "Hotel" },
  { value: "raw_land", label: "Raw Land" },
  { value: "resell", label: "Resell Property" },
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
