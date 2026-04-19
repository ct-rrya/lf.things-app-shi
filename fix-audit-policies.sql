-- ============================================================
-- FIX AUDIT LOG POLICIES (Safe version)
-- This won't fail if policies already exist
-- ============================================================

-- First, check if audit_log table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log'
  ) THEN
    -- Create audit_log table if it doesn't exist
    CREATE TABLE audit_log (
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
    CREATE INDEX idx_audit_actor    ON audit_log(actor_id);
    CREATE INDEX idx_audit_target   ON audit_log(target_id);
    CREATE INDEX idx_audit_created  ON audit_log(created_at DESC);
    
    RAISE NOTICE 'Created audit_log table';
  ELSE
    RAISE NOTICE 'audit_log table already exists';
  END IF;
END $$;

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE tablename = 'audit_log' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on audit_log';
  ELSE
    RAISE NOTICE 'RLS already enabled on audit_log';
  END IF;
END $$;

-- Drop existing policies if they exist (to recreate them)
DO $$
BEGIN
  -- Drop "Admins can read audit log" policy if it exists
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'audit_log' 
    AND policyname = 'Admins can read audit log'
  ) THEN
    DROP POLICY "Admins can read audit log" ON audit_log;
    RAISE NOTICE 'Dropped existing "Admins can read audit log" policy';
  END IF;
  
  -- Drop "System can insert audit log" policy if it exists
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'audit_log' 
    AND policyname = 'System can insert audit log'
  ) THEN
    DROP POLICY "System can insert audit log" ON audit_log;
    RAISE NOTICE 'Dropped existing "System can insert audit log" policy';
  END IF;
END $$;

-- Now create the policies fresh
CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

RAISE NOTICE 'Created fresh RLS policies for audit_log';

-- Test: Insert a sample audit entry
INSERT INTO audit_log (action, target_type, target_id, old_value, new_value)
VALUES ('system.test', 'system', '00000000-0000-0000-0000-000000000000', 
        '{"test": "old"}', '{"test": "new"}')
ON CONFLICT DO NOTHING;

-- Show current audit log count
SELECT COUNT(*) as audit_log_count FROM audit_log;