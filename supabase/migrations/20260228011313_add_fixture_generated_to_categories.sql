/*
  # Add fixture_generated flag to categories

  1. Modified Tables
    - `categories`
      - `fixture_generated` (boolean, default false) - Tracks whether the automatic fixture/matchday generation has been run for this category

  2. Notes
    - Flag is set to true after successful fixture generation
    - Flag is reset to false when all games are deleted, allowing re-generation
    - No RLS changes needed; existing policies already cover updates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'fixture_generated'
  ) THEN
    ALTER TABLE categories ADD COLUMN fixture_generated boolean DEFAULT false NOT NULL;
  END IF;
END $$;
