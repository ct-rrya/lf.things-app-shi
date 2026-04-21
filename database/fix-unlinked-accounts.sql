-- ============================================================
-- FIX UNLINKED ACCOUNTS - Link auth users to students
-- ============================================================

-- Link all auth users to their student records based on student_id in metadata
UPDATE students s
SET auth_user_id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;

-- Verify the fix
SELECT 
  'Fix Complete!' as status,
  COUNT(*) as total_students,
  COUNT(auth_user_id) as now_linked,
  COUNT(*) - COUNT(auth_user_id) as still_unlinked
FROM students;

-- Show which students are still unlinked (if any)
SELECT 
  student_id,
  full_name,
  email,
  status,
  'No account created' as reason
FROM students
WHERE auth_user_id IS NULL
ORDER BY full_name;
