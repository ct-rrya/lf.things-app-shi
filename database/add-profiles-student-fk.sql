-- ============================================================
-- ADD FOREIGN KEY CONSTRAINT: profiles.student_id → students.student_id
-- Ensures profiles table is properly linked to students masterlist
-- ============================================================

-- Step 1: Add foreign key constraint
-- This ensures that every student_id in profiles must exist in students table
ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES students(student_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);

-- Step 3: Verify the constraint
SELECT 
  'Foreign Key Added Successfully!' as status,
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE constraint_name = 'fk_profiles_student_id';

-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- 
-- 1. Creates a foreign key relationship:
--    profiles.student_id → students.student_id
--
-- 2. Enforces data integrity:
--    - Cannot insert a profile with student_id that doesn't exist in students
--    - If student_id is updated in students, it updates in profiles too
--    - If student is deleted, profile.student_id is set to NULL
--
-- 3. Improves query performance:
--    - Index on profiles.student_id speeds up JOINs
--
-- ============================================================
-- BENEFITS
-- ============================================================
--
-- ✓ Data Integrity: Profiles always reference valid students
-- ✓ Automatic Updates: Changes to student_id cascade to profiles
-- ✓ Better Queries: JOINs between profiles and students are faster
-- ✓ Prevents Orphans: Can't have profiles with invalid student_ids
--
-- ============================================================
-- TESTING
-- ============================================================
--
-- Test 1: Try to insert profile with non-existent student_id (should fail)
-- INSERT INTO profiles (id, student_id) VALUES (gen_random_uuid(), '99-99999');
-- Expected: ERROR - violates foreign key constraint
--
-- Test 2: Query profiles with student data
-- SELECT p.*, s.full_name, s.program, s.year_level
-- FROM profiles p
-- LEFT JOIN students s ON p.student_id = s.student_id;
--
-- ============================================================
