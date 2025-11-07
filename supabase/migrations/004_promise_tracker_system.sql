-- Migration: Promise Tracker System - Core Tables
-- Date: 2024-11-08
-- Description: Creates tables for promise tracking, parliamentary actions, and consistency scoring
-- This replaces the community voting system with objective promise-action matching

-- ============================================================================
-- TABLE: political_promises
-- Stores promises made by politicians from various sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS political_promises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id uuid REFERENCES politicians(id) ON DELETE CASCADE,
  promise_text text NOT NULL,
  promise_date timestamptz NOT NULL,
  category varchar(50) NOT NULL, -- economic, social, environmental, security, healthcare, education, justice, immigration, foreign_policy, other
  source_url varchar(1000) NOT NULL,
  source_type varchar(50) NOT NULL, -- campaign_site, interview, social_media, debate, press_release, manifesto
  extraction_method varchar(50) NOT NULL, -- manual, ai_extracted, scraped, user_submitted
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0.00-1.00 for AI extractions
  verification_status varchar(50) DEFAULT 'pending', -- pending, actionable, non_actionable, verified, disputed
  is_actionable boolean DEFAULT true,
  context text, -- additional context about the promise
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure we have valid data
  CONSTRAINT valid_category CHECK (category IN ('economic', 'social', 'environmental', 'security', 'healthcare', 'education', 'justice', 'immigration', 'foreign_policy', 'other')),
  CONSTRAINT valid_source_type CHECK (source_type IN ('campaign_site', 'interview', 'social_media', 'debate', 'press_release', 'manifesto', 'other')),
  CONSTRAINT valid_extraction_method CHECK (extraction_method IN ('manual', 'ai_extracted', 'scraped', 'user_submitted')),
  CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'actionable', 'non_actionable', 'verified', 'disputed'))
);

-- ============================================================================
-- TABLE: parliamentary_actions
-- Stores actual actions taken by politicians in parliament
-- ============================================================================
CREATE TABLE IF NOT EXISTS parliamentary_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id uuid REFERENCES politicians(id) ON DELETE CASCADE,
  action_type varchar(50) NOT NULL, -- vote, bill_sponsor, amendment, attendance, debate, question, committee
  action_date timestamptz NOT NULL,
  session_id varchar(200), -- official session reference (e.g., "15e législature, séance du 2024-01-15")
  description text NOT NULL,
  vote_position varchar(50), -- pour, contre, abstention, absent (for votes only)
  bill_id varchar(200), -- official bill reference (e.g., "PJL23-456")
  bill_title text, -- full bill title
  official_reference varchar(1000) NOT NULL, -- link to official record (assemblee-nationale.fr, senat.fr)
  category varchar(50), -- matches promise categories
  metadata jsonb, -- additional data (debate duration, amendment text, co-sponsors, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_action_type CHECK (action_type IN ('vote', 'bill_sponsor', 'amendment', 'attendance', 'debate', 'question', 'committee', 'other')),
  CONSTRAINT valid_vote_position CHECK (vote_position IS NULL OR vote_position IN ('pour', 'contre', 'abstention', 'absent'))
);

-- ============================================================================
-- TABLE: promise_verifications
-- Links promises to actions and tracks whether promises were kept
-- ============================================================================
CREATE TABLE IF NOT EXISTS promise_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promise_id uuid REFERENCES political_promises(id) ON DELETE CASCADE,
  action_id uuid REFERENCES parliamentary_actions(id) ON DELETE CASCADE,
  match_type varchar(50) NOT NULL, -- kept, broken, partial, pending, contradictory
  match_confidence numeric(3,2) NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1), -- 0.00-1.00
  verification_method varchar(50) NOT NULL, -- exact_match, semantic_match, manual_review, ai_assisted
  evidence_urls text[], -- array of supporting evidence links
  explanation text NOT NULL, -- why this action matches/breaks the promise
  verified_by uuid REFERENCES users(id), -- null for automatic, user_id for manual
  verified_at timestamptz,
  is_disputed boolean DEFAULT false,
  dispute_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_match_type CHECK (match_type IN ('kept', 'broken', 'partial', 'pending', 'contradictory')),
  CONSTRAINT valid_verification_method CHECK (verification_method IN ('exact_match', 'semantic_match', 'manual_review', 'ai_assisted')),
  CONSTRAINT unique_promise_action UNIQUE (promise_id, action_id)
);

-- ============================================================================
-- TABLE: consistency_scores
-- Aggregated consistency scores for each politician
-- ============================================================================
CREATE TABLE IF NOT EXISTS consistency_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id uuid REFERENCES politicians(id) ON DELETE CASCADE UNIQUE,

  -- Overall consistency metrics
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100), -- 0.00-100.00
  promises_kept integer DEFAULT 0 CHECK (promises_kept >= 0),
  promises_broken integer DEFAULT 0 CHECK (promises_broken >= 0),
  promises_partial integer DEFAULT 0 CHECK (promises_partial >= 0),
  promises_pending integer DEFAULT 0 CHECK (promises_pending >= 0),
  total_promises integer GENERATED ALWAYS AS (promises_kept + promises_broken + promises_partial + promises_pending) STORED,

  -- Attendance and activity metrics
  attendance_rate numeric(5,2) CHECK (attendance_rate IS NULL OR (attendance_rate >= 0 AND attendance_rate <= 100)), -- 0.00-100.00
  sessions_attended integer DEFAULT 0,
  sessions_scheduled integer DEFAULT 0,

  -- Legislative activity metrics
  legislative_activity_score numeric(5,2) CHECK (legislative_activity_score IS NULL OR (legislative_activity_score >= 0 AND legislative_activity_score <= 100)),
  bills_sponsored integer DEFAULT 0,
  amendments_proposed integer DEFAULT 0,
  debates_participated integer DEFAULT 0,
  questions_asked integer DEFAULT 0,

  -- Calculation metadata
  last_calculated_at timestamptz DEFAULT now(),
  calculation_period_start timestamptz,
  calculation_period_end timestamptz,
  data_quality_score numeric(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1), -- how complete is the data

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLE: data_collection_jobs
-- Tracks automated data collection jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_collection_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type varchar(100) NOT NULL, -- assemblee_votes, senat_votes, twitter_scrape, promise_extraction, attendance_update
  status varchar(50) DEFAULT 'running', -- running, completed, failed, cancelled
  source varchar(500) NOT NULL, -- API endpoint or source name
  records_collected integer DEFAULT 0,
  records_new integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_skipped integer DEFAULT 0,
  error_message text,
  error_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  metadata jsonb, -- job-specific data (parameters, filters, etc.)

  CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Political promises indexes
CREATE INDEX IF NOT EXISTS idx_promises_politician ON political_promises(politician_id);
CREATE INDEX IF NOT EXISTS idx_promises_date ON political_promises(promise_date DESC);
CREATE INDEX IF NOT EXISTS idx_promises_category ON political_promises(category);
CREATE INDEX IF NOT EXISTS idx_promises_verification_status ON political_promises(verification_status);
CREATE INDEX IF NOT EXISTS idx_promises_actionable ON political_promises(is_actionable) WHERE is_actionable = true;

-- Parliamentary actions indexes
CREATE INDEX IF NOT EXISTS idx_actions_politician ON parliamentary_actions(politician_id);
CREATE INDEX IF NOT EXISTS idx_actions_date ON parliamentary_actions(action_date DESC);
CREATE INDEX IF NOT EXISTS idx_actions_type ON parliamentary_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_category ON parliamentary_actions(category);
CREATE INDEX IF NOT EXISTS idx_actions_bill ON parliamentary_actions(bill_id) WHERE bill_id IS NOT NULL;

-- Promise verifications indexes
CREATE INDEX IF NOT EXISTS idx_verifications_promise ON promise_verifications(promise_id);
CREATE INDEX IF NOT EXISTS idx_verifications_action ON promise_verifications(action_id);
CREATE INDEX IF NOT EXISTS idx_verifications_match_type ON promise_verifications(match_type);
CREATE INDEX IF NOT EXISTS idx_verifications_confidence ON promise_verifications(match_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_disputed ON promise_verifications(is_disputed) WHERE is_disputed = true;

-- Consistency scores indexes
CREATE INDEX IF NOT EXISTS idx_scores_politician ON consistency_scores(politician_id);
CREATE INDEX IF NOT EXISTS idx_scores_overall ON consistency_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_calculated ON consistency_scores(last_calculated_at DESC);

-- Data collection jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_type ON data_collection_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON data_collection_jobs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_started ON data_collection_jobs(started_at DESC);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS update_promises_updated_at ON political_promises;
CREATE TRIGGER update_promises_updated_at
    BEFORE UPDATE ON political_promises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_actions_updated_at ON parliamentary_actions;
CREATE TRIGGER update_actions_updated_at
    BEFORE UPDATE ON parliamentary_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_verifications_updated_at ON promise_verifications;
CREATE TRIGGER update_verifications_updated_at
    BEFORE UPDATE ON promise_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scores_updated_at ON consistency_scores;
CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON consistency_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Proper role-based access
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE political_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE parliamentary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collection_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: political_promises
-- ============================================================================

-- Public can read verified promises
CREATE POLICY "Anyone can read verified promises" ON political_promises
    FOR SELECT USING (verification_status = 'verified');

-- Authenticated users can read all promises
CREATE POLICY "Authenticated users can read all promises" ON political_promises
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins and moderators can insert promises
CREATE POLICY "Admins and moderators can insert promises" ON political_promises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Only admins and moderators can update promises
CREATE POLICY "Admins and moderators can update promises" ON political_promises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Only admins can delete promises
CREATE POLICY "Only admins can delete promises" ON political_promises
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: parliamentary_actions
-- ============================================================================

-- Public can read all parliamentary actions (public record)
CREATE POLICY "Anyone can read parliamentary actions" ON parliamentary_actions
    FOR SELECT USING (true);

-- Only admins and moderators can insert actions
CREATE POLICY "Admins and moderators can insert actions" ON parliamentary_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Only admins and moderators can update actions
CREATE POLICY "Admins and moderators can update actions" ON parliamentary_actions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Only admins can delete actions
CREATE POLICY "Only admins can delete actions" ON parliamentary_actions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: promise_verifications
-- ============================================================================

-- Public can read verified matches
CREATE POLICY "Anyone can read verified promise matches" ON promise_verifications
    FOR SELECT USING (verified_at IS NOT NULL AND is_disputed = false);

-- Authenticated users can read all verifications
CREATE POLICY "Authenticated users can read all verifications" ON promise_verifications
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins and moderators can insert verifications
CREATE POLICY "Admins and moderators can insert verifications" ON promise_verifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Admins and moderators can update verifications
CREATE POLICY "Admins and moderators can update verifications" ON promise_verifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Only admins can delete verifications
CREATE POLICY "Only admins can delete verifications" ON promise_verifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: consistency_scores
-- ============================================================================

-- Public can read all consistency scores (this is the main feature)
CREATE POLICY "Anyone can read consistency scores" ON consistency_scores
    FOR SELECT USING (true);

-- Only admins can insert scores (should be automated)
CREATE POLICY "Only admins can manage scores" ON consistency_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: data_collection_jobs
-- ============================================================================

-- Only admins can read job logs
CREATE POLICY "Only admins can read job logs" ON data_collection_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Only admins can manage jobs
CREATE POLICY "Only admins can manage jobs" ON data_collection_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate consistency score for a politician
CREATE OR REPLACE FUNCTION calculate_consistency_score(pol_id uuid)
RETURNS numeric AS $$
DECLARE
    kept integer;
    broken integer;
    partial integer;
    total integer;
    score numeric;
BEGIN
    -- Count promise outcomes
    SELECT
        COUNT(*) FILTER (WHERE match_type = 'kept') as kept_count,
        COUNT(*) FILTER (WHERE match_type = 'broken') as broken_count,
        COUNT(*) FILTER (WHERE match_type = 'partial') as partial_count,
        COUNT(*) as total_count
    INTO kept, broken, partial, total
    FROM promise_verifications pv
    JOIN political_promises pp ON pv.promise_id = pp.id
    WHERE pp.politician_id = pol_id
    AND pv.verified_at IS NOT NULL
    AND pv.is_disputed = false;

    -- Calculate score (kept = 100%, partial = 50%, broken = 0%)
    IF total > 0 THEN
        score := ((kept * 1.0 + partial * 0.5) / total) * 100;
    ELSE
        score := NULL; -- Not enough data
    END IF;

    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update all consistency scores
CREATE OR REPLACE FUNCTION update_all_consistency_scores()
RETURNS integer AS $$
DECLARE
    updated_count integer := 0;
    politician_record RECORD;
BEGIN
    FOR politician_record IN
        SELECT DISTINCT pp.politician_id
        FROM political_promises pp
        JOIN promise_verifications pv ON pv.promise_id = pp.id
        WHERE pv.verified_at IS NOT NULL
    LOOP
        -- Calculate and update score
        INSERT INTO consistency_scores (
            politician_id,
            overall_score,
            promises_kept,
            promises_broken,
            promises_partial,
            promises_pending,
            last_calculated_at
        )
        SELECT
            politician_record.politician_id,
            calculate_consistency_score(politician_record.politician_id),
            COUNT(*) FILTER (WHERE pv.match_type = 'kept'),
            COUNT(*) FILTER (WHERE pv.match_type = 'broken'),
            COUNT(*) FILTER (WHERE pv.match_type = 'partial'),
            COUNT(*) FILTER (WHERE pv.match_type = 'pending'),
            NOW()
        FROM promise_verifications pv
        JOIN political_promises pp ON pv.promise_id = pp.id
        WHERE pp.politician_id = politician_record.politician_id
        AND pv.verified_at IS NOT NULL
        ON CONFLICT (politician_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            promises_kept = EXCLUDED.promises_kept,
            promises_broken = EXCLUDED.promises_broken,
            promises_partial = EXCLUDED.promises_partial,
            promises_pending = EXCLUDED.promises_pending,
            last_calculated_at = NOW();

        updated_count := updated_count + 1;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public read access to relevant tables
GRANT SELECT ON political_promises, parliamentary_actions, promise_verifications, consistency_scores TO anon;

-- Authenticated users get full read access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_consistency_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_consistency_scores() TO authenticated;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE political_promises IS 'Stores promises made by politicians from various sources (campaigns, interviews, social media)';
COMMENT ON TABLE parliamentary_actions IS 'Stores actual actions taken by politicians (votes, bills, attendance, debates)';
COMMENT ON TABLE promise_verifications IS 'Links promises to actions and determines if promises were kept, broken, or partially fulfilled';
COMMENT ON TABLE consistency_scores IS 'Aggregated consistency scores calculated from promise-action matching';
COMMENT ON TABLE data_collection_jobs IS 'Tracks automated data collection jobs from government APIs';

COMMENT ON FUNCTION calculate_consistency_score(uuid) IS 'Calculates consistency score for a politician based on verified promise outcomes';
COMMENT ON FUNCTION update_all_consistency_scores() IS 'Updates consistency scores for all politicians with verified promises';
