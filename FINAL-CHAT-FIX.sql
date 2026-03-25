-- ============================================================================
-- FINAL CHAT FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This fixes the chat system to work with the correct table structure
-- The app uses chat_threads and chat_messages tables (NOT match_messages)
-- ============================================================================

-- STEP 1: Verify which tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'chat_messages' THEN '✅ CORRECT - App uses this'
    WHEN table_name = 'match_messages' THEN '⚠️ OLD TABLE - Not used by app'
    ELSE ''
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_messages', 'match_messages', 'chat_threads')
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Fix chat_messages table RLS policies (if table exists)
-- ============================================================================

-- Drop all existing policies on chat_messages
DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON chat_messages;

-- Create simple, working policies for chat_messages
CREATE POLICY "Enable insert for authenticated users"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Enable read for authenticated users"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_threads
    WHERE chat_threads.id = chat_messages.thread_id
    AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
  )
);

CREATE POLICY "Enable update for thread participants"
ON chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_threads
    WHERE chat_threads.id = chat_messages.thread_id
    AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
  )
);

-- Ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Fix chat_threads table RLS policies (if table exists)
-- ============================================================================

-- Drop all existing policies on chat_threads
DROP POLICY IF EXISTS "Users can view their own chat threads" ON chat_threads;
DROP POLICY IF EXISTS "System can insert chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Participants can update chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chat_threads;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON chat_threads;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON chat_threads;

-- Create simple, working policies for chat_threads
CREATE POLICY "Enable insert for authenticated users"
ON chat_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "Enable read for authenticated users"
ON chat_threads
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "Enable update for authenticated users"
ON chat_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = finder_id);

-- Ensure RLS is enabled
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Verify policies are created
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN tablename = 'chat_messages' THEN '✅ CORRECT TABLE'
    WHEN tablename = 'match_messages' THEN '⚠️ WRONG TABLE (not used by app)'
    ELSE ''
  END as status
FROM pg_policies
WHERE tablename IN ('chat_messages', 'match_messages', 'chat_threads')
ORDER BY tablename, cmd;

-- ============================================================================
-- STEP 5: Enable realtime (if not already enabled)
-- ============================================================================

-- These may fail if already added - that's OK, ignore the error
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================

SELECT '✅ Chat fix complete! Policies updated for chat_messages and chat_threads tables.' as result;
SELECT 'ℹ️ If you see match_messages table in the policies above, it is NOT used by the app.' as note;
SELECT 'ℹ️ The app uses: chat_threads + chat_messages (via /chat/[thread_id] route)' as info;
