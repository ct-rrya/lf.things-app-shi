-- Fix Row Level Security for match_messages table
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own messages" ON match_messages;
DROP POLICY IF EXISTS "Users can view messages in their matches" ON match_messages;
DROP POLICY IF EXISTS "Match participants can insert messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can view messages" ON match_messages;

-- Enable RLS on match_messages
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to insert messages if they are part of the match
CREATE POLICY "Match participants can insert messages"
ON match_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_matches
    WHERE ai_matches.id = match_messages.match_id
    AND (
      EXISTS (
        SELECT 1 FROM items
        WHERE items.id = ai_matches.lost_item_id
        AND items.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM found_items
        WHERE found_items.id = ai_matches.found_item_id
        AND found_items.reporter_id = auth.uid()
      )
    )
  )
);

-- Policy 2: Allow users to view messages if they are part of the match
CREATE POLICY "Match participants can view messages"
ON match_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_matches
    WHERE ai_matches.id = match_messages.match_id
    AND (
      EXISTS (
        SELECT 1 FROM items
        WHERE items.id = ai_matches.lost_item_id
        AND items.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM found_items
        WHERE found_items.id = ai_matches.found_item_id
        AND found_items.reporter_id = auth.uid()
      )
    )
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'match_messages';
