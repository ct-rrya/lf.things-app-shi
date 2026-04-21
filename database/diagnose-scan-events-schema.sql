-- Diagnose the current scan_events table schema
-- Run this to see what columns actually exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'scan_events'
ORDER BY 
    ordinal_position;

-- Also check for any constraints
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'scan_events';
