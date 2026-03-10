/*
  # Add umpires and scorer columns to games table

  1. Modified Tables
    - `games`
      - `umpire_1` (text, nullable) - Name of the head umpire
      - `umpire_2` (text, nullable) - Name of the second umpire
      - `umpire_3` (text, nullable) - Name of the third umpire
      - `scorer` (text, nullable) - Name of the official scorer

  2. Notes
    - All fields are free text so admins can type any name
    - umpire_1 and scorer are required when marking a game as completed (enforced at app level)
    - umpire_2 and umpire_3 are optional
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'umpire_1'
  ) THEN
    ALTER TABLE games ADD COLUMN umpire_1 text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'umpire_2'
  ) THEN
    ALTER TABLE games ADD COLUMN umpire_2 text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'umpire_3'
  ) THEN
    ALTER TABLE games ADD COLUMN umpire_3 text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scorer'
  ) THEN
    ALTER TABLE games ADD COLUMN scorer text DEFAULT NULL;
  END IF;
END $$;
