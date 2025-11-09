-- Migration: Auto Credibility Update Trigger
-- Date: 2025-01-14
-- Description: Automatically update politician credibility when promise verification status changes

-- ============================================================================
-- Trigger Function: Auto-update credibility on promise verification
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_credibility_update()
RETURNS TRIGGER AS $$
DECLARE
  v_score_change numeric;
  v_change_reason varchar(50);
  v_description text;
  v_verification_sources text[];
BEGIN
  -- Only trigger if verification_status changed from 'unverified' to something else
  -- or if status changed between verified states
  IF (OLD.verification_status = 'unverified' AND NEW.verification_status != 'unverified')
     OR (OLD.verification_status != NEW.verification_status AND NEW.verification_status != 'unverified') THEN

    -- Build verification sources array (always includes manual_review for admin verification)
    v_verification_sources := ARRAY['manual_review'];

    -- Add AI if there's a parliamentary action match
    IF NEW.matched_parliamentary_action_id IS NOT NULL THEN
      v_verification_sources := array_append(v_verification_sources, 'ai_assisted');
    END IF;

    -- Map verification status to change reason
    CASE NEW.verification_status
      WHEN 'kept' THEN
        v_change_reason := 'promise_kept';
      WHEN 'broken' THEN
        v_change_reason := 'promise_broken';
      WHEN 'partial' THEN
        v_change_reason := 'promise_partial';
      WHEN 'in_progress' THEN
        v_change_reason := 'promise_partial'; -- In progress counts as partial
      ELSE
        -- Don't update for unverified
        RETURN NEW;
    END CASE;

    -- Calculate score change using existing function
    v_score_change := calculate_credibility_change(
      NEW.verification_status,
      v_verification_sources,
      COALESCE(NEW.verification_confidence, 0.95), -- Default to high confidence for admin verification
      COALESCE(NEW.importance_level, 'high')::varchar(50) -- Default to high importance
    );

    -- Generate description
    v_description := format(
      'Promesse %s : "%s". Vérifié par l''administrateur.',
      CASE NEW.verification_status
        WHEN 'kept' THEN 'tenue'
        WHEN 'broken' THEN 'non tenue'
        WHEN 'partial' THEN 'partiellement tenue'
        WHEN 'in_progress' THEN 'en cours de réalisation'
        ELSE 'vérifiée'
      END,
      substring(NEW.promise_text from 1 for 100) || CASE WHEN length(NEW.promise_text) > 100 THEN '...' ELSE '' END
    );

    -- Update politician credibility
    PERFORM update_politician_credibility(
      p_politician_id := NEW.politician_id,
      p_promise_id := NEW.id,
      p_score_change := v_score_change,
      p_change_reason := v_change_reason,
      p_description := v_description,
      p_verification_sources := v_verification_sources,
      p_verification_confidence := COALESCE(NEW.verification_confidence, 0.95),
      p_evidence_url := COALESCE(NEW.evidence_url, NEW.source_url),
      p_created_by := auth.uid()
    );

    RAISE NOTICE 'Auto-updated credibility for politician % (promise %): % points',
      NEW.politician_id, NEW.id, v_score_change;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_credibility_update IS 'Automatically updates politician credibility when promise verification status changes';

-- ============================================================================
-- Create Trigger
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_update_credibility_on_verification ON political_promises;

-- Create new trigger
CREATE TRIGGER auto_update_credibility_on_verification
  AFTER UPDATE OF verification_status ON political_promises
  FOR EACH ROW
  WHEN (NEW.verification_status IS DISTINCT FROM OLD.verification_status)
  EXECUTE FUNCTION trigger_credibility_update();

COMMENT ON TRIGGER auto_update_credibility_on_verification ON political_promises IS 'Automatically updates credibility score when promise verification status changes';

-- ============================================================================
-- Add missing columns to political_promises if needed
-- ============================================================================

-- Add columns for better tracking (idempotent)
DO $$
BEGIN
  -- matched_parliamentary_action_id for linking to matched actions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'matched_parliamentary_action_id'
  ) THEN
    ALTER TABLE political_promises
    ADD COLUMN matched_parliamentary_action_id uuid REFERENCES parliamentary_actions(id) ON DELETE SET NULL;
  END IF;

  -- verification_confidence score (0-1)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'verification_confidence'
  ) THEN
    ALTER TABLE political_promises
    ADD COLUMN verification_confidence numeric(3,2) CHECK (verification_confidence >= 0 AND verification_confidence <= 1);
  END IF;

  -- verified_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE political_promises
    ADD COLUMN verified_at timestamptz;
  END IF;

  -- evidence_url for verification proof
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'evidence_url'
  ) THEN
    ALTER TABLE political_promises
    ADD COLUMN evidence_url varchar(1000);
  END IF;

  -- view_count for analytics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'view_count'
  ) THEN
    ALTER TABLE political_promises
    ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- Create index for faster queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_promises_verification_status
  ON political_promises(verification_status);

CREATE INDEX IF NOT EXISTS idx_promises_verified_at
  ON political_promises(verified_at DESC) WHERE verified_at IS NOT NULL;

-- ============================================================================
-- Example: Test the trigger (commented out - uncomment to test manually)
-- ============================================================================

/*
-- This should automatically update credibility:
UPDATE political_promises
SET verification_status = 'kept'
WHERE id = (SELECT id FROM political_promises WHERE verification_status = 'unverified' LIMIT 1);

-- Check the credibility history:
SELECT * FROM credibility_history ORDER BY created_at DESC LIMIT 1;

-- Check politician's score updated:
SELECT name, credibility_score FROM politicians
WHERE id = (SELECT politician_id FROM political_promises WHERE verification_status = 'kept' LIMIT 1);
*/
