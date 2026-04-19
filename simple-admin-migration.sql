-- ============================================================
-- SIMPLE MIGRATION: Move admin passcode to database
-- No RPC functions required
-- ============================================================

-- 1. Create admin_passcodes table
CREATE TABLE IF NOT EXISTS admin_passcodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert current passcode
INSERT INTO admin_passcodes (passcode, name, description, is_active)
VALUES ('ctu-admin-2025', 'Main Admin Passcode', 'Default admin portal access code', true)
ON CONFLICT (passcode) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE admin_passcodes ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone to validate passcodes (read-only)
CREATE POLICY "Anyone can validate passcodes"
  ON admin_passcodes FOR SELECT
  USING (true);

-- 5. Only superadmin can manage passcodes
CREATE POLICY "Superadmin can manage passcodes"
  ON admin_passcodes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- 6. Test query (run this after migration):
-- SELECT * FROM admin_passcodes WHERE passcode = 'ctu-admin-2025' AND is_active = true;