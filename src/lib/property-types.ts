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

// All 80 barangays of Cagayan de Oro City, grouped by congressional district
// (1st district = west of the Cagayan River, 2nd district = east, including
// the 40 numbered Poblacion barangays downtown).
export const CDO_AREAS: { group: string; areas: string[] }[] = [
  {
    group: "Poblacion (Downtown, Barangays 1–40)",
    areas: Array.from({ length: 40 }, (_, i) => `Barangay ${i + 1} (Poblacion)`),
  },
  {
    group: "2nd District",
    areas: [
      "Agusan",
      "Balubal",
      "Bugo",
      "Camaman-an",
      "Consolacion",
      "Cugman",
      "F.S. Catanico",
      "Gusa",
      "Indahag",
      "Lapasan",
      "Macabalan",
      "Macasandig",
      "Nazareth",
      "Puerto",
      "Puntod",
      "Tablon",
    ],
  },
  {
    group: "1st District",
    areas: [
      "Baikingon",
      "Balulang",
      "Bayabas",
      "Bayanga",
      "Besigan",
      "Bonbon",
      "Bulua",
      "Canitoan",
      "Carmen",
      "Dansolihon",
      "Iponan",
      "Kauswagan",
      "Lumbia",
      "Mambuaya",
      "Pagalungan",
      "Pagatpat",
      "Patag",
      "Pigsag-an",
      "San Simon",
      "Taglimao",
      "Tagpangi",
      "Tignapoloan",
      "Tuburan",
      "Tumpagon",
    ],
  },
];
