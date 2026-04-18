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

-- ── Chat threads table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_threads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registered_item_id    UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  match_id              UUID REFERENCES ai_matches(id) ON DELETE SET NULL,
  owner_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  finder_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status                TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message          TEXT,
  last_message_at       TIMESTAMPTZ,
  unread_count_owner    INT DEFAULT 0,
  unread_count_finder   INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their threads" ON chat_threads;
DROP POLICY IF EXISTS "System can insert threads" ON chat_threads;
DROP POLICY IF EXISTS "Participants can update threads" ON chat_threads;

CREATE POLICY "Participants can view their threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = finder_id OR is_admin());

CREATE POLICY "System can insert threads"
  ON chat_threads FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can update threads"
  ON chat_threads FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = finder_id OR is_admin());

-- ── Chat messages table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT CHECK (sender_role IN ('owner', 'finder')),
  message     TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;

CREATE POLICY "Participants can view messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND (chat_threads.owner_id = auth.uid() OR chat_threads.finder_id = auth.uid())
    ) OR is_admin()
  );

CREATE POLICY "Participants can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ── Trigger: update thread on new message ────────────────────
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread chat_threads%ROWTYPE;
BEGIN
  SELECT * INTO v_thread FROM chat_threads WHERE id = NEW.thread_id;

  UPDATE chat_threads SET
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    unread_count_owner  = CASE WHEN NEW.sender_role = 'finder' THEN unread_count_owner + 1  ELSE unread_count_owner  END,
    unread_count_finder = CASE WHEN NEW.sender_role = 'owner'  THEN unread_count_finder + 1 ELSE unread_count_finder END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_insert ON chat_messages;
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();

-- ── RPC: mark_messages_read ───────────────────────────────────
CREATE OR REPLACE FUNCTION mark_messages_read(p_thread_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT
    CASE WHEN owner_id = p_user_id THEN 'owner' ELSE 'finder' END
  INTO v_role
  FROM chat_threads WHERE id = p_thread_id;

  -- Mark individual messages as read
  UPDATE chat_messages
  SET read_at = NOW()
  WHERE thread_id = p_thread_id
    AND sender_id != p_user_id
    AND read_at IS NULL;

  -- Reset unread counter for this user's role
  IF v_role = 'owner' THEN
    UPDATE chat_threads SET unread_count_owner = 0 WHERE id = p_thread_id;
  ELSE
    UPDATE chat_threads SET unread_count_finder = 0 WHERE id = p_thread_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Notifications table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  data      JSONB DEFAULT '{}',
  read_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- ── Add email column to students if missing ───────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;

-- ── Remove 'recovered' status, update existing rows to 'safe' ─
UPDATE items SET status = 'safe' WHERE status = 'recovered';

-- Update the CHECK constraint to remove 'recovered'
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check
  CHECK (status IN ('safe', 'lost', 'located', 'at_admin', 'pending'));
