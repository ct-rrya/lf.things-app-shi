-- ============================================================
-- SIMPLE RLS FIX - Remove admin recursion
-- ============================================================

-- Drop all students policies
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can SELECT (no admin check needed since we have a separate policy)
CREATE POLICY "Public can read students" ON students FOR SELECT
  USING (true);

-- Policy 2: Only authenticated users who ARE the student can UPDATE
CREATE POLICY "Users can update own record" ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy 3: Service role can do everything (bypasses RLS anyway)
-- No need for admin policy since admins use service role key

-- Verify
SELECT 'RLS simplified!' as status;
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'students'
ORDER BY policyname;
