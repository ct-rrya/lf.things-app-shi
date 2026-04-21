-- Diagnostic query to check found_items table structure

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'found_items'
);

-- Show all columns in found_items table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'found_items'
ORDER BY ordinal_position;

-- Show sample data if any exists
SELECT * FROM found_items LIMIT 5;
