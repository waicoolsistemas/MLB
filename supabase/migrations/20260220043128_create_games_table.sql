/*
  # Create games table

  1. New Tables
    - `games`
      - `id` (uuid, primary key) - Unique identifier
      - `category_id` (uuid, references categories.id) - The category this game belongs to
      - `home_team_id` (uuid, references teams.id) - Home team
      - `away_team_id` (uuid, references teams.id) - Away team
      - `matchday` (integer, not null) - Matchday/jornada number
      - `game_date` (date, nullable) - Date of the game
      - `game_time` (time, nullable) - Time of the game
      - `location` (text, default '') - Venue/field name
      - `home_score` (integer, nullable) - Home team score
      - `away_score` (integer, nullable) - Away team score
      - `status` (text, default 'scheduled') - Game status: scheduled, in_progress, completed, cancelled
      - `notes` (text, default '') - Additional notes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Constraints
    - CHECK constraint ensuring home_team_id != away_team_id
    - CHECK constraint on status values

  3. Security
    - RLS enabled on games table
    - SELECT/INSERT/UPDATE/DELETE: anon and authenticated (backend handles authorization)

  4. Indexes
    - games.category_id for fast lookups by category
    - games.(category_id, matchday) for fast lookups by jornada

  5. Triggers
    - Auto-update updated_at on games table changes
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  matchday integer NOT NULL,
  game_date date,
  game_time time,
  location text DEFAULT '',
  home_score integer,
  away_score integer,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_id != away_team_id)
);

CREATE INDEX IF NOT EXISTS idx_games_category_id ON games(category_id);
CREATE INDEX IF NOT EXISTS idx_games_category_matchday ON games(category_id, matchday);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on games for auth"
  ON games FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on games for auth"
  ON games FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on games for auth"
  ON games FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on games for auth"
  ON games FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
