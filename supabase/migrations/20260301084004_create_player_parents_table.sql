/*
  # Create player_parents table

  1. New Tables
    - `player_parents`
      - `id` (uuid, primary key) - unique identifier
      - `player_id` (uuid, FK to players) - the player this parent belongs to
      - `full_name` (text, NOT NULL) - parent's full name
      - `phone` (text, DEFAULT '') - parent's phone number
      - `address` (text, DEFAULT '') - parent's address (optional)
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `player_parents` table
    - Add policy for authenticated users to SELECT player parents
    - Add policy for authenticated users to INSERT player parents
    - Add policy for authenticated users to UPDATE player parents
    - Add policy for authenticated users to DELETE player parents

  3. Important Notes
    - Used primarily for baseball leagues where players (minors) have parent/guardian info
    - ON DELETE CASCADE ensures parents are removed when a player is deleted
    - The update_updated_at trigger keeps updated_at current
*/

CREATE TABLE IF NOT EXISTS player_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view player parents"
  ON player_parents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_parents.player_id
    )
  );

CREATE POLICY "Authenticated users can insert player parents"
  ON player_parents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_parents.player_id
    )
  );

CREATE POLICY "Authenticated users can update player parents"
  ON player_parents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_parents.player_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_parents.player_id
    )
  );

CREATE POLICY "Authenticated users can delete player parents"
  ON player_parents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_parents.player_id
    )
  );

CREATE TRIGGER update_player_parents_updated_at
  BEFORE UPDATE ON player_parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
