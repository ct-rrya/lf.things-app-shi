-- ============================================================
-- CHECK CUSTODY LOG STATUS
-- Run this to see your current situation before/after fix
-- ============================================================

-- 1. How many items are currently at admin?
SELECT 
  'Items at Admin' as check_type,
  COUNT(*) as count
FROM items 
WHERE status = 'at_admin';

-- 2. How many custody log entries exist?
SELECT 
  'Custody Log Entries' as check_type,
  COUNT(*) as count
FROM custody_log;

-- 3. Breakdown of custody log by action
SELECT 
  'Custody Actions' as check_type,
  action,
  COUNT(*) as count
FROM custody_log
GROUP BY action
ORDER BY count DESC;

-- 4. Items at admin WITHOUT custody log entries (the gap)
SELECT 
  'Items Missing Custody Entries' as check_type,
  COUNT(*) as count
FROM items i
WHERE i.status = 'at_admin'
  AND i.id NOT IN (
    SELECT DISTINCT item_id 
    FROM custody_log 
    WHERE action = 'received'
  );

-- 5. Check if trigger exists
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'auto_custody_log_trigger'
    ) THEN 'Installed ✓'
    ELSE 'Not Installed ✗'
  END as status;

-- 6. Check if trigger function exists
SELECT 
  'Trigger Function Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'auto_log_custody_change'
    ) THEN 'Installed ✓'
    ELSE 'Not Installed ✗'
  END as status;

-- ============================================================
-- INTERPRETATION GUIDE
-- ============================================================
-- 
-- BEFORE RUNNING auto-custody-log-trigger.sql:
-- - Items at Admin: X (some number)
-- - Custody Log Entries: 0 or very few
-- - Items Missing Custody Entries: X (same as items at admin)
-- - Trigger Status: Not Installed ✗
-- - Trigger Function Status: Not Installed ✗
--
-- AFTER RUNNING auto-custody-log-trigger.sql:
-- - Items at Admin: X (unchanged)
-- - Custody Log Entries: X (now has entries!)
-- - Items Missing Custody Entries: 0 (all backfilled)
-- - Trigger Status: Installed ✓
-- - Trigger Function Status: Installed ✓
--
-- ============================================================
