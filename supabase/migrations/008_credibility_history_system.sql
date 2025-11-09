-- Migration: Credibility History System
-- Date: 2025-01-14
-- Description: Track credibility score changes based on promise verification
--              Uses legally defensible language: tracks actions, not character judgments

-- ============================================================================
-- Credibility History Table
-- ============================================================================
-- Tracks every change to a politician's credibility score with full context

CREATE TABLE IF NOT EXISTS credibility_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id uuid REFERENCES politicians(id) ON DELETE CASCADE NOT NULL,
  promise_id uuid REFERENCES political_promises(id) ON DELETE SET NULL,

  -- Score change details
  previous_score numeric(5,2) NOT NULL,
  new_score numeric(5,2) NOT NULL,
  score_change numeric(5,2) NOT NULL,  -- Can be positive or negative

  -- What caused this change
  change_reason varchar(50) NOT NULL CHECK (
    change_reason IN (
      'promise_kept',           -- Promise verified as kept
      'promise_broken',         -- Promise verified as broken
      'promise_partial',        -- Promise partially fulfilled
      'statement_verified',     -- Factual statement confirmed
      'statement_contradicted', -- Statement contradicted by facts
      'manual_adjustment',      -- Admin manual adjustment
      'initial_score'           -- Initial credibility score
    )
  ),

  -- Verification details
  verification_sources text[],  -- Array of sources: ['ai_assisted', 'vigie_community', etc.]
  verification_confidence numeric(3,2), -- Overall confidence (0-1)

  -- Human-readable description (legally careful language)
  description text NOT NULL,

  -- Evidence
  evidence_url varchar(1000),  -- Link to promise, article, vote, etc.

  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Audit
  is_disputed boolean DEFAULT false,
  dispute_notes text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credibility_history_politician ON credibility_history(politician_id);
CREATE INDEX IF NOT EXISTS idx_credibility_history_promise ON credibility_history(promise_id);
CREATE INDEX IF NOT EXISTS idx_credibility_history_created_at ON credibility_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credibility_history_change_reason ON credibility_history(change_reason);

COMMENT ON TABLE credibility_history IS 'Tracks credibility score changes with full audit trail';
COMMENT ON COLUMN credibility_history.description IS 'Legally careful description: states facts, not character judgments';
COMMENT ON COLUMN credibility_history.verification_sources IS 'Array of verification sources that contributed to this score change';

-- ============================================================================
-- RLS Policies for credibility_history
-- ============================================================================
ALTER TABLE credibility_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read credibility history (transparency)
DROP POLICY IF EXISTS "Anyone can read credibility history" ON credibility_history;
CREATE POLICY "Anyone can read credibility history" ON credibility_history
    FOR SELECT USING (true);

-- Only admins can insert credibility changes
DROP POLICY IF EXISTS "Admins can insert credibility changes" ON credibility_history;
CREATE POLICY "Admins can insert credibility changes" ON credibility_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Only admins can update (for disputes)
DROP POLICY IF EXISTS "Admins can update credibility history" ON credibility_history;
CREATE POLICY "Admins can update credibility history" ON credibility_history
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- Update politicians table with credibility tracking
-- ============================================================================

-- Add columns if they don't exist
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS credibility_score numeric(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS credibility_last_updated timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS credibility_change_count integer DEFAULT 0;

COMMENT ON COLUMN politicians.credibility_score IS 'Current credibility score (0-200, baseline 100). Based on promise verification, not character judgment.';
COMMENT ON COLUMN politicians.credibility_last_updated IS 'Timestamp of last credibility score change';
COMMENT ON COLUMN politicians.credibility_change_count IS 'Total number of credibility changes (for quick stats)';

-- Add constraint: credibility score must be 0-200
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credibility_score_range'
  ) THEN
    ALTER TABLE politicians
    ADD CONSTRAINT credibility_score_range CHECK (credibility_score >= 0 AND credibility_score <= 200);
  END IF;
END $$;

-- ============================================================================
-- Credibility Score Calculation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_credibility_change(
  p_promise_verification_status varchar(50),
  p_verification_sources text[],
  p_verification_confidence numeric,
  p_promise_importance varchar(50) DEFAULT 'medium'
) RETURNS numeric AS $$
DECLARE
  base_change numeric;
  confidence_multiplier numeric := 1.0;
  importance_multiplier numeric := 1.0;
  final_change numeric;
BEGIN
  -- Base score change based on verification status
  CASE p_promise_verification_status
    WHEN 'kept' THEN base_change := 3.0;           -- Promise kept: +3 points
    WHEN 'broken' THEN base_change := -5.0;        -- Promise broken: -5 points
    WHEN 'partial' THEN base_change := 1.0;        -- Partial: +1 point
    WHEN 'in_progress' THEN base_change := 0.5;    -- In progress: +0.5 point
    ELSE base_change := 0.0;
  END CASE;

  -- Sources tracked for transparency only (don't affect score magnitude)
  -- A broken promise is -5 points regardless of verification source count

  -- Confidence multiplier (0-1 range)
  confidence_multiplier := COALESCE(p_verification_confidence, 0.8);

  -- Importance multiplier
  CASE p_promise_importance
    WHEN 'critical' THEN importance_multiplier := 1.5;
    WHEN 'high' THEN importance_multiplier := 1.25;
    WHEN 'medium' THEN importance_multiplier := 1.0;
    WHEN 'low' THEN importance_multiplier := 0.75;
    ELSE importance_multiplier := 1.0;
  END CASE;

  -- Calculate final change (no source multiplier)
  final_change := base_change * confidence_multiplier * importance_multiplier;

  -- Round to 2 decimal places
  RETURN ROUND(final_change, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_credibility_change IS 'Calculates credibility score change based on promise verification, sources, and confidence';

-- ============================================================================
-- Function to update politician credibility
-- ============================================================================

CREATE OR REPLACE FUNCTION update_politician_credibility(
  p_politician_id uuid,
  p_promise_id uuid,
  p_score_change numeric,
  p_change_reason varchar(50),
  p_description text,
  p_verification_sources text[] DEFAULT NULL,
  p_verification_confidence numeric DEFAULT NULL,
  p_evidence_url varchar(1000) DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  current_score numeric;
  new_score numeric;
BEGIN
  -- Get current credibility score
  SELECT credibility_score INTO current_score
  FROM politicians
  WHERE id = p_politician_id;

  -- Calculate new score (capped at 0-200)
  new_score := GREATEST(0, LEAST(200, current_score + p_score_change));

  -- Insert into credibility history
  INSERT INTO credibility_history (
    politician_id,
    promise_id,
    previous_score,
    new_score,
    score_change,
    change_reason,
    description,
    verification_sources,
    verification_confidence,
    evidence_url,
    created_by
  ) VALUES (
    p_politician_id,
    p_promise_id,
    current_score,
    new_score,
    p_score_change,
    p_change_reason,
    p_description,
    p_verification_sources,
    p_verification_confidence,
    p_evidence_url,
    p_created_by
  );

  -- Update politician's credibility score
  UPDATE politicians
  SET
    credibility_score = new_score,
    credibility_last_updated = now(),
    credibility_change_count = credibility_change_count + 1
  WHERE id = p_politician_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_politician_credibility IS 'Updates politician credibility score and records change in history';

-- ============================================================================
-- View: Politician Credibility Summary
-- ============================================================================

CREATE OR REPLACE VIEW politician_credibility_summary AS
SELECT
  p.id,
  p.name,
  p.party,
  p.credibility_score,
  p.credibility_last_updated,
  p.credibility_change_count,

  -- Recent changes (last 30 days)
  COUNT(ch.id) FILTER (WHERE ch.created_at >= now() - interval '30 days') as changes_last_30_days,
  SUM(ch.score_change) FILTER (WHERE ch.created_at >= now() - interval '30 days') as score_change_last_30_days,

  -- Positive vs negative changes
  COUNT(ch.id) FILTER (WHERE ch.score_change > 0) as positive_changes,
  COUNT(ch.id) FILTER (WHERE ch.score_change < 0) as negative_changes,
  SUM(ch.score_change) FILTER (WHERE ch.score_change > 0) as total_gains,
  SUM(ch.score_change) FILTER (WHERE ch.score_change < 0) as total_losses,

  -- Promise-based changes
  COUNT(ch.id) FILTER (WHERE ch.change_reason = 'promise_kept') as promises_kept_count,
  COUNT(ch.id) FILTER (WHERE ch.change_reason = 'promise_broken') as promises_broken_count,
  COUNT(ch.id) FILTER (WHERE ch.change_reason = 'promise_partial') as promises_partial_count,

  -- Latest change
  MAX(ch.created_at) as last_change_date
FROM politicians p
LEFT JOIN credibility_history ch ON p.id = ch.politician_id
GROUP BY p.id, p.name, p.party, p.credibility_score, p.credibility_last_updated, p.credibility_change_count;

COMMENT ON VIEW politician_credibility_summary IS 'Aggregates credibility stats for each politician';

-- ============================================================================
-- Example Data: Set initial credibility scores
-- ============================================================================

-- Set all existing politicians to baseline 100.0 credibility
UPDATE politicians
SET credibility_score = 100.00
WHERE credibility_score IS NULL;
