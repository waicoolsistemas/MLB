/*
  # Create playoff system tables

  Adds a complete playoff/postseason system to the league management application.
  Administrators can configure playoffs per category with flexible bracket structures
  and series formats (single game, best of 3, or best of 5).

  1. New Tables
    - `playoff_configs`
      - `id` (uuid, primary key)
      - `category_id` (uuid, unique, references categories) - One config per category
      - `teams_count` (integer) - How many teams qualify for playoffs
      - `series_format` (text) - Format: 'single_game', 'best_of_3', 'best_of_5'
      - `status` (text) - Overall status: 'setup', 'in_progress', 'completed'
      - `created_at`, `updated_at` (timestamptz)

    - `playoff_series`
      - `id` (uuid, primary key)
      - `playoff_config_id` (uuid, references playoff_configs)
      - `round` (integer) - Round number (1=first round, 2=semi, etc.)
      - `round_name` (text) - Human-readable name
      - `seed_home` (integer, nullable) - Home team seed
      - `seed_away` (integer, nullable) - Away team seed
      - `home_team_id` (uuid, nullable, references teams)
      - `away_team_id` (uuid, nullable, references teams)
      - `home_wins` (integer, default 0) - Series wins for home
      - `away_wins` (integer, default 0) - Series wins for away
      - `winner_team_id` (uuid, nullable, references teams)
      - `series_order` (integer) - Order within round
      - `next_series_id` (uuid, nullable, references playoff_series)
      - `next_series_slot` (text, nullable) - 'home' or 'away' slot in next series
      - `status` (text) - Series status: 'pending', 'in_progress', 'completed'
      - `created_at`, `updated_at` (timestamptz)

  2. Modified Tables
    - `games` - Added `playoff_series_id` column (nullable FK to playoff_series)

  3. New Functions
    - `get_playoff_player_stats_by_team` - Same as regular but filters playoff games only

  4. Modified Functions
    - `get_player_stats_by_team` - Now filters to regular season only (playoff_series_id IS NULL)

  5. Security
    - RLS enabled on both new tables
    - Policies for anon and authenticated (backend handles authorization)

  6. Indexes
    - `playoff_configs.category_id` (unique via constraint)
    - `playoff_series.playoff_config_id`
    - `games.playoff_series_id`
*/

-- playoff_configs table
CREATE TABLE IF NOT EXISTS playoff_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
  teams_count integer NOT NULL DEFAULT 4 CHECK (teams_count >= 2 AND teams_count <= 16),
  series_format text NOT NULL DEFAULT 'single_game' CHECK (series_format IN ('single_game', 'best_of_3', 'best_of_5')),
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playoff_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on playoff_configs for auth"
  ON playoff_configs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on playoff_configs for auth"
  ON playoff_configs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on playoff_configs for auth"
  ON playoff_configs FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on playoff_configs for auth"
  ON playoff_configs FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS playoff_configs_updated_at ON playoff_configs;
CREATE TRIGGER playoff_configs_updated_at
  BEFORE UPDATE ON playoff_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- playoff_series table
CREATE TABLE IF NOT EXISTS playoff_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playoff_config_id uuid NOT NULL REFERENCES playoff_configs(id) ON DELETE CASCADE,
  round integer NOT NULL,
  round_name text NOT NULL DEFAULT '',
  seed_home integer,
  seed_away integer,
  home_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  home_wins integer NOT NULL DEFAULT 0,
  away_wins integer NOT NULL DEFAULT 0,
  winner_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  series_order integer NOT NULL DEFAULT 1,
  next_series_id uuid REFERENCES playoff_series(id) ON DELETE SET NULL,
  next_series_slot text CHECK (next_series_slot IS NULL OR next_series_slot IN ('home', 'away')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playoff_series_config ON playoff_series(playoff_config_id);

ALTER TABLE playoff_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on playoff_series for auth"
  ON playoff_series FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on playoff_series for auth"
  ON playoff_series FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on playoff_series for auth"
  ON playoff_series FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on playoff_series for auth"
  ON playoff_series FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS playoff_series_updated_at ON playoff_series;
CREATE TRIGGER playoff_series_updated_at
  BEFORE UPDATE ON playoff_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add playoff_series_id column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'playoff_series_id'
  ) THEN
    ALTER TABLE games ADD COLUMN playoff_series_id uuid REFERENCES playoff_series(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_playoff_series ON games(playoff_series_id) WHERE playoff_series_id IS NOT NULL;

-- Update get_player_stats_by_team to only count regular season games
CREATE OR REPLACE FUNCTION get_player_stats_by_team(p_category_id uuid, p_team_id uuid)
RETURNS TABLE (
  player_id uuid,
  player_name text,
  games_played bigint,
  at_bats bigint,
  hits bigint,
  doubles bigint,
  triples bigint,
  home_runs bigint,
  walks bigint,
  strikeouts bigint,
  runs bigint,
  rbi bigint,
  batting_average numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    gps.player_id,
    p.full_name AS player_name,
    COUNT(DISTINCT gps.game_id) AS games_played,
    COALESCE(SUM(gps.at_bats), 0) AS at_bats,
    COALESCE(SUM(gps.hits), 0) AS hits,
    COALESCE(SUM(gps.doubles), 0) AS doubles,
    COALESCE(SUM(gps.triples), 0) AS triples,
    COALESCE(SUM(gps.home_runs), 0) AS home_runs,
    COALESCE(SUM(gps.walks), 0) AS walks,
    COALESCE(SUM(gps.strikeouts), 0) AS strikeouts,
    COALESCE(SUM(gps.runs), 0) AS runs,
    COALESCE(SUM(gps.rbi), 0) AS rbi,
    CASE
      WHEN COALESCE(SUM(gps.at_bats), 0) = 0 THEN 0.000
      ELSE ROUND(SUM(gps.hits)::numeric / SUM(gps.at_bats)::numeric, 3)
    END AS batting_average
  FROM game_player_stats gps
  INNER JOIN players p ON p.id = gps.player_id
  INNER JOIN games g ON g.id = gps.game_id
  WHERE g.category_id = p_category_id
    AND gps.team_id = p_team_id
    AND g.playoff_series_id IS NULL
  GROUP BY gps.player_id, p.full_name
  ORDER BY batting_average DESC, hits DESC;
$$;

-- Create playoff version of player stats
CREATE OR REPLACE FUNCTION get_playoff_player_stats_by_team(p_category_id uuid, p_team_id uuid)
RETURNS TABLE (
  player_id uuid,
  player_name text,
  games_played bigint,
  at_bats bigint,
  hits bigint,
  doubles bigint,
  triples bigint,
  home_runs bigint,
  walks bigint,
  strikeouts bigint,
  runs bigint,
  rbi bigint,
  batting_average numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    gps.player_id,
    p.full_name AS player_name,
    COUNT(DISTINCT gps.game_id) AS games_played,
    COALESCE(SUM(gps.at_bats), 0) AS at_bats,
    COALESCE(SUM(gps.hits), 0) AS hits,
    COALESCE(SUM(gps.doubles), 0) AS doubles,
    COALESCE(SUM(gps.triples), 0) AS triples,
    COALESCE(SUM(gps.home_runs), 0) AS home_runs,
    COALESCE(SUM(gps.walks), 0) AS walks,
    COALESCE(SUM(gps.strikeouts), 0) AS strikeouts,
    COALESCE(SUM(gps.runs), 0) AS runs,
    COALESCE(SUM(gps.rbi), 0) AS rbi,
    CASE
      WHEN COALESCE(SUM(gps.at_bats), 0) = 0 THEN 0.000
      ELSE ROUND(SUM(gps.hits)::numeric / SUM(gps.at_bats)::numeric, 3)
    END AS batting_average
  FROM game_player_stats gps
  INNER JOIN players p ON p.id = gps.player_id
  INNER JOIN games g ON g.id = gps.game_id
  WHERE g.category_id = p_category_id
    AND gps.team_id = p_team_id
    AND g.playoff_series_id IS NOT NULL
  GROUP BY gps.player_id, p.full_name
  ORDER BY batting_average DESC, hits DESC;
$$;
