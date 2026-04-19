-- ============================================================
-- MIGRATION: Move admin passcode from .env to database
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Add admin_passcodes table ─────────────────────────────
CREATE TABLE IF NOT EXISTS admin_passcodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,           -- e.g., "Main Admin Passcode"
  description TEXT,                    -- e.g., "Used for admin portal access"
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Insert the current passcode from .env ─────────────────
-- Replace 'ctu-admin-2025' with your current passcode
INSERT INTO admin_passcodes (passcode, name, description, is_active)
VALUES ('ctu-admin-2025', 'Main Admin Passcode', 'Default admin portal access code', true)
ON CONFLICT (passcode) DO NOTHING;

-- ── 3. Add RLS policies for admin_passcodes ──────────────────
ALTER TABLE admin_passcodes ENABLE ROW LEVEL SECURITY;

-- Only admins can view passcodes
CREATE POLICY "Admins can view passcodes"
  ON admin_passcodes FOR SELECT
  USING (is_admin());

-- Only superadmin can manage passcodes
CREATE POLICY "Superadmin can manage passcodes"
  ON admin_passcodes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- ── 4. Create function to validate admin passcode ────────────
CREATE OR REPLACE FUNCTION validate_admin_passcode(passcode_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_passcodes 
    WHERE passcode = passcode_input 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Update is_admin() function to also check passcode ─────
-- (Optional: Keep this for backward compatibility)
CREATE OR REPLACE FUNCTION is_admin_via_passcode(passcode_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is in admins table OR has valid passcode
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  ) OR validate_admin_passcode(passcode_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Create admin user if not exists ───────────────────────
-- First, you need to create a Supabase auth user for admin
-- Then run this to add them to admins table:
-- INSERT INTO admins (user_id, full_name, role)
-- VALUES ('auth-user-uuid-here', 'Admin Name', 'superadmin');

-- ── 7. Add updated_at trigger ────────────────────────────────
CREATE TRIGGER update_admin_passcodes_updated_at
  BEFORE UPDATE ON admin_passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. Test the migration ────────────────────────────────────
-- SELECT validate_admin_passcode('ctu-admin-2025'); -- Should return true
-- SELECT validate_admin_passcode('wrong-code');     -- Should return false