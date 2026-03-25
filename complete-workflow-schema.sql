-- Complete Lost & Found Workflow Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Update items table to support lost status
-- ============================================================================

-- Add status column if it doesn't exist
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'safe' 
CHECK (status IN ('safe', 'lost', 'located', 'recovered'));

-- Add lost_at timestamp
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- Add recovered_at timestamp
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Update found_items table
-- ============================================================================

-- Ensure found_items has all required fields
ALTER TABLE found_items 
ADD COLUMN IF NOT EXISTS finder_name TEXT;

ALTER TABLE found_items 
ADD COLUMN IF NOT EXISTS finder_contact TEXT;

-- First, update any existing rows with invalid status values
UPDATE found_items 
SET status = 'unclaimed' 
WHERE status NOT IN ('unclaimed', 'matched', 'claimed', 'recovered');

-- Drop old constraint if it exists
ALTER TABLE found_items 
DROP CONSTRAINT IF EXISTS found_items_status_check;

-- Add new constraint
ALTER TABLE found_items 
ADD CONSTRAINT found_items_status_check 
CHECK (status IN ('unclaimed', 'matched', 'claimed', 'recovered', 'pending'));

-- ============================================================================
-- STEP 3: Update ai_matches table
-- ============================================================================

-- First, update any existing rows with invalid status values
UPDATE ai_matches 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'rejected', 'recovered', 'accepted');

-- Drop old constraint if it exists
ALTER TABLE ai_matches 
DROP CONSTRAINT IF EXISTS ai_matches_status_check;

-- Add new constraint (include 'accepted' for backward compatibility)
ALTER TABLE ai_matches 
ADD CONSTRAINT ai_matches_status_check 
CHECK (status IN ('pending', 'confirmed', 'rejected', 'recovered', 'accepted'));

-- Add confirmed_at timestamp
ALTER TABLE ai_matches 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add recovered_at timestamp
ALTER TABLE ai_matches 
ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 4: Create chat_threads table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES ai_matches(id) ON DELETE CASCADE NOT NULL,
  registered_item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  finder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_owner INT DEFAULT 0,
  unread_count_finder INT DEFAULT 0,
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- Policies for chat_threads
CREATE POLICY "Users can view their own chat threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "System can insert chat threads"
  ON chat_threads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update chat threads"
  ON chat_threads FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = finder_id);

-- ============================================================================
-- STEP 5: Create chat_messages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'finder')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
CREATE POLICY "Users can view messages in their threads"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their threads"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND chat_threads.status = 'open'
      AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_owner ON chat_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_finder ON chat_threads(finder_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_match ON chat_threads(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================================
-- STEP 7: Enable realtime for chat
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_matches;

-- ============================================================================
-- STEP 8: Create function to update thread on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    unread_count_owner = CASE 
      WHEN NEW.sender_role = 'finder' THEN unread_count_owner + 1 
      ELSE unread_count_owner 
    END,
    unread_count_finder = CASE 
      WHEN NEW.sender_role = 'owner' THEN unread_count_finder + 1 
      ELSE unread_count_finder 
    END
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON chat_messages;
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_message();

-- ============================================================================
-- STEP 9: Create function to mark messages as read
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_messages_read(p_thread_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  -- Check if user is owner or finder
  SELECT owner_id = p_user_id INTO v_is_owner
  FROM chat_threads
  WHERE id = p_thread_id;
  
  -- Mark messages as read
  UPDATE chat_messages
  SET is_read = true
  WHERE thread_id = p_thread_id
  AND sender_id != p_user_id
  AND is_read = false;
  
  -- Reset unread count
  IF v_is_owner THEN
    UPDATE chat_threads
    SET unread_count_owner = 0
    WHERE id = p_thread_id;
  ELSE
    UPDATE chat_threads
    SET unread_count_finder = 0
    WHERE id = p_thread_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Schema setup complete!' as status;

-- Show all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('items', 'found_items', 'ai_matches', 'chat_threads', 'chat_messages')
ORDER BY table_name;
