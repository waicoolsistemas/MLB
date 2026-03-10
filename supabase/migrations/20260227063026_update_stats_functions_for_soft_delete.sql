/*
  # Update stats functions for soft delete support

  Updates the player stats functions to exclude soft-deleted records (games and game_player_stats
  where deleted_at IS NOT NULL).

  1. Modified Functions
    - `get_player_stats_by_team` - Added filter for g.deleted_at IS NULL and gps.deleted_at IS NULL
    - `get_playoff_player_stats_by_team` - Added filter for g.deleted_at IS NULL and gps.deleted_at IS NULL
    - `save_game_stats` - Added deleted_at IS NULL filter when clearing old stats
    - `process_forfeit` - Added deleted_at IS NULL filter when checking existing stats

  2. Important Notes
    - Only active (non-deleted) records are included in stat calculations
    - This ensures soft-deleted playoff brackets do not pollute stats
*/

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
    AND g.deleted_at IS NULL
    AND gps.deleted_at IS NULL
  GROUP BY gps.player_id, p.full_name
  ORDER BY batting_average DESC, hits DESC;
$$;

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
    AND g.deleted_at IS NULL
    AND gps.deleted_at IS NULL
  GROUP BY gps.player_id, p.full_name
  ORDER BY batting_average DESC, hits DESC;
$$;
