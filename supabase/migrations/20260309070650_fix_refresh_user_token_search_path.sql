/*
  # Fix refresh_user_token search_path

  The function uses gen_random_bytes() from the pgcrypto extension,
  which is installed in the 'extensions' schema. The previous search_path
  only included 'public', causing the function call to fail.

  1. Changes
    - Updated search_path to include both 'public' and 'extensions'
    - No other logic changes
*/

CREATE OR REPLACE FUNCTION refresh_user_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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