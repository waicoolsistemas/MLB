/*
  # Create categories table

  1. New Tables
    - `categories`
      - `id` (uuid, primary key) - Unique identifier
      - `season_id` (uuid, references seasons.id) - The season this category belongs to
      - `name` (text, not null) - Category name, e.g. "Categoria Alta", "Categoria Baja"
      - `description` (text, nullable) - Optional description
      - `is_active` (boolean, default true) - Soft disable flag
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS enabled on categories table
    - SELECT/INSERT/UPDATE: anon and authenticated (backend handles authorization)

  3. Indexes
    - categories.season_id for fast lookups by season

  4. Triggers
    - Auto-update updated_at on categories table changes
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_season_id ON categories(season_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on categories for auth"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on categories for auth"
  ON categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on categories for auth"
  ON categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
