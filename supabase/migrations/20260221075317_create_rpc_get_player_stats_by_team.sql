/*
  # Create RPC function: get_player_stats_by_team

  Returns aggregated season batting statistics for all players on a given team
  within a specific category.

  1. New Function
    - `get_player_stats_by_team(p_category_id uuid, p_team_id uuid)`
      - Joins `game_player_stats` with `players` and `games`
      - Filters by `games.category_id = p_category_id` and `game_player_stats.team_id = p_team_id`
      - Aggregates (SUM) all batting stat columns per player
      - Calculates `batting_average` as `hits / at_bats` (returns 0 when at_bats = 0)
      - Returns: player_id, player_name, games_played, at_bats, hits, doubles, triples,
        home_runs, walks, strikeouts, runs, rbi, batting_average
      - Ordered by batting_average DESC, hits DESC

  2. Security
    - Function is accessible to anon and authenticated roles (matches existing RLS on game_player_stats)
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
  GROUP BY gps.player_id, p.full_name
  ORDER BY batting_average DESC, hits DESC;
$$;
