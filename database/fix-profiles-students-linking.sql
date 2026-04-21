-- ============================================================================
-- FIX PROFILES-STUDENTS LINKING
-- ============================================================================
-- This script fixes the relationship between profiles (signed-up users) 
-- and students (masterlist) tables
-- ============================================================================

-- Step 1: Link profiles to students by matching email
-- profiles.full_name often stores the email address
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE profiles.full_name = students.email 
  AND profiles.student_id IS NULL;

-- Step 2: Link students to auth users (reverse relationship)
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE students.email = profiles.full_name 
  AND students.auth_user_id IS NULL;

-- Step 3: Try to link by student_id if it exists in profiles
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE students.student_id = profiles.student_id 
  AND students.auth_user_id IS NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check linking status
SELECT 
  'Total Profiles' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Profiles Linked to Students',
  COUNT(*)
FROM profiles
WHERE student_id IS NOT NULL
UNION ALL
SELECT 
  'Total Students',
  COUNT(*)
FROM students
UNION ALL
SELECT 
  'Students with Auth Accounts',
  COUNT(*)
FROM students
WHERE auth_user_id IS NOT NULL;

-- Show unlinked profiles (users without student records)
SELECT 
  p.id as profile_id,
  p.full_name as profile_email,
  p.student_id,
  p.display_name,
  p.created_at
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id
WHERE s.student_id IS NULL
ORDER BY p.created_at DESC;

-- Show students who haven't signed up yet
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.program,
  s.year_level,
  s.section,
  s.status
FROM students s
WHERE s.auth_user_id IS NULL
  AND s.status = 'active'
ORDER BY s.full_name;

-- Show complete linking status
SELECT 
  p.id as auth_user_id,
  p.full_name as profile_email,
  p.student_id as profile_student_id,
  p.display_name,
  s.student_id as student_student_id,
  s.full_name as student_name,
  s.email as student_email,
  s.program,
  s.year_level,
  s.section,
  CASE 
    WHEN p.student_id IS NOT NULL AND s.student_id IS NOT NULL THEN 'Linked ✓'
    WHEN p.student_id IS NULL THEN 'Unlinked - No Student ID'
    WHEN s.student_id IS NULL THEN 'Unlinked - Student Not Found'
    ELSE 'Unlinked'
  END as link_status
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id OR p.full_name = s.email
ORDER BY p.created_at DESC;
