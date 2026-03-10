/*
  # Add phone and photo fields to players + storage bucket

  1. Modified Tables
    - `players`
      - `phone` (text, default '') - Player phone number (10-digit Mexican format)
      - `photo_url` (text, default '') - URL to player photo in storage

  2. Storage
    - Create `player-photos` bucket (public)
    - Policies: anyone can read, authenticated users can upload/update/delete

  3. Notes
    - Both fields are optional with empty string defaults
    - Photos stored in Supabase Storage, URL saved in photo_url column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'phone'
  ) THEN
    ALTER TABLE players ADD COLUMN phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE players ADD COLUMN photo_url text DEFAULT '';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can view player photos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload player photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can update player photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'player-photos')
      WITH CHECK (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete player photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can delete player photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'player-photos');
  END IF;
END $$;
