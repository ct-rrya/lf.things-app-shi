-- ============================================================
-- CHECK/CREATE AUDIT_LOG TABLE
-- Run this in Supabase SQL Editor if audit log is not working
-- ============================================================

-- Check if audit_log table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'audit_log'
);

-- If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- Test by inserting a sample entry
INSERT INTO audit_log (action, target_type, target_id, old_value, new_value)
VALUES ('system.test', 'system', '00000000-0000-0000-0000-000000000000', 
        '{"test": "old"}', '{"test": "new"}')
ON CONFLICT DO NOTHING;

-- Check if data exists
SELECT COUNT(*) as count FROM audit_log;