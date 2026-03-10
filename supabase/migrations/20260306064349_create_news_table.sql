/*
  # Create news table for public league content

  1. New Tables
    - `news`
      - `id` (uuid, primary key)
      - `league_id` (uuid, FK to leagues)
      - `title` (text, not null)
      - `slug` (text, not null) - URL-friendly identifier
      - `content` (text) - article body with basic formatting
      - `cover_image_url` (text) - URL for cover image
      - `is_published` (boolean, default false)
      - `published_at` (timestamptz) - when article was published
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `news` table
    - Policy for league admins to manage their league's news
    - Policy for anyone to read published news (public access)
*/

CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS news_league_slug_unique ON news(league_id, slug);
CREATE INDEX IF NOT EXISTS news_league_published_idx ON news(league_id, is_published, published_at DESC);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League admins can manage their news"
  ON news FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_admins
      WHERE league_admins.league_id = news.league_id
      AND league_admins.user_id = auth.uid()
      AND league_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_admins
      WHERE league_admins.league_id = news.league_id
      AND league_admins.user_id = auth.uid()
      AND league_admins.is_active = true
    )
  );

CREATE POLICY "Anyone can read published news"
  ON news FOR SELECT
  TO anon
  USING (is_published = true);
