-- ============================================================================
-- LOST REPORTS RLS POLICIES
-- ============================================================================
-- Row Level Security policies for lost_reports table
-- ============================================================================

-- Enable RLS on lost_reports table
ALTER TABLE lost_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own lost reports" ON lost_reports;
DROP POLICY IF EXISTS "Users can create lost reports for their items" ON lost_reports;
DROP POLICY IF EXISTS "Users can update their own lost reports" ON lost_reports;
DROP POLICY IF EXISTS "Users can delete their own lost reports" ON lost_reports;
DROP POLICY IF EXISTS "Admins can view all lost reports" ON lost_reports;
DROP POLICY IF EXISTS "Admins can update all lost reports" ON lost_reports;

-- ============================================================================
-- USER POLICIES
-- ============================================================================

-- Policy 1: Users can view their own lost reports
CREATE POLICY "Users can view their own lost reports"
ON lost_reports
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Users can create lost reports for their own items
CREATE POLICY "Users can create lost reports for their items"
ON lost_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM items
    WHERE items.id = lost_reports.item_id
    AND items.user_id = auth.uid()
  )
);

-- Policy 3: Users can update their own lost reports (only if status is 'reported')
CREATE POLICY "Users can update their own lost reports"
ON lost_reports
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'reported'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'reported'
);

-- Policy 4: Users can delete their own lost reports (only if status is 'reported')
CREATE POLICY "Users can delete their own lost reports"
ON lost_reports
FOR DELETE
USING (
  auth.uid() = user_id
  AND status = 'reported'
);

-- ============================================================================
-- ADMIN POLICIES
-- ============================================================================

-- Policy 5: Admins can view all lost reports
CREATE POLICY "Admins can view all lost reports"
ON lost_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 6: Admins can update all lost reports (change status, add notes)
CREATE POLICY "Admins can update all lost reports"
ON lost_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on user_id for faster user queries
CREATE INDEX IF NOT EXISTS idx_lost_reports_user_id ON lost_reports(user_id);

-- Index on item_id for faster item queries
CREATE INDEX IF NOT EXISTS idx_lost_reports_item_id ON lost_reports(item_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_lost_reports_status ON lost_reports(status);

-- Index on reported_at for sorting
CREATE INDEX IF NOT EXISTS idx_lost_reports_reported_at ON lost_reports(reported_at DESC);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_lost_reports_user_status ON lost_reports(user_id, status);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lost_reports';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'lost_reports'
ORDER BY policyname;

-- Test query (run as authenticated user)
/*
SELECT 
  lr.id,
  lr.item_id,
  lr.last_seen_location,
  lr.last_seen_date,
  lr.status,
  i.name as item_name,
  i.category
FROM lost_reports lr
JOIN items i ON lr.item_id = i.id
WHERE lr.user_id = auth.uid()
ORDER BY lr.reported_at DESC;
*/
