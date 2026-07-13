import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Common calling codes, Philippines first since that's the primary market.
const COUNTRY_CODES = [
  { code: "+63", iso: "ph", label: "PH" },
  { code: "+1", iso: "us", label: "US" },
  { code: "+44", iso: "gb", label: "GB" },
  { code: "+61", iso: "au", label: "AU" },
  { code: "+81", iso: "jp", label: "JP" },
  { code: "+82", iso: "kr", label: "KR" },
  { code: "+65", iso: "sg", label: "SG" },
  { code: "+852", iso: "hk", label: "HK" },
  { code: "+971", iso: "ae", label: "AE" },
  { code: "+86", iso: "cn", label: "CN" },
];

function flagUrl(iso: string) {
  return `https://flagcdn.com/${iso}.svg`;
}

function splitPhone(value: string): { code: string; number: string } {
  const found = COUNTRY_CODES.find((c) => value.startsWith(c.code));
  if (found) return { code: found.code, number: value.slice(found.code.length).trim() };
  return { code: "+63", number: value };
}

/**
 * Phone number input with a country/region calling-code selector (defaults to
 * +63). The combined value (e.g. "+63 9171234567") is what's passed to
 * onChange and what should be stored — splitPhone parses it back apart for
 * display, so this is safe to reuse for any existing "phone" text field.
 *
 * Uses a real dropdown menu (not a native <select>) rendered in a portal, so
 * it can never get visually clipped or overlapped by a parent card's
 * boundaries, and shows an actual flag icon next to each region.
 *
 * IMPORTANT: the menu is left fully uncontrolled (no open/onOpenChange state)
 * and uses Radix's onSelect — not onClick — on each item. Controlling
 * `open` ourselves while also relying on onClick raced against Radix's own
 * internal close-on-select handling and silently ate the click.
 */
export function PhoneInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const { code, number } = useMemo(() => splitPhone(value), [value]);
  const selected = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];

  function update(newCode: string, newNumber: string) {
    onChange(newNumber ? `${newCode} ${newNumber}`.trim() : "");
  }

  return (
    <div className="mt-1.5 flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label="Country/region code"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src={flagUrl(selected.iso)} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
            <span className="text-base font-semibold">{selected.label}</span>
            <span className="text-muted-foreground">{selected.code}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {COUNTRY_CODES.map((c) => (
            <DropdownMenuItem
              key={c.code}
              className="cursor-pointer gap-2"
              onSelect={() => update(c.code, number)}
            >
              <img src={flagUrl(c.iso)} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
              <span className="text-base font-semibold">{c.label}</span>
              <span className="ml-auto text-muted-foreground">{c.code}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        type="tel"
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        value={number}
        onChange={(e) => update(code, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
