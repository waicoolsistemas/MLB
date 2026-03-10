/*
  # Create RPC function to fetch a league with its full season/category tree

  1. New Function
    - `get_my_league(p_user_id uuid)` returns jsonb
    - Replaces ~10 cascading queries in the GET /my-league endpoint with a single database call
    - Finds the league assigned to the given admin user
    - Returns the league object with nested seasons, each containing categories with teams_count

  2. Return Structure
    - League fields: id, name, description, logo_url, is_active, created_by, created_at, updated_at
    - Each season includes: id, league_id, name, start_date, end_date, is_active, created_by, created_at, updated_at
    - Each category includes: id, season_id, name, description, registration_fee, is_active, fixture_generated, created_at, updated_at, teams_count
    - Seasons ordered by created_at DESC, categories ordered by name ASC

  3. Error Handling
    - Raises exception 'NO_LEAGUE_ASSIGNED' if the user has no active league assignment
    - Raises exception 'LEAGUE_NOT_FOUND' if the league record does not exist

  4. Security
    - Uses SECURITY DEFINER to bypass RLS (same as other RPC functions)
    - Caller must validate authentication/authorization before invoking
*/

CREATE OR REPLACE FUNCTION get_my_league(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_id uuid;
  v_result jsonb;
BEGIN
  SELECT la.league_id INTO v_league_id
  FROM league_admins la
  WHERE la.user_id = p_user_id
    AND la.is_active = true
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'NO_LEAGUE_ASSIGNED';
  END IF;

  SELECT jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'description', l.description,
    'logo_url', l.logo_url,
    'is_active', l.is_active,
    'created_by', l.created_by,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'seasons', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'league_id', s.league_id,
          'name', s.name,
          'start_date', s.start_date,
          'end_date', s.end_date,
          'is_active', s.is_active,
          'created_by', s.created_by,
          'created_at', s.created_at,
          'updated_at', s.updated_at,
          'categories', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', c.id,
                'season_id', c.season_id,
                'name', c.name,
                'description', c.description,
                'registration_fee', c.registration_fee,
                'is_active', c.is_active,
                'fixture_generated', c.fixture_generated,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'teams_count', (
                  SELECT count(*)::int
                  FROM teams t
                  WHERE t.category_id = c.id
                )
              )
              ORDER BY c.name ASC
            )
            FROM categories c
            WHERE c.season_id = s.id
          ), '[]'::jsonb)
        )
        ORDER BY s.created_at DESC
      )
      FROM seasons s
      WHERE s.league_id = l.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM leagues l
  WHERE l.id = v_league_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;

  RETURN v_result;
END;
$$;
