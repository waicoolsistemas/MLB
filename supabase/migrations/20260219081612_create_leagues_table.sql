/*
  # Create leagues table

  1. New Tables
    - `leagues`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text, unique, not null) - League name, e.g. "Liga 3 Rios"
      - `description` (text, nullable) - Optional description
      - `logo_url` (text, nullable) - URL to league logo
      - `is_active` (boolean, default true) - Soft disable flag
      - `created_by` (uuid, references users.id) - Super admin who created it
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS enabled on leagues table
    - SELECT: anon and authenticated can read leagues (backend handles auth)
    - INSERT: anon and authenticated can insert (backend restricts to super_admin)
    - UPDATE: anon and authenticated can update (backend restricts to super_admin)

  3. Indexes
    - leagues.created_by for fast lookups by creator

  4. Triggers
    - Auto-update updated_at on leagues table changes (reuses existing function)
*/

CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on leagues for auth"
  ON leagues FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on leagues for auth"
  ON leagues FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on leagues for auth"
  ON leagues FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS leagues_updated_at ON leagues;
CREATE TRIGGER leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
