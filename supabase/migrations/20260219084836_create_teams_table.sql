/*
  # Create teams table

  1. New Tables
    - `teams`
      - `id` (uuid, primary key) - Unique identifier
      - `category_id` (uuid, references categories.id) - The category this team belongs to
      - `name` (text, not null) - Team name
      - `logo_url` (text, default '') - URL to team logo
      - `manager_name` (text, default '') - Name of the team manager
      - `is_active` (boolean, default true) - Soft disable flag
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Constraints
    - Unique constraint on (category_id, name) to prevent duplicate team names within a category

  3. Security
    - RLS enabled on teams table
    - SELECT/INSERT/UPDATE: anon and authenticated (backend handles authorization)

  4. Indexes
    - teams.category_id for fast lookups by category

  5. Triggers
    - Auto-update updated_at on teams table changes
*/

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text DEFAULT '',
  manager_name text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_category_id ON teams(category_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on teams for auth"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on teams for auth"
  ON teams FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on teams for auth"
  ON teams FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
