-- Create chat system tables for owner-finder communication
-- Run this in Supabase SQL Editor

-- Chat Threads table (conversation between owner and finder)
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  registered_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  match_id UUID REFERENCES ai_matches(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  finder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages table (individual messages in a thread)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for chat_threads
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "Users can create chat threads"
  ON chat_threads FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "Participants can update thread status"
  ON chat_threads FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = finder_id);

-- RLS Policies for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

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
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_owner_id ON chat_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_finder_id ON chat_threads(finder_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_item_id ON chat_threads(item_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread timestamp when new message is sent
DROP TRIGGER IF EXISTS update_thread_on_message ON chat_messages;
CREATE TRIGGER update_thread_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_thread_timestamp();
