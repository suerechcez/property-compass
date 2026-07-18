import { supabase } from "@/integrations/supabase/client";

/** Toggle a property favorite for the current user. Returns the new state (true = favorited). */
export async function toggleFavorite(propertyId: string, currentlyFavorited: boolean): Promise<boolean> {
  if (currentlyFavorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("property_id", propertyId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ property_id: propertyId });
    if (error) throw error;
    return true;
  }
}

/** Fetch all favorited property IDs for the current user. Returns an empty set if not logged in. */
export async function fetchFavoriteIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from("favorites")
    .select("property_id");
  return new Set((data ?? []).map((r: { property_id: string }) => r.property_id));
}
