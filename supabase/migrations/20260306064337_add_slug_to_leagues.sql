/*
  # Add slug column to leagues

  1. Modified Tables
    - `leagues`
      - `slug` (text, unique, not null) - URL-friendly identifier for public pages

  2. Notes
    - Generates slug from existing league names using lower case and hyphens
    - Adds unique constraint to prevent duplicate slugs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'slug'
  ) THEN
    ALTER TABLE leagues ADD COLUMN slug text;

    UPDATE leagues SET slug = lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    );

    ALTER TABLE leagues ALTER COLUMN slug SET NOT NULL;
    ALTER TABLE leagues ALTER COLUMN slug SET DEFAULT '';
    ALTER TABLE leagues ADD CONSTRAINT leagues_slug_unique UNIQUE (slug);
  END IF;
END $$;
