/*
  # Fix storage policies for player photos - allow anon role

  1. Security Changes
    - Add INSERT, UPDATE, DELETE policies on storage.objects for the `anon` role
      scoped to the `player-photos` bucket
    - This is needed because the server uses the anon key (no service_role key configured)

  2. Notes
    - The server already enforces authentication via its own JWT middleware
    - These policies only apply to the `player-photos` bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anon can upload player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anon can upload player photos"
      ON storage.objects FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anon can update player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anon can update player photos"
      ON storage.objects FOR UPDATE
      TO anon
      USING (bucket_id = 'player-photos')
      WITH CHECK (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anon can delete player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anon can delete player photos"
      ON storage.objects FOR DELETE
      TO anon
      USING (bucket_id = 'player-photos');
  END IF;
END $$;
