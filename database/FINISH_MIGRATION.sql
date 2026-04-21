-- ============================================================
-- FINISH MIGRATION - Run only the remaining parts
-- This assumes students_old already exists and students table needs to be recreated
-- ============================================================

-- Drop the new students table if it exists (to start fresh)
DROP TABLE IF EXISTS students CASCADE;

-- Recreate students table with student_id as primary key
CREATE TABLE students (
  student_id    TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  program       TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  section       TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by      UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_email ON students(email);

-- Migrate data from backup (explicitly list columns to match)
INSERT INTO students (
  student_id,
  full_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id,
  added_by,
  created_at,
  updated_at
)
SELECT 
  student_id,
  full_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id,
  added_by,
  created_at,
  updated_at
FROM students_old
ON CONFLICT (student_id) DO NOTHING;

-- Update items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS student_id TEXT;

UPDATE items i SET student_id = s.student_id
FROM students s WHERE i.user_id = s.auth_user_id AND i.student_id IS NULL;

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_student_id_fkey;
ALTER TABLE items ADD CONSTRAINT items_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_items_student_id;
CREATE INDEX idx_items_student_id ON items(student_id);

-- RLS Policies for students
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage students" ON students FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can verify student_id" ON students FOR SELECT USING (true);

CREATE POLICY "Users can update own student record" ON students FOR UPDATE
  USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for items
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can insert their own items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

CREATE POLICY "Users can view their own items" ON items FOR SELECT
  USING (student_id IN (SELECT student_id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own items" ON items FOR INSERT
  WITH CHECK (student_id IN (SELECT student_id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own items" ON items FOR UPDATE
  USING (student_id IN (SELECT student_id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own items" ON items FOR DELETE
  USING (student_id IN (SELECT student_id FROM students WHERE auth_user_id = auth.uid()));

-- Helper functions
CREATE OR REPLACE FUNCTION get_student_id(p_auth_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT student_id FROM students WHERE auth_user_id = p_auth_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_auth_user_id(p_student_id TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth_user_id FROM students WHERE student_id = p_student_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION link_student_account(
  p_student_id TEXT,
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_program TEXT,
  p_year_level TEXT,
  p_section TEXT
)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE students SET 
    auth_user_id = p_auth_user_id,
    email = p_email,
    full_name = p_full_name,
    program = p_program,
    year_level = p_year_level,
    section = p_section,
    updated_at = NOW()
  WHERE student_id = p_student_id 
    AND status = 'active'
    AND (auth_user_id IS NULL OR auth_user_id = p_auth_user_id)
  RETURNING true;
$$;

GRANT EXECUTE ON FUNCTION get_student_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 
  'Migration Complete!' as status,
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked_students,
  COUNT(*) - COUNT(auth_user_id) as unlinked_students
FROM students;

-- ============================================================
-- NEXT STEP: Link existing users
-- Run this after the migration completes:
-- ============================================================

UPDATE students s 
SET auth_user_id = au.id
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;

-- Check results
SELECT 
  'Linking Complete!' as status,
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked_students,
  COUNT(*) - COUNT(auth_user_id) as still_unlinked
FROM students;
