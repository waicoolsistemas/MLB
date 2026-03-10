/*
  # Create RPC functions for game stats operations

  1. New Functions
    - `process_forfeit(p_game_id, p_forfeit_team_id, p_winner_runs, p_winner_player_ids)`
      - Deletes existing stats for the game
      - Updates game status to 'forfeit' with scores
      - Inserts zero-stat rows for winner players
      - All in a single atomic transaction
    - `save_game_stats(p_game_id, p_stats)`
      - Deletes existing stats for the game
      - Inserts all stat rows from JSONB array
      - Returns inserted rows with player names
      - All in a single atomic transaction

  2. Purpose
    - Consolidate multiple HTTP calls into single RPC calls
    - Eliminate socket errors from rapid sequential requests
    - Ensure atomicity of multi-step operations
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
   WHERE id = p_game_id;

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

  DELETE FROM game_player_stats WHERE game_id = p_game_id;

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
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = p_game_id) THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  DELETE FROM game_player_stats WHERE game_id = p_game_id;

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
  WHERE gps.game_id = p_game_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;