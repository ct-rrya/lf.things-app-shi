-- ============================================================================
-- DIAGNOSE CHAT_THREADS TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to check the current state
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF CHAT_THREADS TABLE EXISTS
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_threads'
    ) 
    THEN '✅ chat_threads table EXISTS'
    ELSE '❌ chat_threads table DOES NOT EXIST'
  END as table_status;

-- ============================================================================
-- 2. CHECK COLUMNS IN CHAT_THREADS TABLE
-- ============================================================================

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'chat_threads'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CHECK EXISTING FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'chat_threads'
ORDER BY tc.constraint_name;

-- ============================================================================
-- 4. CHECK IF RELATED TABLES EXIST
-- ============================================================================

SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = tables.table_name
    ) 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('items'),
    ('chat_threads'),
    ('chat_messages')
) AS tables(table_name);

-- ============================================================================
-- 5. COUNT RECORDS IN CHAT_THREADS (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_threads'
  ) THEN
    RAISE NOTICE 'Record count in chat_threads: %', (SELECT COUNT(*) FROM chat_threads);
  ELSE
    RAISE NOTICE '❌ chat_threads table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 6. CHECK RLS STATUS
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_threads', 'chat_messages');

-- ============================================================================
-- 7. CHECK INDEXES
-- ============================================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'chat_threads'
ORDER BY indexname;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- If chat_threads table DOES NOT EXIST:
--   → Run: database/create-chat-tables-clean.sql
--
-- If chat_threads table EXISTS but has NO foreign keys:
--   → Run: database/add-chat-foreign-keys.sql
--
-- If foreign keys exist:
--   → Note the constraint names (e.g., chat_threads_item_id_fkey)
--   → Use those names in your Supabase query
--
-- If foreign key names are different:
--   → Use the fallback query approach (see FIX_CHAT_QUERY.md)
--
-- ============================================================================
