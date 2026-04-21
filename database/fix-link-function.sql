-- ============================================================
-- FIX THE LINK_STUDENT_ACCOUNT FUNCTION
-- ============================================================

-- Drop the old function
DROP FUNCTION IF EXISTS link_student_account(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION link_student_account(
  p_student_id TEXT,
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_program TEXT,
  p_year_level TEXT,
  p_section TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE students SET 
    auth_user_id = p_auth_user_id,
    email = p_email,
    full_name = p_full_name,
    program = p_program,
    year_level = p_year_level,
    section = p_section,
    updated_at = NOW()
  WHERE student_id = p_student_id 
    AND status = 'active';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Return true if we updated a row, false if student not found or inactive
  RETURN v_updated_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION link_student_account TO authenticated;

-- Verify the function exists
SELECT 'Function fixed!' as status;
