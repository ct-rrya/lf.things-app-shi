-- Add CTU Daanbantayan specific fields to profiles table

-- Add new columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS section TEXT;

-- Create index for student_id lookups
CREATE INDEX IF NOT EXISTS profiles_student_id_idx ON profiles(student_id);

-- Update items table to include 'at_admin' status
-- First, drop the existing constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;

-- Add the new constraint with 'at_admin' status
ALTER TABLE items ADD CONSTRAINT items_status_check 
  CHECK (status IN ('safe', 'lost', 'found', 'recovered', 'at_admin'));

-- Update the handle_new_user function to include student_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_id, program, year_level, section, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'program',
    NEW.raw_user_meta_data->>'year_level',
    NEW.raw_user_meta_data->>'section',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint to ensure student_id is required for new profiles
-- (Optional - uncomment if you want to enforce this at database level)
-- ALTER TABLE profiles ALTER COLUMN student_id SET NOT NULL;

-- CTU Daanbantayan campus locations enum (for reference)
-- These will be used in dropdowns throughout the app
COMMENT ON TABLE profiles IS 'CTU Daanbantayan student profiles with student ID verification';
COMMENT ON COLUMN items.status IS 'Item status: safe, lost, found, recovered, at_admin (turned in to Student Affairs Office)';
