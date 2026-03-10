/*
  # Fix matchdays SELECT policy to allow soft-delete via UPDATE

  1. Problem
    - PostgreSQL RLS checks SELECT USING clause against the NEW row during UPDATE
    - The SELECT policy had USING (deleted_at IS NULL), which blocks updates that set deleted_at
    - This caused "new row violates row-level security policy" errors on soft-delete

  2. Changes
    - Replace SELECT policies for anon and authenticated to use USING (true)
    - Soft-delete filtering is handled at the application level in all queries

  3. Notes
    - The backend already filters with .is('deleted_at', null) on all SELECT queries
    - This change only affects matchdays table
*/

DROP POLICY IF EXISTS "Anon users can read matchdays" ON matchdays;
CREATE POLICY "Anon users can read matchdays"
  ON matchdays FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read matchdays" ON matchdays;
CREATE POLICY "Authenticated users can read matchdays"
  ON matchdays FOR SELECT
  TO authenticated
  USING (true);
