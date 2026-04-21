-- ============================================================================
-- MIGRATE EXISTING ITEMS TO USE QR_CODE
-- ============================================================================
-- This script updates existing items that don't have qr_code values
-- It generates unique QR codes for them
-- ============================================================================

-- Step 1: Check current state
SELECT 
    COUNT(*) as total_items,
    COUNT(qr_code) as items_with_qr_code,
    COUNT(*) - COUNT(qr_code) as items_without_qr_code
FROM items;

-- Step 2: Show items without qr_code
SELECT id, name, category, created_at
FROM items
WHERE qr_code IS NULL OR qr_code = ''
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Generate QR codes for items that don't have one
-- Format: LF-[timestamp]-[random]
UPDATE items 
SET qr_code = 'LF-' || 
              EXTRACT(EPOCH FROM created_at)::BIGINT || '-' || 
              UPPER(SUBSTRING(MD5(id::TEXT || RANDOM()::TEXT) FROM 1 FOR 8))
WHERE qr_code IS NULL OR qr_code = '';

-- Step 4: Verify all items now have QR codes
SELECT 
    COUNT(*) as total_items,
    COUNT(qr_code) as items_with_qr_code,
    COUNT(*) FILTER (WHERE qr_code IS NULL OR qr_code = '') as items_without_qr_code
FROM items;

-- Step 5: Check for duplicates (should be 0)
SELECT qr_code, COUNT(*) as count
FROM items
GROUP BY qr_code
HAVING COUNT(*) > 1;

-- Step 6: Sample of generated QR codes
SELECT 
    id,
    name,
    qr_code,
    created_at
FROM items
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- OPTIONAL: If you want to keep using item IDs as QR codes (not recommended)
-- ============================================================================
/*
-- This will set qr_code to the item's UUID
-- Only use this if you want to keep existing QR codes working
UPDATE items 
SET qr_code = id::TEXT
WHERE qr_code IS NULL OR qr_code = '';
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- All items should have unique QR codes
SELECT 
    'Total Items' as metric,
    COUNT(*)::TEXT as value
FROM items
UNION ALL
SELECT 
    'Items with QR Code',
    COUNT(*)::TEXT
FROM items
WHERE qr_code IS NOT NULL AND qr_code != ''
UNION ALL
SELECT 
    'Unique QR Codes',
    COUNT(DISTINCT qr_code)::TEXT
FROM items
UNION ALL
SELECT 
    'Duplicate QR Codes',
    COUNT(*)::TEXT
FROM (
    SELECT qr_code
    FROM items
    GROUP BY qr_code
    HAVING COUNT(*) > 1
) duplicates;
