-- ============================================================================
-- ADMIN QUICK FIXES - Common SQL Commands
-- ============================================================================
-- Quick reference for common admin tasks and fixes
-- ============================================================================

-- ============================================================================
-- 1. LINKING FIXES
-- ============================================================================

-- Link profiles to students by email (most common fix)
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE profiles.full_name = students.email 
  AND profiles.student_id IS NULL;

-- Link students to auth users (reverse relationship)
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE students.email = profiles.full_name 
  AND students.auth_user_id IS NULL;

-- Link by existing student_id in profiles
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE students.student_id = profiles.student_id 
  AND students.auth_user_id IS NULL;

-- ============================================================================
-- 2. VERIFICATION QUERIES
-- ============================================================================

-- Quick status overview
SELECT 
  'Total Students' as metric,
  COUNT(*) as count
FROM students
UNION ALL
SELECT 
  'Students with Accounts',
  COUNT(*)
FROM students
WHERE auth_user_id IS NOT NULL
UNION ALL
SELECT 
  'Total Profiles',
  COUNT(*)
FROM profiles
UNION ALL
SELECT 
  'Profiles Linked',
  COUNT(*)
FROM profiles
WHERE student_id IS NOT NULL;

-- Show unlinked profiles (users without student records)
SELECT 
  p.id,
  p.full_name as email,
  p.student_id,
  p.display_name,
  p.created_at
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id
WHERE s.student_id IS NULL
ORDER BY p.created_at DESC;

-- Show students who haven't signed up
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.program,
  s.year_level,
  s.section
FROM students s
WHERE s.auth_user_id IS NULL
  AND s.status = 'active'
ORDER BY s.full_name;

-- Complete linking status report
SELECT 
  p.id as auth_id,
  p.full_name as profile_email,
  p.student_id as profile_sid,
  s.student_id as student_sid,
  s.full_name as student_name,
  s.email as student_email,
  s.program,
  s.year_level,
  CASE 
    WHEN p.student_id IS NOT NULL AND s.student_id IS NOT NULL THEN 'Linked ✓'
    WHEN p.student_id IS NULL THEN 'No Student ID in Profile'
    WHEN s.student_id IS NULL THEN 'Student Not Found'
    ELSE 'Unlinked'
  END as link_status
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id OR p.full_name = s.email
ORDER BY p.created_at DESC;

-- ============================================================================
-- 3. FIND SPECIFIC ISSUES
-- ============================================================================

-- Find profiles with student_id but no matching student
SELECT 
  p.id,
  p.student_id,
  p.full_name,
  'Student record not found' as issue
FROM profiles p
WHERE p.student_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.student_id = p.student_id
  );

-- Find students with auth_user_id but no matching profile
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.auth_user_id,
  'Profile not found' as issue
FROM students s
WHERE s.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = s.auth_user_id
  );

-- Find email mismatches
SELECT 
  p.id,
  p.full_name as profile_email,
  s.email as student_email,
  s.student_id,
  'Email mismatch' as issue
FROM profiles p
JOIN students s ON p.student_id = s.student_id
WHERE p.full_name != s.email;

-- Find duplicate student_ids in profiles
SELECT 
  student_id,
  COUNT(*) as count,
  array_agg(id) as profile_ids
FROM profiles
WHERE student_id IS NOT NULL
GROUP BY student_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- 4. MANUAL LINKING (when automatic fails)
-- ============================================================================

-- Link specific profile to student by email
UPDATE profiles 
SET student_id = '2021-12345'
WHERE full_name = 'student@university.edu';

-- Link specific student to auth user
UPDATE students 
SET auth_user_id = 'uuid-here'
WHERE student_id = '2021-12345';

-- Fix email in student record
UPDATE students 
SET email = 'correct@email.com'
WHERE student_id = '2021-12345';

-- ============================================================================
-- 5. CLEANUP OPERATIONS
-- ============================================================================

-- Remove invalid student_id from profiles (if student doesn't exist)
UPDATE profiles 
SET student_id = NULL
WHERE student_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.student_id = profiles.student_id
  );

-- Remove invalid auth_user_id from students (if profile doesn't exist)
UPDATE students 
SET auth_user_id = NULL
WHERE auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = students.auth_user_id
  );

-- ============================================================================
-- 6. BULK OPERATIONS
-- ============================================================================

-- Activate all inactive students
UPDATE students 
SET status = 'active'
WHERE status = 'inactive';

-- Deactivate graduated students
UPDATE students 
SET status = 'inactive'
WHERE status = 'graduated';

-- Update program for multiple students
UPDATE students 
SET program = 'BSIT'
WHERE student_id IN ('2021-12345', '2021-12346', '2021-12347');

-- ============================================================================
-- 7. REPORTING QUERIES
-- ============================================================================

-- Count users by program
SELECT 
  s.program,
  COUNT(DISTINCT s.student_id) as total_students,
  COUNT(DISTINCT s.auth_user_id) as signed_up_students,
  ROUND(COUNT(DISTINCT s.auth_user_id)::numeric / COUNT(DISTINCT s.student_id) * 100, 2) as signup_percentage
FROM students s
WHERE s.status = 'active'
GROUP BY s.program
ORDER BY s.program;

-- Count users by year level
SELECT 
  s.year_level,
  COUNT(DISTINCT s.student_id) as total_students,
  COUNT(DISTINCT s.auth_user_id) as signed_up_students
FROM students s
WHERE s.status = 'active'
GROUP BY s.year_level
ORDER BY s.year_level;

-- Recent signups (last 7 days)
SELECT 
  p.created_at,
  p.full_name as email,
  s.student_id,
  s.full_name as name,
  s.program,
  s.year_level
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id OR p.full_name = s.email
WHERE p.created_at >= NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;

-- Students by status
SELECT 
  status,
  COUNT(*) as count
FROM students
GROUP BY status
ORDER BY status;

-- ============================================================================
-- 8. PERFORMANCE CHECKS
-- ============================================================================

-- Check if indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'students')
ORDER BY tablename, indexname;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename IN ('profiles', 'students', 'items', 'found_items')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 9. EMERGENCY FIXES
-- ============================================================================

-- If a user can't login but exists in students table
-- 1. Check if they have an auth account
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.auth_user_id,
  CASE 
    WHEN s.auth_user_id IS NOT NULL THEN 'Has auth account'
    ELSE 'No auth account - needs to sign up'
  END as status
FROM students s
WHERE s.email = 'user@email.com';

-- 2. If they have auth_user_id, check if profile exists
SELECT 
  p.id,
  p.student_id,
  p.full_name,
  p.display_name
FROM profiles p
WHERE p.id = 'auth-user-id-here';

-- 3. Create missing profile link
INSERT INTO profiles (id, student_id, full_name)
VALUES ('auth-user-id', '2021-12345', 'student@email.com')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id;

-- ============================================================================
-- 10. DATA EXPORT (for backup or migration)
-- ============================================================================

-- Export students as CSV format
COPY (
  SELECT 
    student_id,
    full_name,
    email,
    program,
    year_level,
    section,
    status,
    created_at
  FROM students
  ORDER BY student_id
) TO '/tmp/students_backup.csv' WITH CSV HEADER;

-- Export profiles as CSV format
COPY (
  SELECT 
    id,
    student_id,
    full_name,
    display_name,
    created_at
  FROM profiles
  ORDER BY created_at
) TO '/tmp/profiles_backup.csv' WITH CSV HEADER;

-- Export linked users report
COPY (
  SELECT 
    p.id as auth_id,
    p.full_name as email,
    s.student_id,
    s.full_name as name,
    s.program,
    s.year_level,
    s.section,
    p.created_at as signup_date
  FROM profiles p
  JOIN students s ON p.student_id = s.student_id
  ORDER BY p.created_at DESC
) TO '/tmp/linked_users_report.csv' WITH CSV HEADER;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Always test queries on a small dataset first before running on production
-- Make backups before running UPDATE or DELETE operations
-- Use transactions for complex multi-step operations
-- Monitor query performance with EXPLAIN ANALYZE
-- Check RLS policies if queries return unexpected results
-- 
-- ============================================================================
