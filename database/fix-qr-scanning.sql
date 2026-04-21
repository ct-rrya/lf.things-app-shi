-- ============================================================================
-- FIX QR SCANNING SYSTEM
-- ============================================================================
-- This migration ensures the items table has a proper qr_code column
-- and generates QR codes for existing items
-- ============================================================================

-- Step 1: Ensure qr_code column exists (it should from complete-redesign-schema.sql)
-- If it doesn't exist, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'qr_code'
    ) THEN
        ALTER TABLE items ADD COLUMN qr_code TEXT;
    END IF;
END $$;

-- Step 2: Generate QR codes for items that don't have one
UPDATE items 
SET qr_code = 'LF-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE qr_code IS NULL OR qr_code = '';

-- Step 3: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'items_qr_code_key'
    ) THEN
        ALTER TABLE items ADD CONSTRAINT items_qr_code_key UNIQUE (qr_code);
    END IF;
END $$;

-- Step 4: Make qr_code NOT NULL
ALTER TABLE items ALTER COLUMN qr_code SET NOT NULL;

-- Step 5: Ensure index exists
CREATE INDEX IF NOT EXISTS idx_items_qr_code ON items(qr_code);

-- Step 6: Remove old qr_token column if it exists
ALTER TABLE items DROP COLUMN IF EXISTS qr_token;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check qr_code column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'items' AND column_name = 'qr_code';

-- Check for duplicate QR codes (should return 0)
SELECT qr_code, COUNT(*) 
FROM items 
GROUP BY qr_code 
HAVING COUNT(*) > 1;

-- Check for NULL QR codes (should return 0)
SELECT COUNT(*) as null_qr_codes
FROM items 
WHERE qr_code IS NULL;

-- Sample QR codes
SELECT id, name, qr_code 
FROM items 
LIMIT 5;
