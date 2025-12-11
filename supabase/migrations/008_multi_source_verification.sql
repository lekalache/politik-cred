-- Migration 008: Multi-Source Promise Verification System (CLEAN VERSION)
-- Only adds what doesn't already exist

-- ============================================================================
-- 0. DROP CONFLICTING VIEWS
-- ============================================================================

DROP VIEW IF EXISTS promises_with_sources CASCADE;
DROP VIEW IF EXISTS politicians_with_values CASCADE;

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO political_promises
-- ============================================================================

-- Only add authenticity_flags (category and confidence_score already exist)
ALTER TABLE political_promises
  ADD COLUMN IF NOT EXISTS authenticity_flags JSONB DEFAULT '{}';

-- Create index for category (skip if exists)
CREATE INDEX IF NOT EXISTS idx_political_promises_category ON political_promises(category);

-- ============================================================================
-- 2. PROMISE SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS promise_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID REFERENCES political_promises(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN (
    'vigie',
    'les_decodeurs',
    'afp_factuel',
    'official',
    'community',
    'other'
  )),
  source_url TEXT NOT NULL,
  source_name TEXT,

  -- Verification details
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credibility_weight NUMERIC DEFAULT 1.0 CHECK (credibility_weight >= 0 AND credibility_weight <= 2),

  -- What this source claims
  status_claimed TEXT CHECK (status_claimed IN ('kept', 'broken', 'partial', 'pending')),
  evidence_text TEXT,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),

  -- Metadata
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(promise_id, source_type, source_url)
);

CREATE INDEX IF NOT EXISTS idx_promise_sources_promise ON promise_sources(promise_id);
CREATE INDEX IF NOT EXISTS idx_promise_sources_type ON promise_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_promise_sources_active ON promise_sources(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE promise_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promise sources are viewable by everyone" ON promise_sources;
CREATE POLICY "Promise sources are viewable by everyone" ON promise_sources
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage promise sources" ON promise_sources;
CREATE POLICY "Only admins can manage promise sources" ON promise_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 3. SOURCE REPUTATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS source_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT UNIQUE NOT NULL,
  accuracy_rate NUMERIC DEFAULT 0.5 CHECK (accuracy_rate >= 0 AND accuracy_rate <= 1),
  credibility_weight NUMERIC DEFAULT 1.0 CHECK (credibility_weight >= 0 AND credibility_weight <= 2),
  total_claims INTEGER DEFAULT 0,
  verified_claims INTEGER DEFAULT 0,
  disputed_claims INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO source_reputation (source_type, accuracy_rate, credibility_weight) VALUES
  ('vigie', 0.87, 1.0),
  ('les_decodeurs', 0.94, 1.2),
  ('afp_factuel', 0.96, 1.3),
  ('official', 1.0, 1.5),
  ('community', 0.70, 0.8),
  ('other', 0.50, 0.6)
ON CONFLICT (source_type) DO NOTHING;

-- RLS
ALTER TABLE source_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Source reputation is viewable by everyone" ON source_reputation;
CREATE POLICY "Source reputation is viewable by everyone" ON source_reputation
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can update source reputation" ON source_reputation;
CREATE POLICY "Only admins can update source reputation" ON source_reputation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 4. CORE VALUE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core_value_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  value_metrics JSONB NOT NULL DEFAULT '{}',
  authenticity_score NUMERIC CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  greenwashing_flags JSONB DEFAULT '[]',
  priority_shifts JSONB DEFAULT '[]',
  behavioral_patterns TEXT[],
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_quality_score NUMERIC CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(politician_id)
);

CREATE INDEX IF NOT EXISTS idx_core_value_profiles_politician ON core_value_profiles(politician_id);
CREATE INDEX IF NOT EXISTS idx_core_value_profiles_authenticity ON core_value_profiles(authenticity_score DESC);

-- RLS
ALTER TABLE core_value_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Core value profiles are viewable by everyone" ON core_value_profiles;
CREATE POLICY "Core value profiles are viewable by everyone" ON core_value_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only system can manage core value profiles" ON core_value_profiles;
CREATE POLICY "Only system can manage core value profiles" ON core_value_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_promise_confidence()
RETURNS TRIGGER AS $$
DECLARE
  source_count INTEGER;
  new_confidence NUMERIC;
BEGIN
  SELECT COUNT(*) INTO source_count
  FROM promise_sources
  WHERE promise_id = NEW.promise_id AND is_active = true;

  IF source_count = 0 THEN
    new_confidence := 0;
  ELSIF source_count = 1 THEN
    new_confidence := 0.4;
  ELSIF source_count = 2 THEN
    new_confidence := 0.7;
  ELSE
    new_confidence := 0.9;
  END IF;

  IF EXISTS (
    SELECT 1 FROM promise_sources
    WHERE promise_id = NEW.promise_id
      AND source_type = 'official'
      AND is_active = true
  ) THEN
    new_confidence := LEAST(new_confidence * 1.2, 1.0);
  END IF;

  UPDATE political_promises
  SET confidence_score = new_confidence,
      updated_at = NOW()
  WHERE id = NEW.promise_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_promise_confidence ON promise_sources;
CREATE TRIGGER trigger_update_promise_confidence
  AFTER INSERT OR UPDATE OR DELETE ON promise_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_promise_confidence();

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW promises_with_sources AS
SELECT
  p.*,
  COUNT(ps.id) as source_count,
  ARRAY_AGG(ps.source_type) FILTER (WHERE ps.is_active) as source_types
FROM political_promises p
LEFT JOIN promise_sources ps ON p.id = ps.promise_id
GROUP BY p.id;

CREATE OR REPLACE VIEW politicians_with_values AS
SELECT
  pol.*,
  cvp.value_metrics,
  cvp.authenticity_score,
  cvp.greenwashing_flags,
  cvp.data_quality_score as value_data_quality
FROM politicians pol
LEFT JOIN core_value_profiles cvp ON pol.id = cvp.politician_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE promise_sources IS 'Multi-source verification for political promises';
COMMENT ON TABLE source_reputation IS 'Track reliability and credibility of different sources';
COMMENT ON TABLE core_value_profiles IS 'Political DNA profiles showing core values and authenticity';
