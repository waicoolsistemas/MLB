/*
  # Create RPC function: reset_manager_password

  Moves the manager password reset logic into a single atomic PostgreSQL function,
  replacing 3 separate round-trips (SELECT team + bcrypt hash + UPDATE user) with 1.

  1. Function: reset_manager_password(p_team_id uuid)
    - Validates the team exists
    - Validates the team has a linked manager_user_id
    - Looks up the manager user email
    - Generates a random 10-character password
    - Hashes it using bcrypt via pgcrypto (compatible with bcryptjs on Node.js side)
    - Updates the user's password_hash
    - Returns: email and plaintext password (one-time visibility for admin)

  2. Error handling
    - TEAM_NOT_FOUND: team does not exist
    - NO_MANAGER_LINKED: team has no manager_user_id
    - MANAGER_USER_NOT_FOUND: linked user record missing

  3. Security
    - SECURITY DEFINER so it runs with owner privileges
    - search_path set to public to prevent path injection
*/

CREATE OR REPLACE FUNCTION reset_manager_password(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_user_id uuid;
  v_manager_email text;
  v_new_password text;
  v_password_hash text;
BEGIN
  SELECT manager_user_id
  INTO v_manager_user_id
  FROM teams
  WHERE id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  IF v_manager_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_MANAGER_LINKED';
  END IF;

  SELECT email
  INTO v_manager_email
  FROM users
  WHERE id = v_manager_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MANAGER_USER_NOT_FOUND';
  END IF;

  v_new_password := substr(replace(replace(encode(extensions.gen_random_bytes(8), 'base64'), '+', 'x'), '/', 'y'), 1, 10);

  v_password_hash := extensions.crypt(v_new_password, extensions.gen_salt('bf', 12));

  UPDATE users
  SET password_hash = v_password_hash
  WHERE id = v_manager_user_id;

  RETURN jsonb_build_object(
    'email', v_manager_email,
    'password', v_new_password
  );
END;
$$;
