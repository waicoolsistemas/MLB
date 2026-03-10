/*
  # Create league-logos storage bucket

  1. New Storage Bucket
    - `league-logos` - public bucket for storing league logo images
  2. Security
    - Allow public read access (anon role can SELECT)
    - Allow authenticated service-role uploads (managed via server)
    - Storage policies for objects in the bucket
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('league-logos', 'league-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access on league-logos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'league-logos');

CREATE POLICY "Allow authenticated uploads to league-logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'league-logos');

CREATE POLICY "Allow authenticated updates to league-logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'league-logos')
  WITH CHECK (bucket_id = 'league-logos');

CREATE POLICY "Allow authenticated deletes from league-logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'league-logos');
