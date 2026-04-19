-- Fix scan_events RLS to allow anonymous inserts
-- This allows anyone (even non-logged-in users) to report found items via QR scan

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can insert scan events" ON scan_events;

-- Create new policy that explicitly allows anonymous inserts
CREATE POLICY "Anyone can insert scan events (including anonymous)"
  ON scan_events FOR INSERT
  WITH CHECK (true);

-- Verify the policy allows inserts without authentication
-- Test: Try inserting a record (replace with actual item_id from your database)
-- INSERT INTO scan_events (item_id, action, finder_name) 
-- VALUES ('your-item-uuid-here', 'turn_in', 'Test Finder');
