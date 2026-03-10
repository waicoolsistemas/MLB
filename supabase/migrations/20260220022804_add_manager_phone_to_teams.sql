/*
  # Add manager phone to teams table

  1. Modified Tables
    - `teams`
      - Added `manager_phone` (text, default '') - Phone number for the team manager

  2. Notes
    - Plain text field, no strict format validation
    - Defaults to empty string to match existing convention for optional text fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'manager_phone'
  ) THEN
    ALTER TABLE teams ADD COLUMN manager_phone text DEFAULT '';
  END IF;
END $$;