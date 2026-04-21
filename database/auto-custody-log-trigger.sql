-- ============================================================
-- AUTO CUSTODY LOG TRIGGER
-- Automatically create custody log entries when item status changes
-- ============================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_log_custody_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'at_admin', log as 'received'
  IF NEW.status = 'at_admin' AND (OLD.status IS NULL OR OLD.status != 'at_admin') THEN
    INSERT INTO custody_log (item_id, action, notes, created_at)
    VALUES (
      NEW.id,
      'received',
      'Automatically logged when item status changed to at_admin',
      NOW()
    );
  END IF;
  
  -- When status changes from 'at_admin' to 'safe', log as 'returned'
  IF OLD.status = 'at_admin' AND NEW.status = 'safe' THEN
    INSERT INTO custody_log (item_id, action, notes, created_at)
    VALUES (
      NEW.id,
      'returned',
      'Automatically logged when item status changed from at_admin to safe',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS auto_custody_log_trigger ON items;

-- Create the trigger
CREATE TRIGGER auto_custody_log_trigger
  AFTER UPDATE OF status ON items
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_custody_change();

-- Verify
SELECT 'Trigger created successfully!' as status;

-- Backfill existing items with status 'at_admin'
-- Only creates entries for items that don't already have a 'received' entry
INSERT INTO custody_log (item_id, action, notes, created_at)
SELECT 
  id,
  'received',
  'Backfilled - item was already at admin',
  created_at
FROM items
WHERE status = 'at_admin'
  AND id NOT IN (
    SELECT DISTINCT item_id 
    FROM custody_log 
    WHERE action = 'received'
  );

-- Check results
SELECT 
  'Backfill complete!' as status,
  COUNT(*) as custody_entries_created
FROM custody_log
WHERE notes LIKE '%Backfilled%';
