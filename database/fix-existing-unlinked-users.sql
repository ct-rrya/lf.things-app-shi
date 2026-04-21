-- Script to Fix Existing Unlinked Users
-- Run this in Supabase SQL Editor to link existing auth users to student records

-- This query shows unlinked users (auth users without student records)
-- Run this first to see who needs to be linked:
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'student_id' as student_id_from_metadata,
  au.raw_user_meta_data->>'name' as name_from_metadata,
  au.created_at
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
WHERE s.id IS NULL
ORDER BY au.created_at DESC;

-- If you want to automatically link users based on their metadata:
-- WARNING: Review the above query results first before running this!

-- Option 1: Link users where student_id matches
UPDATE students s
SET 
  auth_user_id = au.id,
  email = COALESCE(s.email, au.email),
  full_name = COALESCE(s.full_name, au.raw_user_meta_data->>'name'),
  program = COALESCE(s.program, au.raw_user_meta_data->>'program'),
  year_level = COALESCE(s.year_level, au.raw_user_meta_data->>'year_level'),
  section = COALESCE(s.section, au.raw_user_meta_data->>'section'),
  updated_at = NOW()
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND s.status = 'active'
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;

-- Check results:
SELECT 
  COUNT(*) as total_linked_students
FROM students
WHERE auth_user_id IS NOT NULL;

-- Option 2: If you need to manually link specific users:
-- Replace the values below with actual data
/*
UPDATE students
SET 
  auth_user_id = 'AUTH_USER_ID_HERE',
  email = 'user@example.com',
  updated_at = NOW()
WHERE student_id = 'STUDENT_ID_HERE'
  AND auth_user_id IS NULL;
*/

-- Option 3: Create student records for auth users who don't have one
-- (Only if you want to allow users without pre-registered student IDs)
/*
INSERT INTO students (
  student_id,
  full_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id
)
SELECT 
  COALESCE(au.raw_user_meta_data->>'student_id', 'TEMP-' || au.id::text),
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'program', 'Unknown'),
  COALESCE(au.raw_user_meta_data->>'year_level', 'Unknown'),
  au.raw_user_meta_data->>'section',
  'active',
  au.id
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
WHERE s.id IS NULL;
*/
