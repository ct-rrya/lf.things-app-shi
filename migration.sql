-- Migration: Add missing columns to items table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS photo_urls       TEXT[]          DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_name       TEXT,
  ADD COLUMN IF NOT EXISTS program          TEXT,
  ADD COLUMN IF NOT EXISTS year_section     TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS social_media     TEXT,
  ADD COLUMN IF NOT EXISTS id_type          TEXT,
  ADD COLUMN IF NOT EXISTS id_number        TEXT,
  ADD COLUMN IF NOT EXISTS holder_name      TEXT,
  ADD COLUMN IF NOT EXISTS key_type         TEXT,
  ADD COLUMN IF NOT EXISTS key_count        TEXT,
  ADD COLUMN IF NOT EXISTS brand            TEXT,
  ADD COLUMN IF NOT EXISTS model            TEXT,
  ADD COLUMN IF NOT EXISTS color            TEXT,
  ADD COLUMN IF NOT EXISTS serial_number    TEXT,
  ADD COLUMN IF NOT EXISTS bag_type         TEXT,
  ADD COLUMN IF NOT EXISTS size             TEXT,
  ADD COLUMN IF NOT EXISTS item_type        TEXT,
  ADD COLUMN IF NOT EXISTS found_location   TEXT,
  ADD COLUMN IF NOT EXISTS found_date       TIMESTAMPTZ;

-- ── Profiles table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  bio           TEXT,
  avatar_seed   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can upsert own profile"
  ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── Found items table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS found_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category        TEXT,
  description     TEXT,
  photo_url       TEXT,
  found_location  TEXT,
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'matched', 'claimed', 'unclaimed')),
  brand           TEXT,
  model           TEXT,
  color           TEXT,
  id_type         TEXT,
  key_type        TEXT,
  bag_type        TEXT,
  item_type       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE found_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert found items" ON found_items;
DROP POLICY IF EXISTS "Users can view found items" ON found_items;
DROP POLICY IF EXISTS "Admins can manage found items" ON found_items;

CREATE POLICY "Anyone can insert found items"
  ON found_items FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view found items"
  ON found_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage found items"
  ON found_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── AI matches table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id    UUID REFERENCES items(id) ON DELETE CASCADE,
  found_item_id   UUID REFERENCES found_items(id) ON DELETE CASCADE,
  match_score     FLOAT,
  match_details   JSONB,
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their matches" ON ai_matches;
DROP POLICY IF EXISTS "System can insert matches" ON ai_matches;
DROP POLICY IF EXISTS "Users can update match status" ON ai_matches;

CREATE POLICY "Users can view their matches"
  ON ai_matches FOR SELECT USING (true);

CREATE POLICY "System can insert matches"
  ON ai_matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update match status"
  ON ai_matches FOR UPDATE USING (true);

-- ── Scan events table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  action          TEXT CHECK (action IN ('turn_in', 'have_it')),
  finder_name     TEXT,
  finder_phone    TEXT,
  finder_contact  TEXT,
  finder_email    TEXT,
  finder_user_id  UUID REFERENCES auth.users(id),
  location_note   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert scan events" ON scan_events;
DROP POLICY IF EXISTS "Item owners can view scan events" ON scan_events;

CREATE POLICY "Anyone can insert scan events"
  ON scan_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Item owners can view scan events"
  ON scan_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = scan_events.item_id AND items.user_id = auth.uid())
    OR is_admin()
  );
