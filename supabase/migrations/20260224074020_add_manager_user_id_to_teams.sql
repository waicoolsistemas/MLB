/*
  # Add manager_user_id to teams table

  1. Modified Tables
    - `teams`
      - `manager_user_id` (uuid, nullable, references users.id) - Links a team to its manager user account

  2. Indexes
    - `idx_teams_manager_user_id` on teams(manager_user_id) for fast lookups by manager

  3. Notes
    - A single manager user can be linked to multiple teams across different categories/seasons
    - The column is nullable because not all teams will have a manager account
    - ON DELETE SET NULL ensures if a user is removed, the team remains intact
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'manager_user_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN manager_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_manager_user_id ON teams(manager_user_id);
