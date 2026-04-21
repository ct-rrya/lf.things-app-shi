-- ============================================================
-- SAFE MIGRATION: Run Each Section Separately
-- Copy and run each section one at a time in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: Backup and Prepare
-- ============================================================

-- Rename old table as backup
ALTER TABLE IF EXISTS students RENAME TO students_old;

-- ============================================================
-- SECTION 2: Create New Students Table
-- ============================================================

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
-- SECTION 3: Create Indexes
-- ============================================================

CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_email ON students(email);

-- ============================================================
-- SECTION 4: Migrate Data
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

-- Verify migration
SELECT 
  (SELECT COUNT(*) FROM students_old) as old_count,
  (SELECT COUNT(*) FROM students) as new_count;

-- ============================================================
-- SECTION 5: Update Items Table
-- ============================================================

-- Add student_id column if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Populate student_id from user_id
UPDATE items i
SET student_id = s.student_id
FROM students s
WHERE i.user_id = s.auth_user_id
  AND i.student_id IS NULL;

-- Add foreign key constraint
ALTER TABLE items 
  DROP CONSTRAINT IF EXISTS items_student_id_fkey;
  
ALTER TABLE items
  ADD CONSTRAINT items_student_id_fkey 
    FOREIGN KEY (student_id) 
    REFERENCES students(student_id) 
    ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_items_student_id ON items(student_id);

-- Verify items update
SELECT 
  COUNT(*) as total_items,
  COUNT(student_id) as items_with_student_id,
  COUNT(user_id) as items_with_user_id
FROM items;

-- ============================================================
-- SECTION 6: Drop Old Policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can link their own student record" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

-- ============================================================
-- SECTION 7: Create New RLS Policies for Students
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- SECTION 8: Update Items RLS Policies
-- ============================================================

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
-- SECTION 9: Create Helper Functions
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
BEGIN
  SELECT auth_user_id INTO v_existing_auth
  FROM students
  WHERE student_id = p_student_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student ID % not found', p_student_id;
  END IF;
  
  IF v_existing_auth IS NOT NULL THEN
    RAISE EXCEPTION 'Student ID % is already linked to another account', p_student_id;
  END IF;
  
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

GRANT EXECUTE ON FUNCTION get_student_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- ============================================================
-- SECTION 10: Create Triggers
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
-- SECTION 11: Create Views (Optional)
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
  s.email as owner_email
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id;

-- ============================================================
-- SECTION 12: Final Verification
-- ============================================================

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

-- Check for orphaned items
SELECT COUNT(*) as orphaned_items
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id
WHERE i.student_id IS NOT NULL AND s.student_id IS NULL;

-- ============================================================
-- DONE! 
-- ============================================================
-- If everything looks good, you can optionally:
-- DROP TABLE students_old;
