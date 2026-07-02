import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an image to the property-images bucket under <userId>/<random>.<ext>
 * and returns a long-lived signed URL (1 year) suitable for storing in
 * properties.images. The bucket is private at the workspace level so we use
 * signed URLs rather than public URLs.
 */
export async function uploadPropertyImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("property-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("property-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr || !data) throw sErr ?? new Error("Could not sign URL");
  return data.signedUrl;
}

/**
 * Uploads an avatar image under avatars/<userId>/<random>.<ext> in the
 * property-images bucket and returns a 1-year signed URL.
 */
export async function uploadAvatarImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("property-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("property-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr || !data) throw sErr ?? new Error("Could not sign URL");
  return data.signedUrl;
}
