/*
  # Add forfeit support to games

  1. Modified Tables
    - `games`
      - Add `forfeit_team_id` (uuid, nullable, references teams.id) - the team that did NOT show up
      - Update `status` CHECK constraint to include 'forfeit' as a valid value

  2. Important Notes
    - When status = 'forfeit', forfeit_team_id indicates which team forfeited (did not show up)
    - The opposing team automatically wins
    - All players of the winning team get credit for a game played
    - Only runs scored by the winning team are recorded
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'forfeit_team_id'
  ) THEN
    ALTER TABLE games ADD COLUMN forfeit_team_id uuid REFERENCES teams(id);
  END IF;
END $$;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;

ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'forfeit'));
