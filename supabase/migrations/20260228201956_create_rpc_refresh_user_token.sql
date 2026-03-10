/*
  # Create RPC function: refresh_user_token

  Moves the refresh token rotation logic into a single atomic PostgreSQL function,
  replacing 3 separate round-trips (SELECT + UPDATE + INSERT) with 1.

  1. Function: refresh_user_token(p_token text)
    - Validates the provided refresh token exists, is not revoked, and is not expired
    - Validates the owning user exists and is active
    - Revokes the old refresh token (sets revoked = true)
    - Generates a new opaque refresh token (128-char hex string)
    - Inserts the new refresh token with a 7-day expiry
    - Returns: user_id, email, full_name, role, new_refresh_token

  2. Error handling
    - Raises specific exceptions for: invalid token, revoked token, expired token, inactive user
    - The caller (Express) maps these to appropriate HTTP status codes

  3. Security
    - SECURITY DEFINER so it runs with owner privileges regardless of caller
    - search_path set to public to prevent path injection
*/

CREATE OR REPLACE FUNCTION refresh_user_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
  v_user_id uuid;
  v_revoked boolean;
  v_expires_at timestamptz;
  v_user record;
  v_new_token text;
  v_new_expires_at timestamptz;
BEGIN
  SELECT id, user_id, revoked, expires_at
  INTO v_token_id, v_user_id, v_revoked, v_expires_at
  FROM refresh_tokens
  WHERE token = p_token;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  IF v_revoked THEN
    RAISE EXCEPTION 'TOKEN_REVOKED';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;

  SELECT id, email, full_name, role, is_active
  INTO v_user
  FROM users
  WHERE id = v_user_id;

  IF v_user IS NULL OR NOT v_user.is_active THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  UPDATE refresh_tokens
  SET revoked = true
  WHERE id = v_token_id;

  v_new_token := encode(gen_random_bytes(64), 'hex');
  v_new_expires_at := now() + interval '7 days';

  INSERT INTO refresh_tokens (user_id, token, expires_at)
  VALUES (v_user_id, v_new_token, v_new_expires_at);

  RETURN jsonb_build_object(
    'user_id', v_user.id,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'new_refresh_token', v_new_token
  );
END;
$$;
