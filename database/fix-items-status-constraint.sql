-- Fix items table status constraint to include all needed values
-- This ensures the status values used by the application are allowed

-- Step 1: Check current constraint
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'items'
    AND con.conname LIKE '%status%';

-- Step 2: Drop the old status constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;

-- Step 3: Add new constraint with all valid status values
-- Combining values from both schemas to ensure compatibility
ALTER TABLE items ADD CONSTRAINT items_status_check 
  CHECK (status IN (
    'safe',        -- Item is safe with owner
    'lost',        -- Item is lost
    'found',       -- Item has been found by someone
    'claimed',     -- Item has been claimed by owner
    'returned',    -- Item has been returned to owner
    'recovered',   -- Item has been recovered (legacy)
    'at_admin'     -- Item is at admin/SSG office
  ));

-- Step 4: Add comment to document the status values
COMMENT ON COLUMN items.status IS 
  'Item status: safe (with owner), lost (missing), found (someone found it), at_admin (at SSG office), claimed (owner claimed it), returned (returned to owner), recovered (legacy)';

-- Step 5: Verify the constraint
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'items'
    AND con.conname = 'items_status_check';
