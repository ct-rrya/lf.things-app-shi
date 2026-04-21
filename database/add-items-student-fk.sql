-- ============================================================
-- ADD FOREIGN KEY CONSTRAINT: items.student_id → students.student_id
-- Ensures items table is properly linked to students masterlist
-- ============================================================

-- Step 1: Check if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_items_student_id'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE items
    ADD CONSTRAINT fk_items_student_id
    FOREIGN KEY (student_id)
    REFERENCES students(student_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint added successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_student_id ON items(student_id);

-- Step 3: Verify the constraint
SELECT 
  'Foreign Key Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_items_student_id'
    ) THEN 'Exists ✓'
    ELSE 'Not Found ✗'
  END as status;

-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- 
-- 1. Creates a foreign key relationship:
--    items.student_id → students.student_id
--
-- 2. Enforces data integrity:
--    - Cannot insert an item with student_id that doesn't exist in students
--    - If student_id is updated in students, it updates in items too
--    - If student is deleted, item.student_id is set to NULL
--
-- 3. Improves query performance:
--    - Index on items.student_id speeds up JOINs
--
-- ============================================================
-- BENEFITS
-- ============================================================
--
-- ✓ Data Integrity: Items always reference valid students
-- ✓ Automatic Updates: Changes to student_id cascade to items
-- ✓ Better Queries: JOINs between items and students are faster
-- ✓ Prevents Orphans: Can't have items with invalid student_ids
--
-- ============================================================
-- TESTING
-- ============================================================
--
-- Test 1: Query items with student data
-- SELECT i.*, s.full_name, s.program, s.year_level
-- FROM items i
-- LEFT JOIN students s ON i.student_id = s.student_id;
--
-- Test 2: Check for orphaned items (should return 0)
-- SELECT COUNT(*) as orphaned_items
-- FROM items i
-- WHERE i.student_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM students s WHERE s.student_id = i.student_id
--   );
--
-- ============================================================
