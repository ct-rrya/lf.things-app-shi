-- ============================================================
-- VERIFY STUDENTS TABLE STRUCTURE
-- ============================================================

-- Check the actual columns in the students table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- Check if there's an 'id' column anywhere
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'id';

-- Check the primary key
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'students';

-- Try a simple select to see if it works
SELECT student_id, full_name, status FROM students LIMIT 1;
