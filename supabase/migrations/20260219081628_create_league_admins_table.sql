/*
  # Create league_admins table

  1. New Tables
    - `league_admins`
      - `id` (uuid, primary key) - Unique identifier
      - `league_id` (uuid, unique, references leagues.id) - UNIQUE ensures 1 admin per league
      - `user_id` (uuid, unique, references users.id) - UNIQUE ensures 1 league per admin
      - `is_active` (boolean, default true) - Soft disable flag
      - `assigned_at` (timestamptz) - When the admin was assigned
      - `assigned_by` (uuid, references users.id) - The super_admin who made the assignment

  2. Security
    - RLS enabled on league_admins table
    - SELECT/INSERT/UPDATE: anon and authenticated (backend handles authorization)

  3. Important Notes
    - The UNIQUE constraint on league_id ensures each league has exactly ONE admin
    - The UNIQUE constraint on user_id ensures each admin manages exactly ONE league
    - This is a 1:1 mapping between leagues and admin users
*/

CREATE TABLE IF NOT EXISTS league_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_league_admins_league_id ON league_admins(league_id);
CREATE INDEX IF NOT EXISTS idx_league_admins_user_id ON league_admins(user_id);

ALTER TABLE league_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on league_admins for auth"
  ON league_admins FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on league_admins for auth"
  ON league_admins FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on league_admins for auth"
  ON league_admins FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on league_admins for auth"
  ON league_admins FOR DELETE
  TO anon, authenticated
  USING (true);
