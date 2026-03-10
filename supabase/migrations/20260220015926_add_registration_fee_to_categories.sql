/*
  # Add registration fee to categories

  1. Modified Tables
    - `categories`
      - Added `registration_fee` (numeric, NOT NULL, DEFAULT 0) - Base registration cost per team in this category

  2. Notes
    - This fee applies to all teams by default
    - Individual teams can override this via the team_fees table (created separately)
    - A value of 0 means no registration fee
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'registration_fee'
  ) THEN
    ALTER TABLE categories ADD COLUMN registration_fee numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
