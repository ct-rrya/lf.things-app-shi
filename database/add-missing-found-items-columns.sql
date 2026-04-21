-- Add missing columns to found_items table
-- Run this if you get errors about missing columns

-- Add ALL category-specific fields if they don't exist
DO $$ 
BEGIN
  -- ID-related fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'id_type') THEN
    ALTER TABLE found_items ADD COLUMN id_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'id_number') THEN
    ALTER TABLE found_items ADD COLUMN id_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'holder_name') THEN
    ALTER TABLE found_items ADD COLUMN holder_name TEXT;
  END IF;

  -- Keys fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'key_type') THEN
    ALTER TABLE found_items ADD COLUMN key_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'keychain') THEN
    ALTER TABLE found_items ADD COLUMN keychain TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'number_of_keys') THEN
    ALTER TABLE found_items ADD COLUMN number_of_keys TEXT;
  END IF;

  -- Electronics/General fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'brand') THEN
    ALTER TABLE found_items ADD COLUMN brand TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'model') THEN
    ALTER TABLE found_items ADD COLUMN model TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'color') THEN
    ALTER TABLE found_items ADD COLUMN color TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'serial_number') THEN
    ALTER TABLE found_items ADD COLUMN serial_number TEXT;
  END IF;

  -- Phone specific
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'case_description') THEN
    ALTER TABLE found_items ADD COLUMN case_description TEXT;
  END IF;

  -- Bottle/Container fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'size') THEN
    ALTER TABLE found_items ADD COLUMN size TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'stickers') THEN
    ALTER TABLE found_items ADD COLUMN stickers TEXT;
  END IF;

  -- Wallet fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'material') THEN
    ALTER TABLE found_items ADD COLUMN material TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'contents') THEN
    ALTER TABLE found_items ADD COLUMN contents TEXT;
  END IF;

  -- Bag fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'bag_type') THEN
    ALTER TABLE found_items ADD COLUMN bag_type TEXT;
  END IF;

  -- Watch fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'type') THEN
    ALTER TABLE found_items ADD COLUMN type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'features') THEN
    ALTER TABLE found_items ADD COLUMN features TEXT;
  END IF;

  -- Headphones fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'case_included') THEN
    ALTER TABLE found_items ADD COLUMN case_included TEXT;
  END IF;

  -- Other category
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'found_items' AND column_name = 'item_type') THEN
    ALTER TABLE found_items ADD COLUMN item_type TEXT;
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'found_items'
ORDER BY ordinal_position;
