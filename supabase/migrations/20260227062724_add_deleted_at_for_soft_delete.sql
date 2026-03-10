/*
  # Add soft delete support to playoff and game tables

  Adds a `deleted_at` column to tables involved in playoff bracket deletion,
  allowing soft deletes instead of permanent data removal.

  1. Modified Tables
    - `playoff_series` - Added `deleted_at` (timestamptz, nullable, default null)
    - `games` - Added `deleted_at` (timestamptz, nullable, default null)
    - `game_player_stats` - Added `deleted_at` (timestamptz, nullable, default null)

  2. Indexes
    - Partial indexes on each table for efficient filtering of active (non-deleted) records

  3. Important Notes
    - Existing records remain untouched (deleted_at = null = active)
    - All queries should filter WHERE deleted_at IS NULL to exclude soft-deleted records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playoff_series' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE playoff_series ADD COLUMN deleted_at timestamptz DEFAULT null;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE games ADD COLUMN deleted_at timestamptz DEFAULT null;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_player_stats' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE game_player_stats ADD COLUMN deleted_at timestamptz DEFAULT null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_playoff_series_active ON playoff_series(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_games_active ON games(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_game_player_stats_active ON game_player_stats(id) WHERE deleted_at IS NULL;
