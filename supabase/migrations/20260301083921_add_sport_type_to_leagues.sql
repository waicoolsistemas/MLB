/*
  # Add sport_type column to leagues table

  1. Modified Tables
    - `leagues`
      - Added `sport_type` (text, NOT NULL, DEFAULT 'softball')
      - Constrained to 'baseball' or 'softball' values via CHECK constraint

  2. Important Notes
    - Existing leagues will default to 'softball'
    - The CHECK constraint ensures only valid sport types can be stored
    - This field is intended to be immutable after creation (enforced at application level)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'sport_type'
  ) THEN
    ALTER TABLE leagues ADD COLUMN sport_type text NOT NULL DEFAULT 'softball';
    ALTER TABLE leagues ADD CONSTRAINT leagues_sport_type_check CHECK (sport_type IN ('baseball', 'softball'));
  END IF;
END $$;
