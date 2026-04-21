-- ============================================================================
-- FIX PROFILES-STUDENTS LINKING (SIMPLE VERSION - NO AUTH_USER_ID NEEDED)
-- ============================================================================
-- This script links profiles to students WITHOUT requiring auth_user_id column
-- It only updates the profiles.student_id field
-- ============================================================================

-- Step 1: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Step 2: Link profiles to students by matching email
-- profiles.full_name often stores the email address
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE LOWER(profiles.full_name) = LOWER(students.email)
  AND profiles.student_id IS NULL
  AND students.email IS NOT NULL;

-- Step 3: Show results
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
  'Profiles Still Unlinked',
  COUNT(*)
FROM profiles
WHERE student_id IS NULL;

-- Step 4: Show unlinked profiles (need manual attention)
SELECT 
  p.id as profile_id,
  p.full_name as profile_email,
  p.student_id,
  p.display_name,
  'No matching student found' as issue
FROM profiles p
LEFT JOIN students s ON LOWER(p.full_name) = LOWER(s.email)
WHERE p.student_id IS NULL
  AND s.student_id IS NULL
ORDER BY p.created_at DESC;

-- Step 5: Show successfully linked profiles
SELECT 
  p.id as auth_user_id,
  p.full_name as profile_email,
  p.student_id,
  s.full_name as student_name,
  s.email as student_email,
  s.program,
  s.year_level,
  s.section,
  'Linked ✓' as status
FROM profiles p
JOIN students s ON p.student_id = s.student_id
ORDER BY p.created_at DESC
LIMIT 20;
