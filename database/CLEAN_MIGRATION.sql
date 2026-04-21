-- ============================================================
-- CLEAN MIGRATION: Handles Existing Objects
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Drop existing indexes and constraints if they exist
-- ============================================================

DROP INDEX IF EXISTS idx_students_student_id;
DROP INDEX IF EXISTS idx_students_status;
DROP INDEX IF EXISTS idx_students_program;
DROP INDEX IF EXISTS idx_students_auth_user_id;
DROP INDEX IF EXISTS idx_students_email;

-- ============================================================
-- STEP 2: Backup and Create New Table
-- ============================================================

-- Rename old table as backup (if not already done)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students_old' AND table_schema = 'public') THEN
      ALTER TABLE students RENAME TO students_old;
    END IF;
  END IF;
END $$;

-- Drop new table if it exists (in case of retry)
DROP TABLE IF EXISTS students CASCADE;

-- Create new students table with student_id as primary key
CREATE TABLE students (
  student_id    TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  program       TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  section       TEXT,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'graduated')),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by      UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Create Indexes
-- ============================================================

CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_email ON students(email);

-- ============================================================
-- STEP 4: Migrate Data from Old Table
-- ============================================================

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
WHERE student_id IS NOT NULL
ON CONFLICT (student_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  program = EXCLUDED.program,
  year_level = EXCLUDED.year_level,
  section = EXCLUDED.section,
  status = EXCLUDED.status,
  auth_user_id = EXCLUDED.auth_user_id,
  updated_at = NOW();

-- ============================================================
-- STEP 5: Update Items Table
-- ============================================================

-- Add student_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE items ADD COLUMN student_id TEXT;
  END IF;
END $$;

-- Populate student_id from user_id
UPDATE items i
SET student_id = s.student_id
FROM students s
WHERE i.user_id = s.auth_user_id
  AND i.student_id IS NULL;

-- Drop old constraint if exists
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_student_id_fkey;

-- Add foreign key constraint
ALTER TABLE items
  ADD CONSTRAINT items_student_id_fkey 
    FOREIGN KEY (student_id) 
    REFERENCES students(student_id) 
    ON DELETE CASCADE;

-- Create index if not exists
DROP INDEX IF EXISTS idx_items_student_id;
CREATE INDEX idx_items_student_id ON items(student_id);

-- ============================================================
-- STEP 6: Update RLS Policies
-- ============================================================

-- Drop all existing policies on students
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can link their own student record" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can verify student_id"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Users can update own student record"
  ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Update items policies
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can insert their own items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

CREATE POLICY "Users can view their own items"
  ON items FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM students WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM students WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  USING (
    student_id IN (
      SELECT student_id FROM students WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own items"
  ON items FOR DELETE
  USING (
    student_id IN (
      SELECT student_id FROM students WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 7: Create Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION get_student_id(p_auth_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT student_id 
  FROM students 
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_auth_user_id(p_student_id TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth_user_id 
  FROM students 
  WHERE student_id = p_student_id
  LIMIT 1;
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
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_auth UUID;
  v_student_status TEXT;
BEGIN
  -- Check if student_id exists and get current auth_user_id
  SELECT auth_user_id, status 
  INTO v_existing_auth, v_student_status
  FROM students
  WHERE student_id = p_student_id;
  
  -- If student not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student ID % not found in database', p_student_id;
  END IF;
  
  -- If student is not active
  IF v_student_status != 'active' THEN
    RAISE EXCEPTION 'Student ID % is not active (status: %)', p_student_id, v_student_status;
  END IF;
  
  -- If already linked to a different account
  IF v_existing_auth IS NOT NULL AND v_existing_auth != p_auth_user_id THEN
    RAISE EXCEPTION 'Student ID % is already linked to another account', p_student_id;
  END IF;
  
  -- Update the student record
  UPDATE students
  SET 
    auth_user_id = p_auth_user_id,
    email = p_email,
    full_name = p_full_name,
    program = p_program,
    year_level = p_year_level,
    section = p_section,
    updated_at = NOW()
  WHERE student_id = p_student_id;
  
  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- ============================================================
-- STEP 8: Create Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 9: Create Views
-- ============================================================

DROP VIEW IF EXISTS user_profiles CASCADE;
DROP VIEW IF EXISTS items_with_student CASCADE;

CREATE VIEW user_profiles AS
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.program,
  s.year_level,
  s.section,
  s.status,
  s.auth_user_id,
  s.created_at,
  s.updated_at
FROM students s;

CREATE VIEW items_with_student AS
SELECT 
  i.id,
  i.student_id,
  i.name as item_name,
  i.category,
  i.status as item_status,
  i.qr_token,
  s.full_name as owner_name,
  s.email as owner_email,
  s.program as owner_program
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id;

-- ============================================================
-- STEP 10: Verification
-- ============================================================

DO $$
DECLARE
  v_old_count INT;
  v_new_count INT;
  v_linked_count INT;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM students_old;
  SELECT COUNT(*) INTO v_new_count FROM students;
  SELECT COUNT(*) INTO v_linked_count FROM students WHERE auth_user_id IS NOT NULL;
  
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Old table: % students', v_old_count;
  RAISE NOTICE 'New table: % students', v_new_count;
  RAISE NOTICE 'Linked: % students', v_linked_count;
  RAISE NOTICE 'Unlinked: % students', v_new_count - v_linked_count;
END $$;

-- Show summary
SELECT 
  'Students' as table_name,
  COUNT(*) as total,
  COUNT(auth_user_id) as linked,
  COUNT(*) - COUNT(auth_user_id) as unlinked
FROM students
UNION ALL
SELECT 
  'Items' as table_name,
  COUNT(*) as total,
  COUNT(student_id) as with_student_id,
  COUNT(*) - COUNT(student_id) as without_student_id
FROM items;

-- ============================================================
-- DONE!
-- ============================================================
-- Next step: Link unlinked users with this query:
--
-- UPDATE students s
-- SET auth_user_id = au.id
-- FROM auth.users au
-- WHERE s.student_id = au.raw_user_meta_data->>'student_id'
--   AND s.auth_user_id IS NULL
--   AND au.raw_user_meta_data->>'student_id' IS NOT NULL;
