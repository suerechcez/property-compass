import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a `sales` row exists for a property that's just been marked sold,
 * so it automatically shows up under the commissioner/agent's "Sales" tab
 * and on their public profile stats — without creating duplicates if the
 * property gets edited again while already sold.
 */
export async function ensureSaleRecord(propertyId: string, commissionerId: string, price: number) {
  const { data: existing, error: findErr } = await supabase
    .from("sales")
    .select("id")
    .eq("property_id", propertyId)
    .eq("commissioner_id", commissionerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return;

  const { error: insErr } = await supabase.from("sales").insert({
    commissioner_id: commissionerId,
    property_id: propertyId,
    amount: price,
    commission: 0,
    sale_date: new Date().toISOString().slice(0, 10),
  });
  if (insErr) throw insErr;
}

/** Marks a property "sold" and logs a matching sales record in one step — used by the quick "Mark as Sold" buttons. */
export async function markPropertySold(propertyId: string, commissionerId: string, price: number) {
  const { error: updErr } = await supabase.from("properties").update({ status: "sold" }).eq("id", propertyId);
  if (updErr) throw updErr;
  await ensureSaleRecord(propertyId, commissionerId, price);
}
