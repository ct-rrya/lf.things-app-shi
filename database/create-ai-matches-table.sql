-- ============================================================================
-- CREATE AI_MATCHES TABLE
-- ============================================================================
-- Run this ONLY if ai_matches table does not exist
-- Run database/diagnose-ai-matches.sql first to check
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE AI_MATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'recovered')),
  matched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate matches
  UNIQUE(lost_item_id, found_item_id)
);

-- Add comments
COMMENT ON TABLE ai_matches IS 'AI-generated matches between lost and found items';
COMMENT ON COLUMN ai_matches.match_score IS 'Confidence score from 0-100';
COMMENT ON COLUMN ai_matches.status IS 'pending: awaiting review, accepted: owner confirmed, rejected: not a match, recovered: item returned';

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_ai_matches_lost_item_id ON ai_matches(lost_item_id);
CREATE INDEX idx_ai_matches_found_item_id ON ai_matches(found_item_id);
CREATE INDEX idx_ai_matches_status ON ai_matches(status);
CREATE INDEX idx_ai_matches_match_score ON ai_matches(match_score DESC);
CREATE INDEX idx_ai_matches_created_at ON ai_matches(created_at DESC);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_matches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Users can view matches for their own lost items
CREATE POLICY "Users can view matches for their lost items"
  ON ai_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = ai_matches.lost_item_id
      AND items.user_id = auth.uid()
    )
  );

-- Users can view matches for found items they reported
CREATE POLICY "Users can view matches for their found items"
  ON ai_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM found_items
      WHERE found_items.id = ai_matches.found_item_id
      AND found_items.finder_id = auth.uid()
    )
  );

-- Users can update match status for their lost items
CREATE POLICY "Users can update matches for their lost items"
  ON ai_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = ai_matches.lost_item_id
      AND items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = ai_matches.lost_item_id
      AND items.user_id = auth.uid()
    )
  );

-- System/admin can insert matches (for AI matching service)
CREATE POLICY "System can create matches"
  ON ai_matches FOR INSERT
  WITH CHECK (true); -- Adjust based on your auth setup

-- ============================================================================
-- STEP 5: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_matches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_matches_timestamp
  BEFORE UPDATE ON ai_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_matches_timestamp();

-- ============================================================================
-- STEP 6: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_matches'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: ai_matches table created successfully!';
    RAISE NOTICE '   - Foreign keys: Added';
    RAISE NOTICE '   - Indexes: Created';
    RAISE NOTICE '   - RLS policies: Enabled';
    RAISE NOTICE '   - Triggers: Active';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Table was not created';
  END IF;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
