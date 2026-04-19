-- Add missing columns to scan_events table
-- Run this in Supabase SQL Editor

-- Add finder_contact column if it doesn't exist
ALTER TABLE scan_events 
ADD COLUMN IF NOT EXISTS finder_contact TEXT;

-- Add finder_email column if it doesn't exist
ALTER TABLE scan_events 
ADD COLUMN IF NOT EXISTS finder_email TEXT;

-- Add location_note column if it doesn't exist
ALTER TABLE scan_events 
ADD COLUMN IF NOT EXISTS location_note TEXT;

-- Add finder_user_id column if it doesn't exist
ALTER TABLE scan_events 
ADD COLUMN IF NOT EXISTS finder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scan_events'
ORDER BY ordinal_position;
