-- ============================================================================
-- DIAGNOSE AI_MATCHES TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to check the current state
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF AI_MATCHES TABLE EXISTS
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_matches'
    ) 
    THEN '✅ ai_matches table EXISTS'
    ELSE '❌ ai_matches table DOES NOT EXIST'
  END as table_status;

-- ============================================================================
-- 2. CHECK COLUMNS IN AI_MATCHES TABLE
-- ============================================================================

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'ai_matches'
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
AND tc.table_name = 'ai_matches';

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
    ('found_items'),
    ('ai_matches')
) AS tables(table_name);

-- ============================================================================
-- 5. COUNT RECORDS IN AI_MATCHES (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_matches'
  ) THEN
    RAISE NOTICE 'Record count in ai_matches: %', (SELECT COUNT(*) FROM ai_matches);
  ELSE
    RAISE NOTICE '❌ ai_matches table does not exist';
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
AND tablename = 'ai_matches';

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- If ai_matches table DOES NOT EXIST:
--   → Run: database/create-ai-matches-table.sql
--
-- If ai_matches table EXISTS but has NO foreign keys:
--   → Run: database/add-ai-matches-foreign-keys.sql
--
-- If foreign keys exist but query still fails:
--   → The foreign key name might be different
--   → Use the fallback query approach (see fix-notifications-query.md)
--
-- ============================================================================
