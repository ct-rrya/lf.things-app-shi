-- ============================================================================
-- ADD/FIX FOREIGN KEY CONSTRAINTS FOR CHAT_THREADS TABLE
-- ============================================================================
-- Run this if chat_threads exists but foreign keys are missing or incorrect
-- Run database/diagnose-chat-threads.sql first to check current state
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING CONSTRAINTS (if they exist)
-- ============================================================================

DO $$
BEGIN
  -- Drop item_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_threads_item_id_fkey'
    AND table_name = 'chat_threads'
  ) THEN
    ALTER TABLE chat_threads DROP CONSTRAINT chat_threads_item_id_fkey;
    RAISE NOTICE '✅ Dropped existing chat_threads_item_id_fkey';
  END IF;

  -- Drop owner_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_threads_owner_id_fkey'
    AND table_name = 'chat_threads'
  ) THEN
    ALTER TABLE chat_threads DROP CONSTRAINT chat_threads_owner_id_fkey;
    RAISE NOTICE '✅ Dropped existing chat_threads_owner_id_fkey';
  END IF;

  -- Drop finder_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_threads_finder_id_fkey'
    AND table_name = 'chat_threads'
  ) THEN
    ALTER TABLE chat_threads DROP CONSTRAINT chat_threads_finder_id_fkey;
    RAISE NOTICE '✅ Dropped existing chat_threads_finder_id_fkey';
  END IF;
  
  -- Drop old constraint names if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE 'chat_threads_registered_item%'
    AND table_name = 'chat_threads'
  ) THEN
    EXECUTE 'ALTER TABLE chat_threads DROP CONSTRAINT ' || 
      (SELECT constraint_name FROM information_schema.table_constraints 
       WHERE constraint_name LIKE 'chat_threads_registered_item%' 
       AND table_name = 'chat_threads' LIMIT 1);
    RAISE NOTICE '✅ Dropped old registered_item constraint';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key for item_id → items.id
ALTER TABLE chat_threads 
  ADD CONSTRAINT chat_threads_item_id_fkey 
  FOREIGN KEY (item_id) 
  REFERENCES items(id) 
  ON DELETE CASCADE;

-- Add foreign key for owner_id → auth.users.id
ALTER TABLE chat_threads 
  ADD CONSTRAINT chat_threads_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add foreign key for finder_id → auth.users.id
ALTER TABLE chat_threads 
  ADD CONSTRAINT chat_threads_finder_id_fkey 
  FOREIGN KEY (finder_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: CREATE/UPDATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_threads_item_id 
  ON chat_threads(item_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_owner_id 
  ON chat_threads(owner_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_finder_id 
  ON chat_threads(finder_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_status 
  ON chat_threads(status);

CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at 
  ON chat_threads(updated_at DESC);

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
  AND table_name = 'chat_threads'
  AND constraint_name IN (
    'chat_threads_item_id_fkey',
    'chat_threads_owner_id_fkey',
    'chat_threads_finder_id_fkey'
  );
  
  IF fk_count = 3 THEN
    RAISE NOTICE '✅ SUCCESS: All foreign key constraints added successfully!';
    RAISE NOTICE '   - chat_threads_item_id_fkey: Added';
    RAISE NOTICE '   - chat_threads_owner_id_fkey: Added';
    RAISE NOTICE '   - chat_threads_finder_id_fkey: Added';
  ELSE
    RAISE WARNING '⚠️  Only % of 3 foreign keys were added', fk_count;
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
AND tc.table_name = 'chat_threads'
ORDER BY tc.constraint_name;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Your Supabase query should now work with:
-- 
-- const { data, error } = await supabase
--   .from('chat_threads')
--   .select(`
--     *,
--     item:items!chat_threads_item_id_fkey(id, name, category, photo_urls)
--   `)
--   .or(`owner_id.eq.${userId},finder_id.eq.${userId}`)
--   .order('updated_at', { ascending: false });
--
-- ============================================================================
