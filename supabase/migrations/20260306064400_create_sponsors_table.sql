/*
  # Create sponsors table for league public pages

  1. New Tables
    - `sponsors`
      - `id` (uuid, primary key)
      - `league_id` (uuid, FK to leagues)
      - `name` (text, not null)
      - `logo_url` (text) - sponsor logo image URL
      - `website_url` (text) - link to sponsor's website
      - `is_active` (boolean, default true)
      - `sort_order` (integer, default 0) - display ordering
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sponsors` table
    - Policy for league admins to manage their league's sponsors
    - Policy for anyone to read active sponsors (public access)
*/

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsors_league_active_idx ON sponsors(league_id, is_active, sort_order);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League admins can manage their sponsors"
  ON sponsors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_admins
      WHERE league_admins.league_id = sponsors.league_id
      AND league_admins.user_id = auth.uid()
      AND league_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_admins
      WHERE league_admins.league_id = sponsors.league_id
      AND league_admins.user_id = auth.uid()
      AND league_admins.is_active = true
    )
  );

CREATE POLICY "Anyone can read active sponsors"
  ON sponsors FOR SELECT
  TO anon
  USING (is_active = true);
