/*
  # Create seasons table

  1. New Tables
    - `seasons`
      - `id` (uuid, primary key) - Unique identifier
      - `league_id` (uuid, references leagues.id) - The league this season belongs to
      - `name` (text, not null) - Season name, e.g. "Enero-Abril 2025"
      - `start_date` (date, nullable) - Season start date
      - `end_date` (date, nullable) - Season end date
      - `is_active` (boolean, default true) - Allows multiple active/inactive seasons per league
      - `created_by` (uuid, references users.id) - The league admin who created it
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS enabled on seasons table
    - SELECT/INSERT/UPDATE: anon and authenticated (backend handles authorization)

  3. Indexes
    - seasons.league_id for fast lookups by league

  4. Triggers
    - Auto-update updated_at on seasons table changes
*/

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seasons_league_id ON seasons(league_id);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on seasons for auth"
  ON seasons FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on seasons for auth"
  ON seasons FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on seasons for auth"
  ON seasons FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS seasons_updated_at ON seasons;
CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
