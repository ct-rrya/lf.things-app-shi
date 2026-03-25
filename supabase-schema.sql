-- SOS Database Schema for QR Code System
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Items table (registered items with QR codes)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'ID', 'Keys', 'Laptop', 'Water Bottle'
  photo_url TEXT,
  qr_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL, -- Used in QR code
  status TEXT DEFAULT 'safe' CHECK (status IN ('safe', 'lost', 'found', 'recovered', 'at_admin')),
  last_seen_location TEXT,
  last_seen_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Scans table (tracks when someone scans a QR code)
CREATE TABLE qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scan_location TEXT, -- Optional: where the scan happened
  scanner_message TEXT, -- Optional: message from finder
  scanner_contact TEXT -- Optional: anonymous contact method
);

-- Chats table (anonymous messaging between owner and finder)
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
-- Users can only see their own items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- QR scans are public (anyone can report finding an item)
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert QR scans"
  ON qr_scans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Item owners can view scans of their items"
  ON qr_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = qr_scans.item_id
      AND items.user_id = auth.uid()
    )
  );

-- Chat policies (only participants can see messages)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chats for their items"
  ON chats FOR SELECT
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = chats.item_id
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Indexes for performance
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_qr_token ON items(qr_token);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_qr_scans_item_id ON qr_scans(item_id);
CREATE INDEX idx_chats_item_id ON chats(item_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
