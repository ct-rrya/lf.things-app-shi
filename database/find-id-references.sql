-- ============================================================
-- FIND ALL REFERENCES TO students.id
-- ============================================================

-- Check for views that might reference students.id
SELECT table_schema, table_name, view_definition
FROM information_schema.views
WHERE view_definition LIKE '%students%id%'
  OR view_definition LIKE '%students.id%';

-- Check for functions that reference students.id
SELECT routine_schema, routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%students.id%'
  AND routine_type = 'FUNCTION';

-- Check for triggers
SELECT trigger_schema, trigger_name, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (action_statement LIKE '%students.id%' OR action_statement LIKE '%students%id%');

-- Check the link_student_account function specifically
SELECT routine_definition
FROM information_schema.routines
WHERE routine_name = 'link_student_account';
