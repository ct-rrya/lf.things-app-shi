-- Fix the action column constraint to allow 'turn_in' and 'have_it'
-- Run this in Supabase SQL Editor

-- First, check what values currently exist in the action column
SELECT action, COUNT(*) 
FROM scan_events 
GROUP BY action;

-- Option 1: Delete all existing rows (if you don't need them)
-- TRUNCATE scan_events;

-- Option 2: Update existing rows to valid values
-- UPDATE scan_events SET action = 'turn_in' WHERE action NOT IN ('turn_in', 'have_it');

-- Drop the old constraint (without validation)
ALTER TABLE scan_events 
DROP CONSTRAINT IF EXISTS scan_events_action_check;

-- Add new constraint with correct values
ALTER TABLE scan_events 
ADD CONSTRAINT scan_events_action_check 
CHECK (action IN ('turn_in', 'have_it')) NOT VALID;

-- Validate the constraint (this will fail if there are still invalid rows)
ALTER TABLE scan_events 
VALIDATE CONSTRAINT scan_events_action_check;

-- If validation fails, run this to see which rows are invalid:
-- SELECT * FROM scan_events WHERE action NOT IN ('turn_in', 'have_it');
