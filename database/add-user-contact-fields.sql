-- ============================================================================
-- ADD CONTACT FIELDS TO PROFILES TABLE
-- ============================================================================
-- This migration adds address and social_media fields to the profiles table
-- These are user-specific contact details that should NOT be stored per-item
-- ============================================================================

-- Add contact fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS social_media TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Add comment explaining these fields
COMMENT ON COLUMN profiles.address IS 'User home/dorm address (optional, for QR code contact info)';
COMMENT ON COLUMN profiles.social_media IS 'User social media handle (optional, for QR code contact info)';
COMMENT ON COLUMN profiles.contact_phone IS 'User preferred contact phone (optional, for QR code contact info)';

-- ============================================================================
-- REMOVE CONTACT FIELDS FROM ITEMS TABLE (if they exist)
-- ============================================================================
-- These fields should NOT be in items table as they are user-specific

ALTER TABLE items 
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS social_media,
DROP COLUMN IF EXISTS contact_phone;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the changes

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('address', 'social_media', 'contact_phone')
ORDER BY column_name;
