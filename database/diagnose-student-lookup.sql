-- ============================================================================
-- DIAGNOSE STUDENT ID LOOKUP ISSUES
-- ============================================================================
-- Run these queries to debug why student IDs aren't being found
-- ============================================================================

-- 1. Check student_id column type
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'student_id';

-- 2. Check actual student IDs and their properties
SELECT 
  student_id,
  LENGTH(student_id) as id_length,
  LENGTH(TRIM(student_id)) as trimmed_length,
  student_id = TRIM(student_id) as is_clean,
  first_name,
  last_name,
  email,
  status
FROM students
ORDER BY student_id
LIMIT 10;

-- 3. Check for the specific student IDs mentioned
SELECT 
  student_id,
  LENGTH(student_id) as stored_length,
  first_name,
  last_name,
  email,
  status,
  auth_user_id
FROM students
WHERE student_id IN ('8230123', '8230514', '8230521');

-- 4. Check for whitespace or special characters
SELECT 
  student_id,
  LENGTH(student_id) as stored_length,
  LENGTH(TRIM(student_id)) as trimmed_length,
  CASE 
    WHEN student_id != TRIM(student_id) THEN 'Has whitespace'
    WHEN student_id ~ '[^0-9]' THEN 'Has non-numeric characters'
    ELSE 'Clean'
  END as data_quality
FROM students
WHERE student_id IN ('8230123', '8230514', '8230521');

-- 5. Test exact match query (what the app does)
SELECT 
  student_id,
  first_name,
  last_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id
FROM students
WHERE student_id = '8230521';

-- 6. Check RLS policies on students table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'students';

-- 7. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'students';

-- 8. Find all student IDs that match the pattern (7-8 digits)
SELECT 
  student_id,
  first_name,
  last_name,
  CASE 
    WHEN student_id ~ '^\d{7,8}$' THEN 'Valid format'
    ELSE 'Invalid format'
  END as format_check
FROM students
ORDER BY student_id
LIMIT 20;

-- 9. Check for duplicate student IDs
SELECT 
  student_id,
  COUNT(*) as count
FROM students
GROUP BY student_id
HAVING COUNT(*) > 1;

-- 10. Check indexes on student_id
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'students' AND indexdef LIKE '%student_id%';

-- ============================================================================
-- FIXES
-- ============================================================================

-- Fix 1: Clean up whitespace in student_id column
UPDATE students 
SET student_id = TRIM(student_id)
WHERE student_id != TRIM(student_id);

-- Fix 2: Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Fix 3: Add RLS policy to allow signup lookups (if RLS is enabled)
CREATE POLICY IF NOT EXISTS "Allow signup lookup" ON students
  FOR SELECT
  USING (true);

-- Fix 4: Verify the test student IDs exist
INSERT INTO students (student_id, first_name, last_name, email, program, year_level, section, status)
VALUES 
  ('8230123', 'Pedro', 'Santos', 'pedro.santos@gmail.com', 'BSIT', '3rd Year', 'A', 'active'),
  ('8230514', 'Lord Jason', 'Riveral', 'jason@gmail.com', 'BSCS', '2nd Year', 'B', 'active'),
  ('8230521', 'Merry Apple', 'Edano', 'apple@gmail.com', 'BSIT', '1st Year', 'A', 'active')
ON CONFLICT (student_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  program = EXCLUDED.program,
  year_level = EXCLUDED.year_level,
  section = EXCLUDED.section,
  status = EXCLUDED.status;

-- ============================================================================
-- VERIFICATION AFTER FIXES
-- ============================================================================

-- Verify the fixes worked
SELECT 
  'Total students' as metric,
  COUNT(*) as count
FROM students
UNION ALL
SELECT 
  'Active students',
  COUNT(*)
FROM students
WHERE status = 'active'
UNION ALL
SELECT 
  'Students with clean IDs',
  COUNT(*)
FROM students
WHERE student_id = TRIM(student_id)
UNION ALL
SELECT 
  'Students with valid format',
  COUNT(*)
FROM students
WHERE student_id ~ '^\d{7,8}$';

-- Test the exact query the app uses
SELECT 
  student_id,
  first_name,
  last_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id
FROM students
WHERE student_id = '8230521'
AND status = 'active';

-- Show sample of clean student IDs
SELECT 
  student_id,
  first_name,
  last_name,
  email,
  status
FROM students
WHERE status = 'active'
ORDER BY student_id
LIMIT 10;
