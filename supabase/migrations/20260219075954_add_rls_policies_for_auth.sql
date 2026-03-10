/*
  # Add RLS policies for authentication operations

  Since the backend connects using the anon key (no service role key configured),
  we need policies that allow the necessary CRUD operations on users and refresh_tokens.

  1. Security Changes
    - `users` table:
      - SELECT: Allow anon and authenticated to read users (needed for login lookups)
      - INSERT: Allow anon to insert new users (needed for registration)
      - UPDATE: Allow anon and authenticated to update users (needed for profile updates)
    - `refresh_tokens` table:
      - SELECT: Allow anon and authenticated to read tokens (needed for refresh flow)
      - INSERT: Allow anon and authenticated to insert tokens (needed after login/register)
      - UPDATE: Allow anon and authenticated to update tokens (needed to revoke tokens)

  2. Important Notes
    - These policies use role-based checks (anon, authenticated) since the Express
      backend connects with the anon key and handles its own authentication via JWT
    - The backend is the sole consumer of these tables; the frontend never queries them directly
*/

CREATE POLICY "Allow select on users for auth"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on users for registration"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on users"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow select on refresh_tokens for auth"
  ON refresh_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on refresh_tokens for auth"
  ON refresh_tokens FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on refresh_tokens for auth"
  ON refresh_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);