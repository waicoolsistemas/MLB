/*
  # Custom Auth Tables (No Supabase Auth)

  ## Summary
  Creates a fully custom authentication system using JWT tokens, completely
  independent from Supabase Auth. All password validation and token management
  is handled by a custom Express backend.

  ## New Tables

  ### users
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, unique, not null) - User email for login
  - `password_hash` (text, not null) - bcrypt hashed password, NEVER plain text
  - `full_name` (text, not null) - Display name
  - `role` (text, not null) - One of: 'admin', 'manager', 'player'
  - `is_active` (boolean, default true) - Soft disable without deleting
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### refresh_tokens
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references users.id) - Owner of the token
  - `token` (text, unique, not null) - The raw refresh token string
  - `expires_at` (timestamptz, not null) - Expiry date (7 days from creation)
  - `revoked` (boolean, default false) - Mark as revoked without deleting
  - `created_at` (timestamptz) - When token was issued

  ## Security
  - RLS enabled on both tables
  - NO public policies — all access is exclusively via the Express backend
    using the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
  - This means no frontend code can ever directly read or write these tables.

  ## Indexes
  - Index on users.email for fast login lookups
  - Index on refresh_tokens.token for fast token validation
  - Index on refresh_tokens.user_id for fast user session queries
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'manager', 'player')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
