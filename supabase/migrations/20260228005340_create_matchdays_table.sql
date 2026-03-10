/*
  # Create matchdays table and link to games

  1. New Tables
    - `matchdays`
      - `id` (uuid, primary key)
      - `category_id` (uuid, FK to categories)
      - `number` (integer, matchday number within category)
      - `name` (text, nullable, custom display name e.g. "Semifinal")
      - `game_date` (date, nullable, default date for games in this matchday)
      - `game_time` (time, nullable, default time for games in this matchday)
      - `location` (text, nullable, default location for games in this matchday)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz, nullable, for soft delete)

  2. Modified Tables
    - `games`
      - Added `matchday_id` (uuid, nullable, FK to matchdays)

  3. Security
    - Enable RLS on `matchdays` table
    - Add select/insert/update/delete policies for authenticated users

  4. Data Migration
    - Backfill matchdays from existing distinct (category_id, matchday) in games
    - Link existing games to their corresponding matchday records

  5. Important Notes
    - Partial unique index on (category_id, number) WHERE deleted_at IS NULL
    - The integer `matchday` column on games is kept for backwards compatibility
    - Auto-update trigger on updated_at
*/

CREATE TABLE IF NOT EXISTS matchdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id),
  number integer NOT NULL,
  name text,
  game_date date,
  game_time time without time zone,
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS matchdays_category_number_unique
  ON matchdays (category_id, number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS matchdays_category_id_idx ON matchdays (category_id);

ALTER TABLE matchdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read matchdays"
  ON matchdays FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert matchdays"
  ON matchdays FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update matchdays"
  ON matchdays FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can soft delete matchdays"
  ON matchdays FOR DELETE
  TO authenticated
  USING (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matchdays' AND policyname = 'Anon users can read matchdays'
  ) THEN
    CREATE POLICY "Anon users can read matchdays"
      ON matchdays FOR SELECT
      TO anon
      USING (deleted_at IS NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_matchdays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'matchdays_updated_at'
  ) THEN
    CREATE TRIGGER matchdays_updated_at
      BEFORE UPDATE ON matchdays
      FOR EACH ROW
      EXECUTE FUNCTION update_matchdays_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'matchday_id'
  ) THEN
    ALTER TABLE games ADD COLUMN matchday_id uuid REFERENCES matchdays(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS games_matchday_id_idx ON games (matchday_id);

INSERT INTO matchdays (category_id, number)
SELECT DISTINCT category_id, matchday
FROM games
WHERE deleted_at IS NULL
  AND playoff_series_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE games g
SET matchday_id = m.id
FROM matchdays m
WHERE g.category_id = m.category_id
  AND g.matchday = m.number
  AND g.matchday_id IS NULL
  AND g.deleted_at IS NULL
  AND g.playoff_series_id IS NULL
  AND m.deleted_at IS NULL;
