-- Fix scan_events table schema
-- This migration ensures the scan_events table has all required columns

-- Step 1: Check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  action TEXT,
  finder_name TEXT,
  finder_phone TEXT,
  finder_contact TEXT,
  finder_email TEXT,
  location_note TEXT,
  finder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add the 'action' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scan_events' AND column_name = 'action'
    ) THEN
        ALTER TABLE scan_events ADD COLUMN action TEXT;
        RAISE NOTICE 'Added action column to scan_events table';
    END IF;
END $$;

-- Step 3: Add other missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'scanner_type') THEN
        ALTER TABLE scan_events ADD COLUMN scanner_type TEXT NOT NULL DEFAULT 'web' CHECK (scanner_type IN ('app', 'web'));
        RAISE NOTICE 'Added scanner_type column to scan_events table';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'scanner_user_id') THEN
        ALTER TABLE scan_events ADD COLUMN scanner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'scanner_ip') THEN
        ALTER TABLE scan_events ADD COLUMN scanner_ip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'location') THEN
        ALTER TABLE scan_events ADD COLUMN location TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'action_taken') THEN
        ALTER TABLE scan_events ADD COLUMN action_taken TEXT CHECK (action_taken IN ('notified_owner', 'returned_to_ssg', 'chatted', 'viewed', 'reported_found'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'finder_name') THEN
        ALTER TABLE scan_events ADD COLUMN finder_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'finder_phone') THEN
        ALTER TABLE scan_events ADD COLUMN finder_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'finder_contact') THEN
        ALTER TABLE scan_events ADD COLUMN finder_contact TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'finder_email') THEN
        ALTER TABLE scan_events ADD COLUMN finder_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'location_note') THEN
        ALTER TABLE scan_events ADD COLUMN location_note TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_events' AND column_name = 'finder_user_id') THEN
        ALTER TABLE scan_events ADD COLUMN finder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 4: Drop the old CHECK constraint if it exists
ALTER TABLE scan_events DROP CONSTRAINT IF EXISTS scan_events_action_check;

-- Step 5: Add the CHECK constraint to include all valid action types
ALTER TABLE scan_events ADD CONSTRAINT scan_events_action_check 
  CHECK (action IN ('turn_in', 'have_it', 'turned_in_admin', 'left_it', 'contact_owner'));

-- Step 6: Add comment to document the action types
COMMENT ON COLUMN scan_events.action IS 
  'Action taken by finder: turn_in (turn in to SSG), have_it (finder has it), turned_in_admin (turn in to admin office), left_it (left at location), contact_owner (wants to chat)';

-- Step 7: Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_scan_events_item_id ON scan_events(item_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_created_at ON scan_events(created_at DESC);

-- Step 8: Enable RLS if not already enabled
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scan_events' AND policyname = 'Anyone can insert scan events'
    ) THEN
        CREATE POLICY "Anyone can insert scan events"
          ON scan_events FOR INSERT
          WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scan_events' AND policyname = 'Item owners can view scan events for their items'
    ) THEN
        CREATE POLICY "Item owners can view scan events for their items"
          ON scan_events FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM items
              WHERE items.id = scan_events.item_id
              AND items.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Step 10: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'scan_events'
ORDER BY ordinal_position;
