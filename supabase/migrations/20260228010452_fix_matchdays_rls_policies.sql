/*
  # Fix matchdays RLS policies

  1. Changes
    - Add INSERT policy for anon role (backend handles auth via JWT middleware)
    - Add UPDATE policy for anon role (backend handles auth via JWT middleware)

  2. Notes
    - The Express backend uses the anon key when service role key is unavailable
    - Backend routes already verify authentication and permissions before database calls
*/

CREATE POLICY "Anon users can insert matchdays"
  ON matchdays FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update matchdays"
  ON matchdays FOR UPDATE
  TO anon
  USING (deleted_at IS NULL)
  WITH CHECK (true);
