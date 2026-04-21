-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO AI_MATCHES TABLE
-- ============================================================================
-- Run this ONLY if ai_matches table exists but is missing foreign keys
-- Run database/diagnose-ai-matches.sql first to check current state
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING CONSTRAINTS (if they exist with different names)
-- ============================================================================

DO $$
BEGIN
  -- Drop lost_item_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_matches_lost_item_id_fkey'
    AND table_name = 'ai_matches'
  ) THEN
    ALTER TABLE ai_matches DROP CONSTRAINT ai_matches_lost_item_id_fkey;
    RAISE NOTICE '✅ Dropped existing ai_matches_lost_item_id_fkey';
  END IF;

  -- Drop found_item_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_matches_found_item_id_fkey'
    AND table_name = 'ai_matches'
  ) THEN
    ALTER TABLE ai_matches DROP CONSTRAINT ai_matches_found_item_id_fkey;
    RAISE NOTICE '✅ Dropped existing ai_matches_found_item_id_fkey';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key for lost_item_id → items.id
ALTER TABLE ai_matches 
  ADD CONSTRAINT ai_matches_lost_item_id_fkey 
  FOREIGN KEY (lost_item_id) 
  REFERENCES items(id) 
  ON DELETE CASCADE;

-- Add foreign key for found_item_id → found_items.id
ALTER TABLE ai_matches 
  ADD CONSTRAINT ai_matches_found_item_id_fkey 
  FOREIGN KEY (found_item_id) 
  REFERENCES found_items(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_matches_lost_item_id 
  ON ai_matches(lost_item_id);

CREATE INDEX IF NOT EXISTS idx_ai_matches_found_item_id 
  ON ai_matches(found_item_id);

CREATE INDEX IF NOT EXISTS idx_ai_matches_status 
  ON ai_matches(status);

CREATE INDEX IF NOT EXISTS idx_ai_matches_created_at 
  ON ai_matches(created_at DESC);

-- ============================================================================
-- STEP 4: VERIFY CONSTRAINTS WERE ADDED
-- ============================================================================

DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
  AND table_name = 'ai_matches'
  AND constraint_name IN (
    'ai_matches_lost_item_id_fkey',
    'ai_matches_found_item_id_fkey'
  );
  
  IF fk_count = 2 THEN
    RAISE NOTICE '✅ SUCCESS: Foreign key constraints added successfully!';
    RAISE NOTICE '   - ai_matches_lost_item_id_fkey: Added';
    RAISE NOTICE '   - ai_matches_found_item_id_fkey: Added';
  ELSE
    RAISE WARNING '⚠️  Only % of 2 foreign keys were added', fk_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: DISPLAY FINAL FOREIGN KEY STATUS
-- ============================================================================

SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'ai_matches'
ORDER BY tc.constraint_name;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Your Supabase query should now work:
-- 
-- const { data, error } = await supabase
--   .from('ai_matches')
--   .select(`
--     *,
--     lost_item:items!ai_matches_lost_item_id_fkey(*)
--   `)
--   .eq('user_id', userId);
--
-- ============================================================================
