-- Fix incorrectly imported student data
-- Run this in Supabase SQL Editor

-- Update all students where data is in wrong columns
-- Pattern: full_name has last name only, program has first name, year_level has actual program
UPDATE students
SET 
  full_name = full_name || ' ' || program,  -- Combine last name + first name
  program = year_level,                      -- Move actual program from year_level
  year_level = CASE 
    WHEN section = '1' THEN '1st Year'
    WHEN section = '2' THEN '2nd Year'
    WHEN section = '3' THEN '3rd Year'
    WHEN section = '4' THEN '4th Year'
    ELSE section
  END,                                       -- Convert year number to text
  section = NULL                             -- Clear section (you'll need to add this manually)
WHERE 
  -- Only update rows where program doesn't look like a program code
  program NOT IN ('BSIT', 'BSCS', 'BSHM', 'BSBA', 'BSED', 'BEED', 'BSFI', 'BSOA')
  AND year_level IN ('BSIT', 'BSCS', 'BSHM', 'BSBA', 'BSED', 'BEED', 'BSFI', 'BSOA');

-- Check the results
SELECT student_id, full_name, program, year_level, section 
FROM students 
ORDER BY student_id;
