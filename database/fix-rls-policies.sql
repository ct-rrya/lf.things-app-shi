-- ============================================================
-- FIX RLS POLICIES FOR STUDENTS TABLE
-- ============================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can do everything
CREATE POLICY "Admins can manage students" ON students FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Policy 2: Anyone (including unauthenticated) can SELECT to verify student_id exists (needed for signup)
CREATE POLICY "Anyone can verify student_id" ON students FOR SELECT
  USING (true);

-- Policy 3: Users can update their own record
CREATE POLICY "Users can update own student record" ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;
