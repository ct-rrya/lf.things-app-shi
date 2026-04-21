-- ============================================================
-- DATABASE RESTRUCTURE: Student ID as Primary Key
-- This restructures the database to use student_id as the main identifier
-- ============================================================

-- BACKUP FIRST! Export your data before running this!

-- ============================================================
-- STEP 1: Drop existing constraints and policies
-- ============================================================

-- Drop existing policies on students table
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can link their own student record" ON students;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_students_student_id;
DROP INDEX IF EXISTS idx_students_status;
DROP INDEX IF EXISTS idx_students_program;

-- ============================================================
-- STEP 2: Create new students table with student_id as primary key
-- ============================================================

-- Rename old table as backup
ALTER TABLE IF EXISTS students RENAME TO students_old;

-- Create new students table
CREATE TABLE students (
  student_id    TEXT PRIMARY KEY,                    -- Now the primary key!
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,                         -- Unique email
  program       TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  section       TEXT,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'graduated')),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,  -- Unique, one student per auth user
  added_by      UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_email ON students(email);

-- ============================================================
-- STEP 3: Migrate data from old table
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
ON CONFLICT (student_id) DO NOTHING;

-- ============================================================
-- STEP 4: Update items table to reference student_id
-- ============================================================

-- Add student_id column to items if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Populate student_id from user_id
UPDATE items i
SET student_id = s.student_id
FROM students s
WHERE i.user_id = s.auth_user_id
  AND i.student_id IS NULL;

-- Add foreign key constraint
ALTER TABLE items 
  DROP CONSTRAINT IF EXISTS items_student_id_fkey,
  ADD CONSTRAINT items_student_id_fkey 
    FOREIGN KEY (student_id) 
    REFERENCES students(student_id) 
    ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_items_student_id ON items(student_id);

-- ============================================================
-- STEP 5: Update other tables to reference student_id
-- ============================================================

-- Update custody_log if needed
ALTER TABLE custody_log ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Update audit_log to track by student_id
-- (audit_log already uses target_id which can be student_id)

-- ============================================================
-- STEP 6: Create helper views for easy access
-- ============================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS user_profiles CASCADE;
DROP VIEW IF EXISTS items_with_student CASCADE;

-- View to get user info by auth_user_id
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
  s.updated_at,
  au.email as auth_email,
  au.created_at as auth_created_at
FROM students s
LEFT JOIN auth.users au ON au.id = s.auth_user_id;

-- View to get items with student info
CREATE VIEW items_with_student AS
SELECT 
  i.id,
  i.student_id,
  i.user_id,
  i.name as item_name,
  i.description,
  i.category,
  i.photo_url,
  i.qr_token,
  i.status as item_status,
  i.last_seen_location,
  i.last_seen_date,
  i.created_at as item_created_at,
  i.updated_at as item_updated_at,
  s.full_name as owner_name,
  s.email as owner_email,
  s.program as owner_program,
  s.year_level as owner_year,
  s.section as owner_section,
  s.status as student_status
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id;

-- ============================================================
-- STEP 7: Update RLS policies
-- ============================================================

-- Students table policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Admins can manage all students
CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone can verify if a student_id exists (for signup)
CREATE POLICY "Anyone can verify student_id"
  ON students FOR SELECT
  USING (true);

-- Users can update their own student record (for linking during signup)
CREATE POLICY "Users can update own student record"
  ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Items table policies (update to use student_id)
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
-- STEP 8: Create helper functions
-- ============================================================

-- Function to get student_id from auth_user_id
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

-- Function to get auth_user_id from student_id
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

-- Function to link student account (updated)
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
BEGIN
  -- Check if student_id exists
  SELECT auth_user_id INTO v_existing_auth
  FROM students
  WHERE student_id = p_student_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student ID % not found', p_student_id;
  END IF;
  
  IF v_existing_auth IS NOT NULL THEN
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
  WHERE student_id = p_student_id
    AND status = 'active';
  
  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- ============================================================
-- STEP 9: Update triggers
-- ============================================================

-- Ensure updated_at trigger exists
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
-- STEP 10: Verification queries
-- ============================================================

-- Check students table
SELECT 
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked_students,
  COUNT(*) - COUNT(auth_user_id) as unlinked_students
FROM students;

-- Check items table
SELECT 
  COUNT(*) as total_items,
  COUNT(student_id) as items_with_student_id,
  COUNT(user_id) as items_with_user_id
FROM items;

-- Check for orphaned items (items without valid student_id)
SELECT COUNT(*) as orphaned_items
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id
WHERE s.student_id IS NULL;

-- ============================================================
-- STEP 11: Cleanup (optional - run after verification)
-- ============================================================

-- After verifying everything works, you can:
-- DROP TABLE students_old;
-- ALTER TABLE items DROP COLUMN user_id; -- Keep for now as backup

-- ============================================================
-- NOTES
-- ============================================================

/*
Key Changes:
1. student_id is now the PRIMARY KEY (not UUID id)
2. auth_user_id is UNIQUE (one student per auth account)
3. email is UNIQUE (one email per student)
4. items table now references student_id instead of user_id
5. All queries should use student_id as the main identifier
6. Helper functions to convert between student_id and auth_user_id

Benefits:
- Cleaner data model
- Student ID is the source of truth
- Easier to understand and maintain
- Better data integrity
- Simpler queries

Migration Path:
1. Backup your database
2. Run this script
3. Update your application code to use student_id
4. Test thoroughly
5. Drop old tables after verification
*/
