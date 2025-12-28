-- Add avatar_url to members and configure avatar storage
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create public avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars public read'
  ) THEN
    CREATE POLICY "Avatars public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload avatars'
  ) THEN
    CREATE POLICY "Users upload avatars"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users update avatars'
  ) THEN
    CREATE POLICY "Users update avatars"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;
END $$;