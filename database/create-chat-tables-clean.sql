-- ============================================================================
-- CHAT SYSTEM TABLES - CLEAN MIGRATION
-- ============================================================================
-- This script will DROP existing chat tables and create fresh ones
-- WARNING: This will delete all existing chat data!
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING TABLES (if they exist)
-- ============================================================================

-- Drop dependent objects first
DROP VIEW IF EXISTS chat_threads_with_info CASCADE;
DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON chat_messages;
DROP TRIGGER IF EXISTS update_thread_on_message ON chat_messages;
DROP FUNCTION IF EXISTS update_chat_thread_timestamp() CASCADE;

-- Drop tables (CASCADE will drop all dependent objects)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_threads CASCADE;

-- ============================================================================
-- STEP 2: CREATE CHAT THREADS TABLE
-- ============================================================================

CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one thread per item-finder pair
  UNIQUE(item_id, finder_id)
);

-- Add comments
COMMENT ON TABLE chat_threads IS 'Chat conversations between item owners and finders';
COMMENT ON COLUMN chat_threads.item_id IS 'The item being discussed';
COMMENT ON COLUMN chat_threads.owner_id IS 'The owner of the item';
COMMENT ON COLUMN chat_threads.finder_id IS 'The person who found/scanned the item';
COMMENT ON COLUMN chat_threads.status IS 'active: ongoing, resolved: item returned, archived: closed';

-- ============================================================================
-- STEP 3: CREATE CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (length(message) > 0 AND length(message) <= 5000),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE chat_messages IS 'Individual messages in chat threads';
COMMENT ON COLUMN chat_messages.is_read IS 'Whether the recipient has read this message';

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

-- Indexes on chat_threads
CREATE INDEX idx_chat_threads_owner_id ON chat_threads(owner_id);
CREATE INDEX idx_chat_threads_finder_id ON chat_threads(finder_id);
CREATE INDEX idx_chat_threads_item_id ON chat_threads(item_id);
CREATE INDEX idx_chat_threads_status ON chat_threads(status);
CREATE INDEX idx_chat_threads_updated_at ON chat_threads(updated_at DESC);

-- Indexes on chat_messages
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_chat_messages_thread_unread ON chat_messages(thread_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES FOR CHAT_THREADS
-- ============================================================================

-- Users can view threads they are part of
CREATE POLICY "Users can view their chat threads"
  ON chat_threads FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = finder_id
  );

-- Users can create threads
CREATE POLICY "Users can create chat threads"
  ON chat_threads FOR INSERT
  WITH CHECK (
    auth.uid() = finder_id OR 
    auth.uid() = owner_id
  );

-- Participants can update thread status
CREATE POLICY "Participants can update thread status"
  ON chat_threads FOR UPDATE
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = finder_id
  )
  WITH CHECK (
    auth.uid() = owner_id OR 
    auth.uid() = finder_id
  );

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR CHAT_MESSAGES
-- ============================================================================

-- Users can view messages in their threads
CREATE POLICY "Users can view messages in their threads"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (
        chat_threads.owner_id = auth.uid() OR 
        chat_threads.finder_id = auth.uid()
      )
    )
  );

-- Users can send messages in their threads
CREATE POLICY "Users can send messages in their threads"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (
        chat_threads.owner_id = auth.uid() OR 
        chat_threads.finder_id = auth.uid()
      )
    )
  );

-- Users can mark messages as read in their threads
CREATE POLICY "Users can update message read status"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (
        chat_threads.owner_id = auth.uid() OR 
        chat_threads.finder_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (
        chat_threads.owner_id = auth.uid() OR 
        chat_threads.finder_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- STEP 8: CREATE TRIGGER FUNCTION
-- ============================================================================

-- Function to update thread's updated_at timestamp when new message is sent
CREATE OR REPLACE FUNCTION update_chat_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update thread timestamp on new message
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_thread_timestamp();

-- ============================================================================
-- STEP 9: CREATE HELPER VIEW
-- ============================================================================

-- View to get thread info with latest message and unread count
CREATE OR REPLACE VIEW chat_threads_with_info AS
SELECT 
  t.id,
  t.item_id,
  t.owner_id,
  t.finder_id,
  t.status,
  t.created_at,
  t.updated_at,
  i.name as item_name,
  i.category as item_category,
  (
    SELECT message 
    FROM chat_messages 
    WHERE thread_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message,
  (
    SELECT created_at 
    FROM chat_messages 
    WHERE thread_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message_at,
  (
    SELECT COUNT(*) 
    FROM chat_messages 
    WHERE thread_id = t.id 
    AND is_read = FALSE 
    AND sender_id != auth.uid()
  ) as unread_count
FROM chat_threads t
LEFT JOIN items i ON i.id = t.item_id
WHERE t.owner_id = auth.uid() OR t.finder_id = auth.uid();

COMMENT ON VIEW chat_threads_with_info IS 'Chat threads with item info, last message, and unread count';

-- ============================================================================
-- STEP 10: VERIFICATION
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
  thread_count INTEGER;
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO thread_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chat_threads';
  
  SELECT COUNT(*) INTO message_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chat_messages';
  
  IF thread_count = 1 AND message_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: Chat tables created successfully!';
    RAISE NOTICE '   - chat_threads: Created';
    RAISE NOTICE '   - chat_messages: Created';
    RAISE NOTICE '   - RLS policies: Enabled';
    RAISE NOTICE '   - Indexes: Created';
    RAISE NOTICE '   - Triggers: Active';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tables were not created properly';
  END IF;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Run these queries to verify everything is working:
--
-- 1. Check tables exist:
--    SELECT table_name FROM information_schema.tables 
--    WHERE table_schema = 'public' 
--    AND table_name IN ('chat_threads', 'chat_messages');
--
-- 2. Check RLS is enabled:
--    SELECT tablename, rowsecurity 
--    FROM pg_tables 
--    WHERE schemaname = 'public' 
--    AND tablename IN ('chat_threads', 'chat_messages');
--
-- 3. Check indexes:
--    SELECT indexname FROM pg_indexes 
--    WHERE schemaname = 'public' 
--    AND tablename IN ('chat_threads', 'chat_messages');
--
-- 4. Test the view:
--    SELECT * FROM chat_threads_with_info LIMIT 1;
-- ============================================================================
