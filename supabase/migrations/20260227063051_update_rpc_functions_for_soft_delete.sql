/*
  # Update RPC functions for soft delete support

  Updates the `process_forfeit` and `save_game_stats` functions to use soft deletes
  instead of hard deletes when clearing old game_player_stats records.

  1. Modified Functions
    - `process_forfeit` - Changed DELETE to UPDATE SET deleted_at = now()
    - `save_game_stats` - Changed DELETE to UPDATE SET deleted_at = now(), added deleted_at IS NULL filter on final SELECT

  2. Important Notes
    - Old stats are soft-deleted (deleted_at set to current timestamp) before inserting new ones
    - New records are inserted fresh with deleted_at = NULL (default)
    - Final query only returns active (non-deleted) records
*/

CREATE OR REPLACE FUNCTION process_forfeit(
  p_game_id UUID,
  p_forfeit_team_id UUID,
  p_winner_runs INT,
  p_winner_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_game RECORD;
  v_winner_team_id UUID;
  v_home_score INT;
  v_away_score INT;
  v_pid UUID;
BEGIN
  SELECT id, home_team_id, away_team_id
    INTO v_game
    FROM games
   WHERE id = p_game_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF p_forfeit_team_id != v_game.home_team_id AND p_forfeit_team_id != v_game.away_team_id THEN
    RAISE EXCEPTION 'El equipo de forfeit debe ser uno de los equipos del juego';
  END IF;

  IF p_forfeit_team_id = v_game.home_team_id THEN
    v_winner_team_id := v_game.away_team_id;
  ELSE
    v_winner_team_id := v_game.home_team_id;
  END IF;

  IF v_winner_team_id = v_game.home_team_id THEN
    v_home_score := p_winner_runs;
    v_away_score := 0;
  ELSE
    v_home_score := 0;
    v_away_score := p_winner_runs;
  END IF;

  UPDATE game_player_stats SET deleted_at = now() WHERE game_id = p_game_id AND deleted_at IS NULL;

  UPDATE games
     SET status = 'forfeit',
         forfeit_team_id = p_forfeit_team_id,
         home_score = v_home_score,
         away_score = v_away_score,
         updated_at = now()
   WHERE id = p_game_id;

  FOREACH v_pid IN ARRAY p_winner_player_ids
  LOOP
    INSERT INTO game_player_stats (game_id, player_id, team_id, at_bats, hits, doubles, triples, home_runs, walks, strikeouts, runs, rbi)
    VALUES (p_game_id, v_pid, v_winner_team_id, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  END LOOP;

  RETURN jsonb_build_object('message', 'Forfeit registrado correctamente');
END;
$$;

CREATE OR REPLACE FUNCTION save_game_stats(
  p_game_id UUID,
  p_stats JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry JSONB;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = p_game_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  UPDATE game_player_stats SET deleted_at = now() WHERE game_id = p_game_id AND deleted_at IS NULL;

  IF jsonb_array_length(p_stats) > 0 THEN
    INSERT INTO game_player_stats (game_id, player_id, team_id, at_bats, hits, doubles, triples, home_runs, walks, strikeouts, runs, rbi)
    SELECT
      p_game_id,
      (entry->>'player_id')::UUID,
      (entry->>'team_id')::UUID,
      COALESCE((entry->>'at_bats')::INT, 0),
      COALESCE((entry->>'hits')::INT, 0),
      COALESCE((entry->>'doubles')::INT, 0),
      COALESCE((entry->>'triples')::INT, 0),
      COALESCE((entry->>'home_runs')::INT, 0),
      COALESCE((entry->>'walks')::INT, 0),
      COALESCE((entry->>'strikeouts')::INT, 0),
      COALESCE((entry->>'runs')::INT, 0),
      COALESCE((entry->>'rbi')::INT, 0)
    FROM jsonb_array_elements(p_stats) AS entry;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gps.id,
      'game_id', gps.game_id,
      'player_id', gps.player_id,
      'team_id', gps.team_id,
      'at_bats', gps.at_bats,
      'hits', gps.hits,
      'doubles', gps.doubles,
      'triples', gps.triples,
      'home_runs', gps.home_runs,
      'walks', gps.walks,
      'strikeouts', gps.strikeouts,
      'runs', gps.runs,
      'rbi', gps.rbi,
      'created_at', gps.created_at,
      'updated_at', gps.updated_at,
      'player_name', COALESCE(p.full_name, '')
    )
  )
  INTO v_result
  FROM game_player_stats gps
  LEFT JOIN players p ON p.id = gps.player_id
  WHERE gps.game_id = p_game_id
    AND gps.deleted_at IS NULL;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
