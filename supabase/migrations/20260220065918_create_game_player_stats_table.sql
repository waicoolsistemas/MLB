/*
  # Create game_player_stats table

  Stores individual batting statistics for each player in each game.
  Used to track per-game performance and aggregate season stats.

  1. New Tables
    - `game_player_stats`
      - `id` (uuid, primary key) - Unique identifier
      - `game_id` (uuid, references games.id ON DELETE CASCADE) - The game
      - `player_id` (uuid, references players.id ON DELETE CASCADE) - The player
      - `team_id` (uuid, references teams.id ON DELETE CASCADE) - The team the player played for
      - `at_bats` (integer, default 0) - Turnos al bat (AB)
      - `hits` (integer, default 0) - Hits (H)
      - `doubles` (integer, default 0) - Dobles (2B)
      - `triples` (integer, default 0) - Triples (3B)
      - `home_runs` (integer, default 0) - Cuadrangulares (HR)
      - `walks` (integer, default 0) - Bases por bolas (BB)
      - `strikeouts` (integer, default 0) - Ponches (K)
      - `runs` (integer, default 0) - Carreras anotadas (R)
      - `rbi` (integer, default 0) - Carreras empujadas (RBI)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Constraints
    - UNIQUE on (game_id, player_id) to prevent duplicate stats per game
    - CHECK constraints ensuring all stat values >= 0

  3. Security
    - RLS enabled on game_player_stats table
    - SELECT/INSERT/UPDATE/DELETE: anon and authenticated (backend handles authorization)

  4. Indexes
    - game_player_stats.game_id for fast lookups by game
    - game_player_stats.(game_id, team_id) for lookups by game and team

  5. Triggers
    - Auto-update updated_at on game_player_stats table changes
*/

CREATE TABLE IF NOT EXISTS game_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  at_bats integer NOT NULL DEFAULT 0 CHECK (at_bats >= 0),
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  doubles integer NOT NULL DEFAULT 0 CHECK (doubles >= 0),
  triples integer NOT NULL DEFAULT 0 CHECK (triples >= 0),
  home_runs integer NOT NULL DEFAULT 0 CHECK (home_runs >= 0),
  walks integer NOT NULL DEFAULT 0 CHECK (walks >= 0),
  strikeouts integer NOT NULL DEFAULT 0 CHECK (strikeouts >= 0),
  runs integer NOT NULL DEFAULT 0 CHECK (runs >= 0),
  rbi integer NOT NULL DEFAULT 0 CHECK (rbi >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_player_stats_game_id ON game_player_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_player_stats_game_team ON game_player_stats(game_id, team_id);

ALTER TABLE game_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on game_player_stats for auth"
  ON game_player_stats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on game_player_stats for auth"
  ON game_player_stats FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on game_player_stats for auth"
  ON game_player_stats FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on game_player_stats for auth"
  ON game_player_stats FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS game_player_stats_updated_at ON game_player_stats;
CREATE TRIGGER game_player_stats_updated_at
  BEFORE UPDATE ON game_player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
