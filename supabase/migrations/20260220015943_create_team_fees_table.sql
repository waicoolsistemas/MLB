/*
  # Create team_fees table

  1. New Tables
    - `team_fees`
      - `id` (uuid, primary key) - Unique identifier
      - `team_id` (uuid, references teams.id, UNIQUE) - One custom fee per team
      - `amount` (numeric, NOT NULL) - Custom registration fee for this specific team
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Purpose
    - Allows overriding the category-level registration_fee for individual teams
    - If a team has no entry here, the category's registration_fee applies
    - If a team has an entry, this amount is used instead

  3. Security
    - RLS enabled
    - SELECT/INSERT/UPDATE/DELETE for anon and authenticated (backend handles authorization)

  4. Triggers
    - Auto-update updated_at on changes
*/

CREATE TABLE IF NOT EXISTS team_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_fees_team_id ON team_fees(team_id);

ALTER TABLE team_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on team_fees for auth"
  ON team_fees FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on team_fees for auth"
  ON team_fees FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on team_fees for auth"
  ON team_fees FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on team_fees for auth"
  ON team_fees FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS team_fees_updated_at ON team_fees;
CREATE TRIGGER team_fees_updated_at
  BEFORE UPDATE ON team_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
