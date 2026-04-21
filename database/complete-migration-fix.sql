-- ============================================================
-- COMPLETE MIGRATION FIX - Rebuild students table properly
-- ============================================================

-- Step 1: Check what we have
SELECT 'Current students table structure:' as step;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'students' ORDER BY ordinal_position;

-- Step 2: Backup current data
CREATE TABLE students_backup AS SELECT * FROM students;

-- Step 3: Drop the old table and all constraints
DROP TABLE IF EXISTS students CASCADE;

-- Step 4: Create the correct students table
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

-- Step 5: Restore data from backup
INSERT INTO students (
  student_id, full_name, email, program, year_level, section, 
  status, auth_user_id, added_by, created_at, updated_at
)
SELECT 
  student_id, full_name, email, program, year_level, section,
  status, auth_user_id, added_by, created_at, updated_at
FROM students_backup
ON CONFLICT (student_id) DO NOTHING;

-- Step 6: Create indexes
CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_email ON students(email);

-- Step 7: Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
CREATE POLICY "Admins can manage students" ON students FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can verify student_id" ON students FOR SELECT
  USING (true);

CREATE POLICY "Users can update own student record" ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Step 9: Verify
SELECT 'Migration complete!' as status;
SELECT COUNT(*) as total_students FROM students;
SELECT COUNT(auth_user_id) as linked_students FROM students WHERE auth_user_id IS NOT NULL;

-- Step 10: Clean up backup
DROP TABLE students_backup;
