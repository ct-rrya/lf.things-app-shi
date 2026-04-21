-- ============================================================================
-- VERIFY CONTACT FIELDS MIGRATION
-- ============================================================================
-- Run these queries to verify the contact fields are properly configured
-- ============================================================================

-- 1. Check if contact fields exist in profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('address', 'social_media', 'contact_phone')
ORDER BY column_name;

-- Expected output: 3 rows showing address, contact_phone, social_media

-- ============================================================================

-- 2. Check if contact fields were removed from items table
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name IN ('address', 'social_media', 'contact_phone')
ORDER BY column_name;

-- Expected output: 0 rows (these columns should NOT exist in items)

-- ============================================================================

-- 3. Verify items table has metadata column for owner snapshot
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name = 'metadata';

-- Expected output: 1 row showing metadata as jsonb

-- ============================================================================

-- 4. Sample query: Fetch item with owner contact info
-- This is how you'll query items with owner contact details

SELECT 
    i.id,
    i.name,
    i.category,
    i.status,
    i.metadata->>'owner_name' as owner_name,
    i.metadata->>'program' as program,
    i.metadata->>'year_section' as year_section,
    p.contact_phone,
    p.address,
    p.social_media,
    p.full_name as profile_name
FROM items i
LEFT JOIN profiles p ON i.user_id = p.id
LIMIT 5;

-- This shows how to access:
-- - Item details from items table
-- - Owner snapshot from metadata JSONB
-- - Current contact info from profiles table

-- ============================================================================

-- 5. Check for any items with NULL user_id (data integrity)
SELECT 
    COUNT(*) as items_without_user,
    COUNT(DISTINCT user_id) as unique_users
FROM items;

-- All items should have a user_id

-- ============================================================================

-- 6. Sample: Update user contact info (this updates all their items)
-- EXAMPLE ONLY - DO NOT RUN unless you want to test

/*
UPDATE profiles 
SET 
    contact_phone = '09123456789',
    address = 'Cebu City',
    social_media = '@johndoe'
WHERE full_name = 'test@example.com';
*/

-- After this update, all items registered by this user will show
-- the updated contact info when their QR codes are scanned

-- ============================================================================
