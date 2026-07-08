import { useMemo } from "react";

// Common calling codes, Philippines first since that's the primary market.
const COUNTRY_CODES = [
  { code: "+63", label: "🇵🇭 +63" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+81", label: "🇯🇵 +81" },
  { code: "+82", label: "🇰🇷 +82" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+852", label: "🇭🇰 +852" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+86", label: "🇨🇳 +86" },
];

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

  function update(newCode: string, newNumber: string) {
    onChange(newNumber ? `${newCode} ${newNumber}`.trim() : "");
  }

  return (
    <div className="mt-1.5 flex gap-2">
      <select
        aria-label="Country/region code"
        className="h-9 w-[5.5rem] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
        value={code}
        onChange={(e) => update(e.target.value, number)}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        value={number}
        onChange={(e) => update(code, e.target.value)}
        placeholder={placeholder ?? "9XX XXX XXXX"}
      />
    </div>
  );
}
