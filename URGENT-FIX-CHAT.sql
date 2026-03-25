-- URGENT FIX: Allow chat messages to work
-- Run this in Supabase SQL Editor NOW

-- Step 1: Drop all existing policies on match_messages
DROP POLICY IF EXISTS "Users can insert their own messages" ON match_messages;
DROP POLICY IF EXISTS "Users can view messages in their matches" ON match_messages;
DROP POLICY IF EXISTS "Match participants can insert messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can view messages" ON match_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON match_messages;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON match_messages;

-- Step 2: Create simple, permissive policies
-- Allow any authenticated user to insert messages
CREATE POLICY "Enable insert for authenticated users"
ON match_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow any authenticated user to read messages
CREATE POLICY "Enable read for authenticated users"
ON match_messages
FOR SELECT
TO authenticated
USING (true);

-- Step 3: Verify RLS is enabled
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Check the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd
FROM pg_policies
WHERE tablename = 'match_messages';
