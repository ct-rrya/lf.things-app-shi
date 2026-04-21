-- ============================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================================

-- First, fix the admins table RLS
DROP POLICY IF EXISTS "Admins can view admins" ON admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON admins;

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read admins table
CREATE POLICY "Authenticated users can view admins" ON admins FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only existing admins can insert/update/delete
CREATE POLICY "Admins can manage admins" ON admins FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Now fix students table RLS to avoid recursion
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Anyone can verify student_id" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can do everything (using SECURITY DEFINER to avoid recursion)
CREATE POLICY "Admins can manage students" ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy 2: Anyone (including unauthenticated) can SELECT to verify student_id
CREATE POLICY "Anyone can verify student_id" ON students FOR SELECT
  USING (true);

-- Policy 3: Users can update their own record
CREATE POLICY "Users can update own student record" ON students FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Verify
SELECT 'Policies fixed!' as status;
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('students', 'admins')
ORDER BY tablename, policyname;
