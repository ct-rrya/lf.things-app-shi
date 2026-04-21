-- ============================================================
-- CHECK NEW SIGNUP - See if auth_user_id was set
-- ============================================================

-- Check the student record for the account you just created
SELECT 
  student_id,
  full_name,
  email,
  auth_user_id,
  status,
  created_at
FROM students
ORDER BY created_at DESC
LIMIT 5;

-- Check if there's a matching auth user
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  s.student_id,
  s.full_name,
  s.auth_user_id as linked_auth_user_id
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
ORDER BY au.created_at DESC
LIMIT 5;

-- Count linked vs unlinked
SELECT 
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked,
  COUNT(*) - COUNT(auth_user_id) as unlinked
FROM students;
