-- ============================================================================
-- FIX PROFILES-STUDENTS LINKING (SAFE VERSION)
-- ============================================================================
-- This script safely fixes the relationship between profiles and students
-- It checks for column existence before running updates
-- ============================================================================

-- Step 1: Check and add auth_user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE students 
        ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added auth_user_id column to students table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists in students table';
    END IF;
END $$;

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Step 3: Link profiles to students by matching email
-- profiles.full_name often stores the email address
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE LOWER(profiles.full_name) = LOWER(students.email)
  AND profiles.student_id IS NULL
  AND students.email IS NOT NULL;

-- Step 4: Link students to auth users (reverse relationship)
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE LOWER(students.email) = LOWER(profiles.full_name)
  AND students.auth_user_id IS NULL
  AND students.email IS NOT NULL;

-- Step 5: Try to link by student_id if it exists in profiles
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE students.student_id = profiles.student_id 
  AND students.auth_user_id IS NULL
  AND profiles.student_id IS NOT NULL;

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
ORDER BY p.created_at DESC
LIMIT 10;

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
ORDER BY s.full_name
LIMIT 10;

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
LEFT JOIN students s ON p.student_id = s.student_id OR LOWER(p.full_name) = LOWER(s.email)
ORDER BY p.created_at DESC
LIMIT 20;
