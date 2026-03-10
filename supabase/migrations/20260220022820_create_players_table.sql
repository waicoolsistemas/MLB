/*
  # Create players table

  1. New Tables
    - `players`
      - `id` (uuid, primary key) - Unique identifier
      - `team_id` (uuid, references teams.id ON DELETE CASCADE) - The team this player belongs to
      - `full_name` (text, not null) - Player's full name
      - `curp` (text, default '') - Plain text CURP identifier
      - `birth_date` (date, nullable) - Player's date of birth
      - `is_active` (boolean, default true) - Soft delete flag
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS enabled on players table
    - SELECT/INSERT/UPDATE: anon and authenticated (backend handles authorization)

  3. Indexes
    - players.team_id for fast lookups by team

  4. Triggers
    - Auto-update updated_at on players table changes
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  curp text DEFAULT '',
  birth_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on players for auth"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on players for auth"
  ON players FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on players for auth"
  ON players FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS players_updated_at ON players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();