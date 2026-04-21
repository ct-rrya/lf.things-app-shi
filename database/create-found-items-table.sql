-- Create found_items table for reporting found items
-- This table stores items that people have found and reported

CREATE TABLE IF NOT EXISTS found_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  
  -- Category-specific fields (nullable since different categories use different fields)
  id_type TEXT,
  id_number TEXT,
  holder_name TEXT,
  brand TEXT,
  model TEXT,
  color TEXT,
  key_type TEXT,
  key_count TEXT,
  
  -- Common fields
  description TEXT,
  photo_url TEXT NOT NULL,
  found_location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'claimed', 'returned')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_found_items_reporter_id ON found_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON found_items(category);

-- Enable Row Level Security
ALTER TABLE found_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can insert found items
CREATE POLICY "Authenticated users can report found items"
  ON found_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own found item reports"
  ON found_items FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Users can update their own reports
CREATE POLICY "Users can update their own found item reports"
  ON found_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id);

-- Item owners can view found items that match their lost items (via ai_matches)
CREATE POLICY "Item owners can view matched found items"
  ON found_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_matches
      JOIN items ON items.id = ai_matches.lost_item_id
      WHERE ai_matches.found_item_id = found_items.id
      AND items.user_id = auth.uid()
    )
  );

-- Admin users can view all found items
CREATE POLICY "Admin users can view all found items"
  ON found_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin users can update all found items
CREATE POLICY "Admin users can update all found items"
  ON found_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
