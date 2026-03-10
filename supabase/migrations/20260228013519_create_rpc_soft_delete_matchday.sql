/*
  # Create RPC function to soft-delete a matchday and its related data

  1. New Function
    - `soft_delete_matchday(p_matchday_id uuid)` 
    - Soft-deletes the matchday, its games, and game_player_stats in a single transaction
    - Returns the count of deleted games

  2. Notes
    - Replaces multiple sequential API calls with a single database call
    - Prevents socket exhaustion errors on the backend
    - All operations happen in one transaction for consistency
*/

CREATE OR REPLACE FUNCTION soft_delete_matchday(p_matchday_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_games integer;
BEGIN
  UPDATE game_player_stats
  SET deleted_at = now()
  WHERE game_id IN (
    SELECT id FROM games
    WHERE matchday_id = p_matchday_id AND deleted_at IS NULL
  )
  AND deleted_at IS NULL;

  UPDATE games
  SET deleted_at = now()
  WHERE matchday_id = p_matchday_id AND deleted_at IS NULL;

  GET DIAGNOSTICS v_deleted_games = ROW_COUNT;

  UPDATE matchdays
  SET deleted_at = now()
  WHERE id = p_matchday_id AND deleted_at IS NULL;

  RETURN v_deleted_games;
END;
$$;
