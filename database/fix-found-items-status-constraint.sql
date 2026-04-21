-- Fix the status check constraint for found_items table

-- First, check what the current constraint allows
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'found_items' 
  AND con.contype = 'c'
  AND con.conname LIKE '%status%';

-- Drop the existing status check constraint
ALTER TABLE found_items 
  DROP CONSTRAINT IF EXISTS found_items_status_check;

-- Add the correct status check constraint
ALTER TABLE found_items 
  ADD CONSTRAINT found_items_status_check 
  CHECK (status IN ('pending', 'matched', 'claimed', 'returned'));

-- Verify the constraint was updated
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'found_items' 
  AND con.contype = 'c'
  AND con.conname LIKE '%status%';
