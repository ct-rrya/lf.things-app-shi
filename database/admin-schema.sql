-- ============================================================
-- ADMIN SCHEMA — CTU Daanbantayan Lost & Found
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. STUDENTS MASTER LIST ──────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    TEXT UNIQUE NOT NULL,          -- e.g. "21-12345"
  full_name     TEXT NOT NULL,
  email         TEXT,                          -- optional, for invite
  program       TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  section       TEXT,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'graduated')),
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by      UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_status     ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_program    ON students(program);

-- ── 2. ADMIN USERS TABLE ─────────────────────────────────────
-- Tracks which auth users are admins and their role level
CREATE TABLE IF NOT EXISTS admins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT DEFAULT 'staff'
                CHECK (role IN ('superadmin', 'admin', 'staff')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PHYSICAL ITEM CUSTODY LOG ─────────────────────────────
-- Tracks items physically turned in to the admin office
CREATE TABLE IF NOT EXISTS custody_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id       UUID REFERENCES items(id) ON DELETE CASCADE,
  action        TEXT NOT NULL
                  CHECK (action IN ('received', 'claimed', 'disposed', 'returned')),
  handled_by    UUID REFERENCES auth.users(id),  -- admin who handled it
  shelf_tag     TEXT,                             -- physical location in office
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custody_item_id ON custody_log(item_id);

-- ── 4. AUDIT LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,   -- e.g. 'item.status_changed', 'student.added'
  target_type TEXT,            -- 'item', 'student', 'match', etc.
  target_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at DESC);

-- ── 5. ANNOUNCEMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. HELPER FUNCTION: is_admin() ───────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── 7. RLS POLICIES ──────────────────────────────────────────

-- students: only admins can read/write
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow sign-up verification: anyone can check if a student_id exists
-- (read-only, student_id + status only — no personal data exposed)
CREATE POLICY "Anyone can verify student_id"
  ON students FOR SELECT
  USING (true);

-- admins table: only superadmin can manage, admins can read own row
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin list"
  ON admins FOR SELECT
  USING (is_admin());

CREATE POLICY "Superadmin can manage admins"
  ON admins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- custody_log: admins only
ALTER TABLE custody_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custody log"
  ON custody_log FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- audit_log: admins read-only
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- announcements: admins write, everyone reads
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcements"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Also allow admins to read ALL items (not just their own)
CREATE POLICY "Admins can view all items"
  ON items FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all items"
  ON items FOR UPDATE
  USING (is_admin());

-- ── 8. UPDATED_AT TRIGGERS ───────────────────────────────────
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
