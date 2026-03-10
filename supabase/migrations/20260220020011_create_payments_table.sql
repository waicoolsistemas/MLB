/*
  # Create payments table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key) - Unique identifier
      - `team_id` (uuid, references teams.id) - The team this payment belongs to
      - `category_id` (uuid, references categories.id) - The category context
      - `amount` (numeric, NOT NULL, > 0) - Payment amount
      - `payment_date` (date, NOT NULL, DEFAULT CURRENT_DATE) - When the payment was made
      - `payment_method` (text, DEFAULT '') - Cash, Transfer, Deposit, etc.
      - `notes` (text, DEFAULT '') - Optional notes
      - `created_by` (uuid, references users.id) - Who registered the payment
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS enabled
    - SELECT/INSERT/UPDATE/DELETE for anon and authenticated (backend handles authorization)

  3. Indexes
    - payments.team_id for fast lookups by team
    - payments.category_id for fast lookups by category

  4. Triggers
    - Auto-update updated_at on changes

  5. Notes
    - Each payment is an "abono" (partial payment) toward the team's registration fee
    - The sum of all payments for a team determines if they've paid in full
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT '',
  notes text DEFAULT '',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_team_id ON payments(team_id);
CREATE INDEX IF NOT EXISTS idx_payments_category_id ON payments(category_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on payments for auth"
  ON payments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on payments for auth"
  ON payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on payments for auth"
  ON payments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on payments for auth"
  ON payments FOR DELETE
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
