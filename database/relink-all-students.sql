-- ============================================================
-- RELINK ALL STUDENTS - After fixing the function
-- ============================================================

-- Link all auth users to their student records
UPDATE students s
SET auth_user_id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL
  AND s.status = 'active';

-- Check results
SELECT 
  'Relinking Complete!' as status,
  COUNT(*) as total_students,
  COUNT(auth_user_id) as now_linked,
  COUNT(*) - COUNT(auth_user_id) as still_unlinked
FROM students;

-- Show any students still unlinked
SELECT 
  student_id,
  full_name,
  email,
  status,
  auth_user_id
FROM students
WHERE auth_user_id IS NULL
ORDER BY full_name;
