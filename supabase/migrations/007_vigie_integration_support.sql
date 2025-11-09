-- Migration: Vigie du mensonge Integration Support
-- Date: 2025-01-14
-- Description: Add fields to support integration with Vigie du mensonge fact-checking platform

-- ============================================================================
-- Add source platform tracking to political_promises
-- ============================================================================
ALTER TABLE political_promises
ADD COLUMN IF NOT EXISTS source_platform varchar(50) DEFAULT 'politik_cred'
CHECK (source_platform IN ('politik_cred', 'vigie_du_mensonge', 'assemblee_nationale', 'user_submitted', 'other'));

COMMENT ON COLUMN political_promises.source_platform IS 'Platform where this promise was originally sourced from';

-- ============================================================================
-- Add external ID for deduplication across platforms
-- ============================================================================
ALTER TABLE political_promises
ADD COLUMN IF NOT EXISTS external_id varchar(200),
ADD COLUMN IF NOT EXISTS external_url varchar(1000);

COMMENT ON COLUMN political_promises.external_id IS 'External platform ID for deduplication (e.g., Vigie promise ID)';
COMMENT ON COLUMN political_promises.external_url IS 'Direct link to the external platform page';

-- ============================================================================
-- Add verification source to promise_verifications
-- ============================================================================
ALTER TABLE promise_verifications
ADD COLUMN IF NOT EXISTS verification_source varchar(50) DEFAULT 'ai_assisted'
CHECK (verification_source IN ('ai_assisted', 'vigie_community', 'manual_review', 'parliamentary_match', 'user_contributed'));

COMMENT ON COLUMN promise_verifications.verification_source IS 'Source of the verification (AI, community, manual, etc.)';

-- ============================================================================
-- Add community verification metrics
-- ============================================================================
ALTER TABLE promise_verifications
ADD COLUMN IF NOT EXISTS community_votes_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_confidence numeric(3,2) CHECK (community_confidence IS NULL OR (community_confidence >= 0 AND community_confidence <= 1));

COMMENT ON COLUMN promise_verifications.community_votes_count IS 'Number of community votes (e.g., from Vigie)';
COMMENT ON COLUMN promise_verifications.community_confidence IS 'Community confidence score (0.00-1.00)';

-- ============================================================================
-- Create index for external lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_political_promises_external_id
ON political_promises(external_id)
WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_political_promises_source_platform
ON political_promises(source_platform);

-- ============================================================================
-- Create table for Vigie import tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS vigie_import_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_name varchar(200),
  promises_found integer DEFAULT 0,
  promises_imported integer DEFAULT 0,
  promises_skipped integer DEFAULT 0,
  status varchar(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE vigie_import_jobs IS 'Tracks imports from Vigie du mensonge';

-- ============================================================================
-- RLS Policies for vigie_import_jobs
-- ============================================================================
ALTER TABLE vigie_import_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can see all import jobs
CREATE POLICY "Admins can view all Vigie import jobs" ON vigie_import_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can create import jobs
CREATE POLICY "Admins can create Vigie import jobs" ON vigie_import_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- Create view for multi-source promises
-- ============================================================================
CREATE OR REPLACE VIEW promises_with_sources AS
SELECT
    pp.*,
    p.name as politician_name,
    p.party as politician_party,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.verification_source = 'vigie_community') as vigie_verifications,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.verification_source = 'ai_assisted') as ai_verifications,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.verification_source = 'parliamentary_match') as parliamentary_verifications,
    MAX(pv.match_confidence) as max_confidence
FROM political_promises pp
LEFT JOIN politicians p ON pp.politician_id = p.id
LEFT JOIN promise_verifications pv ON pp.id = pv.promise_id
GROUP BY pp.id, p.name, p.party;

COMMENT ON VIEW promises_with_sources IS 'Promises with aggregated verification sources';
