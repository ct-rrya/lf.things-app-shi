-- Safe Migration for Complete Workflow
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop existing constraints that might conflict
-- ============================================================================

-- Drop found_items constraint
DO $$ 
BEGIN
    ALTER TABLE found_items DROP CONSTRAINT IF EXISTS found_items_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop ai_matches constraint
DO $$ 
BEGIN
    ALTER TABLE ai_matches DROP CONSTRAINT IF EXISTS ai_matches_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Update items table to support lost status
-- ============================================================================

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'safe';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add lost_at timestamp
DO $$ 
BEGIN
    ALTER TABLE items ADD COLUMN lost_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add recovered_at timestamp
DO $$ 
BEGIN
    ALTER TABLE items ADD COLUMN recovered_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Drop any existing status check constraint
DO $$ 
BEGIN
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Update any NULL status values to 'safe'
UPDATE items 
SET status = 'safe' 
WHERE status IS NULL;

-- Update any invalid status values to 'safe'
UPDATE items 
SET status = 'safe' 
WHERE status NOT IN ('safe', 'lost', 'located', 'recovered');

-- Add status check constraint
ALTER TABLE items 
ADD CONSTRAINT items_status_check 
CHECK (status IN ('safe', 'lost', 'located', 'recovered'));

-- ============================================================================
-- STEP 3: Update found_items table
-- ============================================================================

-- Add finder_name column
DO $$ 
BEGIN
    ALTER TABLE found_items ADD COLUMN finder_name TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add finder_contact column
DO $$ 
BEGIN
    ALTER TABLE found_items ADD COLUMN finder_contact TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Update any rows with NULL status to 'unclaimed'
UPDATE found_items 
SET status = 'unclaimed' 
WHERE status IS NULL;

-- Update any rows with 'pending' status to 'unclaimed'
UPDATE found_items 
SET status = 'unclaimed' 
WHERE status = 'pending';

-- Add new status check constraint
ALTER TABLE found_items 
ADD CONSTRAINT found_items_status_check 
CHECK (status IN ('unclaimed', 'matched', 'claimed', 'recovered'));

-- ============================================================================
-- STEP 4: Update ai_matches table
-- ============================================================================

-- Add confirmed_at timestamp
DO $$ 
BEGIN
    ALTER TABLE ai_matches ADD COLUMN confirmed_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add recovered_at timestamp
DO $$ 
BEGIN
    ALTER TABLE ai_matches ADD COLUMN recovered_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Update any rows with 'accepted' status to 'confirmed'
UPDATE ai_matches 
SET status = 'confirmed' 
WHERE status = 'accepted';

-- Add new status check constraint
ALTER TABLE ai_matches 
ADD CONSTRAINT ai_matches_status_check 
CHECK (status IN ('pending', 'confirmed', 'rejected', 'recovered'));

-- ============================================================================
-- STEP 5: Create chat_threads table
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chat threads" ON chat_threads;
DROP POLICY IF EXISTS "System can insert chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Participants can update chat threads" ON chat_threads;

-- Create policies
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
-- STEP 6: Create chat_messages table
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Create policies
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
-- STEP 7: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_owner ON chat_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_finder ON chat_threads(finder_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_match ON chat_threads(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================================
-- STEP 8: Enable realtime for chat
-- ============================================================================

-- Enable realtime (ignore errors if already enabled)
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

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_matches;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 9: Create function to update thread on new message
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
-- STEP 10: Create function to mark messages as read
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

SELECT 'Migration complete!' as status;

-- Show all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('items', 'found_items', 'ai_matches', 'chat_threads', 'chat_messages')
ORDER BY table_name;

-- Show found_items status values
SELECT DISTINCT status, COUNT(*) 
FROM found_items 
GROUP BY status;

-- Show ai_matches status values
SELECT DISTINCT status, COUNT(*) 
FROM ai_matches 
GROUP BY status;
