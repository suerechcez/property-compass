-- Allow authenticated users to upload and read their own chat
-- attachments under messages/<uid>/... in the property-images bucket.
-- (The bucket already has policies for avatars/<uid>/... and
-- <uid>/... property photos, but those don't cover this new prefix.)

DO $$ BEGIN
  CREATE POLICY "users upload own message attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'property-images'
      AND (storage.foldername(name))[1] = 'messages'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users read own message attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'property-images'
      AND (storage.foldername(name))[1] = 'messages'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
