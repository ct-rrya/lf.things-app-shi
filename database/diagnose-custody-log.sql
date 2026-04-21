-- Diagnose custody log issues
-- Run this to check if the trigger exists and is working

-- 1. Check if custody_log table exists
SELECT 
    'Table Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'custody_log'
        ) THEN '✅ custody_log table exists'
        ELSE '❌ custody_log table does NOT exist'
    END as result;

-- 2. Check if trigger function exists
SELECT 
    'Trigger Function Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'auto_log_custody_change'
        ) THEN '✅ auto_log_custody_change function exists'
        ELSE '❌ auto_log_custody_change function does NOT exist'
    END as result;

-- 3. Check if trigger exists on items table
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'auto_custody_log_trigger'
        ) THEN '✅ auto_custody_log_trigger exists'
        ELSE '❌ auto_custody_log_trigger does NOT exist'
    END as result;

-- 4. Count items with status 'at_admin'
SELECT 
    'Items at Admin' as check_type,
    COUNT(*) as count
FROM items
WHERE status = 'at_admin';

-- 5. Count custody log entries
SELECT 
    'Custody Log Entries' as check_type,
    COUNT(*) as count
FROM custody_log;

-- 6. Show recent custody log entries
SELECT 
    'Recent Custody Entries' as info,
    cl.id,
    cl.action,
    cl.created_at,
    i.name as item_name,
    i.status as item_status
FROM custody_log cl
LEFT JOIN items i ON i.id = cl.item_id
ORDER BY cl.created_at DESC
LIMIT 10;

-- 7. Show items at admin without custody log entry
SELECT 
    'Items at Admin Without Log Entry' as info,
    i.id,
    i.name,
    i.status,
    i.updated_at
FROM items i
WHERE i.status = 'at_admin'
  AND NOT EXISTS (
    SELECT 1 FROM custody_log cl 
    WHERE cl.item_id = i.id 
    AND cl.action = 'received'
  )
ORDER BY i.updated_at DESC;
