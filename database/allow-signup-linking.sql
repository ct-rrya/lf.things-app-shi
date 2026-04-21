-- ============================================================
-- ALLOW SIGNUP LINKING - Let users link themselves during signup
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read students" ON students;
DROP POLICY IF EXISTS "Users can update own record" ON students;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can SELECT
CREATE POLICY "Public can read students" ON students FOR SELECT
  USING (true);

-- Policy 2: Authenticated users can UPDATE if:
--   - They're updating their own record (auth_user_id matches), OR
--   - The record doesn't have an auth_user_id yet (for initial linking)
CREATE POLICY "Users can link and update own record" ON students FOR UPDATE
  USING (
    auth.uid() = auth_user_id OR 
    auth_user_id IS NULL
  )
  WITH CHECK (
    auth.uid() = auth_user_id OR
    (auth_user_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- Verify
SELECT 'Policies updated!' as status;
SELECT policyname, cmd, qual, with_check FROM pg_policies 
WHERE tablename = 'students'
ORDER BY policyname;
