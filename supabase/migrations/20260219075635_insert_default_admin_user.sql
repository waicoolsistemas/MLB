/*
  # Insert default admin user

  1. Data Changes
    - Inserts a default admin user into the `users` table
    - Email: admin@admin.com
    - Password: Admin123! (stored as bcrypt hash with cost factor 12)
    - Role: admin
    - Full name: Administrador

  2. Important Notes
    - This is a seed user for initial access
    - The password should be changed after first login
    - Uses ON CONFLICT to avoid duplicates if re-run
*/

INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@admin.com',
  '$2a$12$LJ3m4ys3Lk0TSwMCkVc3fuBhEFcLD1mRMkSBl5VFML2gy.jJjuRCy',
  'Administrador',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;