/*
  # Create storage buckets for news images and sponsor logos

  1. Storage Buckets
    - `news-images` - covers and images for news articles
    - `sponsor-logos` - logos for league sponsors

  2. Security
    - Public read access for both buckets (content is displayed on public pages)
    - Authenticated users can upload/update/delete (managed via server)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view news images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can upload news images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can update news images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'news-images')
  WITH CHECK (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can delete news images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'news-images');

CREATE POLICY "Anyone can view sponsor logos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Authenticated users can upload sponsor logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sponsor-logos');

CREATE POLICY "Authenticated users can update sponsor logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sponsor-logos')
  WITH CHECK (bucket_id = 'sponsor-logos');

CREATE POLICY "Authenticated users can delete sponsor logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sponsor-logos');
