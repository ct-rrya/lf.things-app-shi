-- ============================================================
-- DIAGNOSE WHY STUDENTS ARE UNLINKED
-- ============================================================

-- Show students with accounts but auth_user_id is NULL
SELECT 
  s.student_id,
  s.full_name,
  s.email,
  s.auth_user_id,
  s.created_at as student_created_at,
  COUNT(au.id) as matching_auth_users
FROM students s
LEFT JOIN auth.users au ON s.student_id = au.raw_user_meta_data->>'student_id'
WHERE s.auth_user_id IS NULL
GROUP BY s.student_id, s.full_name, s.email, s.auth_user_id, s.created_at
ORDER BY s.created_at DESC;

-- Show auth users and what student_id they have in metadata
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'student_id' as student_id_in_metadata,
  au.raw_user_meta_data->>'name' as name_in_metadata,
  s.student_id as student_id_in_db,
  s.full_name as student_name_in_db,
  s.auth_user_id as linked_auth_user_id,
  au.created_at
FROM auth.users au
LEFT JOIN students s ON au.id = s.auth_user_id
ORDER BY au.created_at DESC
LIMIT 20;

-- Show the mismatch: auth users that should be linked but aren't
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'student_id' as student_id_from_metadata,
  s.student_id as student_id_in_db,
  s.full_name,
  s.auth_user_id,
  CASE 
    WHEN s.student_id IS NULL THEN 'Student ID not found in database'
    WHEN s.auth_user_id IS NULL THEN 'Student record exists but auth_user_id is NULL'
    WHEN s.auth_user_id != au.id THEN 'Student linked to different auth user'
    ELSE 'Properly linked'
  END as issue
FROM auth.users au
LEFT JOIN students s ON s.student_id = au.raw_user_meta_data->>'student_id'
WHERE au.raw_user_meta_data->>'student_id' IS NOT NULL
ORDER BY au.created_at DESC;
