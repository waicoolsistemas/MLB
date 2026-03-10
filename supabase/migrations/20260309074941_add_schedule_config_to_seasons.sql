/*
  # Add schedule configuration to seasons

  1. Modified Tables
    - `seasons`
      - `schedule_type` (text) - Type of schedule: 'dominical' (Sundays only), 'semanal' (Mon-Fri), 'custom' (user picks days). Defaults to 'custom'.
      - `schedule_days` (integer[]) - Days of the week enabled for games (0=Sunday, 1=Monday, ..., 6=Saturday). Defaults to all days.
      - `games_per_day` (integer) - Max number of games per game day. Defaults to 1.
      - `default_time_slots` (text[]) - Starting times for each game slot in HH:MM format (e.g., '09:00', '11:00'). Defaults to empty.

  2. Important Notes
    - Existing seasons get schedule_type='custom' with all 7 days enabled, preserving current behavior
    - CHECK constraint ensures schedule_type is one of the three valid values
    - games_per_day must be at least 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'schedule_type'
  ) THEN
    ALTER TABLE seasons ADD COLUMN schedule_type text NOT NULL DEFAULT 'custom';
    ALTER TABLE seasons ADD CONSTRAINT seasons_schedule_type_check
      CHECK (schedule_type IN ('dominical', 'semanal', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'schedule_days'
  ) THEN
    ALTER TABLE seasons ADD COLUMN schedule_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'games_per_day'
  ) THEN
    ALTER TABLE seasons ADD COLUMN games_per_day integer NOT NULL DEFAULT 1;
    ALTER TABLE seasons ADD CONSTRAINT seasons_games_per_day_check
      CHECK (games_per_day >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'default_time_slots'
  ) THEN
    ALTER TABLE seasons ADD COLUMN default_time_slots text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
