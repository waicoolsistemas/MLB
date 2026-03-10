/*
  # Add super_admin role to users table

  1. Modified Tables
    - `users`
      - Updated role CHECK constraint to include 'super_admin'
      - Changed existing admin@admin.com user role to 'super_admin'

  2. Important Notes
    - The super_admin role is the highest privilege level
    - super_admin can manage leagues, assign league admins, and oversee everything
    - No one can self-register as super_admin; accounts are created directly in the panel
*/

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'manager', 'player'));

UPDATE users SET role = 'super_admin' WHERE email = 'admin@admin.com';
