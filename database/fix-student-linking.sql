-- Fix Student Linking Issue
-- This allows users to link themselves to their student record during signup

-- Create a function that users can call to link themselves
CREATE OR REPLACE FUNCTION link_student_account(
  p_student_id TEXT,
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_program TEXT,
  p_year_level TEXT,
  p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
BEGIN
  -- Update the student record to link it to the auth user
  UPDATE students
  SET 
    auth_user_id = p_auth_user_id,
    email = p_email,
    full_name = p_full_name,
    program = p_program,
    year_level = p_year_level,
    section = p_section,
    updated_at = NOW()
  WHERE student_id = p_student_id
    AND status = 'active'
    AND auth_user_id IS NULL; -- Only link if not already linked
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- Alternative: Add a policy to allow users to update their own student record during signup
-- This allows the UPDATE to work directly from the client
CREATE POLICY "Users can link their own student record"
  ON students FOR UPDATE
  USING (
    auth.uid() = auth_user_id OR
    (auth_user_id IS NULL AND status = 'active')
  )
  WITH CHECK (
    auth.uid() = auth_user_id
  );
