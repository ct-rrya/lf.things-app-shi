-- Match Messages Table
-- Stores chat messages between owners and finders for confirmed matches

CREATE TABLE IF NOT EXISTS match_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES ai_matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for matches they're part of
CREATE POLICY "Users can view their match messages"
  ON match_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_matches m
      JOIN items i ON i.id = m.lost_item_id
      LEFT JOIN found_items f ON f.id = m.found_item_id
      WHERE m.id = match_messages.match_id
      AND (i.user_id = auth.uid() OR f.reporter_id = auth.uid())
    )
  );

-- Policy: Users can send messages for matches they're part of
CREATE POLICY "Users can send messages in their matches"
  ON match_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ai_matches m
      JOIN items i ON i.id = m.lost_item_id
      LEFT JOIN found_items f ON f.id = m.found_item_id
      WHERE m.id = match_messages.match_id
      AND m.status = 'accepted'
      AND (i.user_id = auth.uid() OR f.reporter_id = auth.uid())
    )
  );

-- Indexes for performance
CREATE INDEX idx_match_messages_match_id ON match_messages(match_id);
CREATE INDEX idx_match_messages_created_at ON match_messages(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
