-- ============================================================
-- LINK EXISTING AUTH USERS TO STUDENT RECORDS
-- Run this to connect auth accounts to student records
-- ============================================================

-- This will link auth users to students based on student_id in user metadata
UPDATE students s 
SET auth_user_id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;

-- Verify the results
SELECT 
  'Linking Complete!' as status,
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked_students,
  COUNT(*) - COUNT(auth_user_id) as still_unlinked
FROM students;

-- Show which students are still unlinked
SELECT 
  student_id,
  full_name,
  email,
  status,
  CASE 
    WHEN auth_user_id IS NULL THEN 'No account created yet'
    ELSE 'Linked'
  END as account_status
FROM students
WHERE auth_user_id IS NULL
ORDER BY full_name;

-- Show auth users that don't have a student record
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'student_id' as student_id_from_metadata,
  au.raw_user_meta_data->>'name' as name_from_metadata,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM students s WHERE s.auth_user_id = au.id
)
ORDER BY au.created_at DESC;
