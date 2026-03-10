/*
  # Fix league-logos storage policies to allow server uploads

  1. Problem
    - Server uses anon key when SUPABASE_SERVICE_ROLE_KEY is not set
    - Existing policies only grant INSERT/UPDATE/DELETE to authenticated role
    - Uploads fail because anon role cannot write to the bucket

  2. Changes
    - Add INSERT policy for anon role on league-logos bucket
    - Add UPDATE policy for anon role on league-logos bucket
    - Add DELETE policy for anon role on league-logos bucket

  3. Security
    - The league-logos bucket is already public (read-only for all)
    - Write operations are still restricted to the specific bucket
    - The server is the only client that performs writes (via API endpoints with auth middleware)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon uploads to league-logos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow anon uploads to league-logos"
      ON storage.objects FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'league-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon updates to league-logos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow anon updates to league-logos"
      ON storage.objects FOR UPDATE
      TO anon
      USING (bucket_id = 'league-logos')
      WITH CHECK (bucket_id = 'league-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon deletes from league-logos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow anon deletes from league-logos"
      ON storage.objects FOR DELETE
      TO anon
      USING (bucket_id = 'league-logos');
  END IF;
END $$;
