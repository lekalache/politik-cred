-- Migration: URL Health Tracking for Promise Sources
-- Date: 2025-01-10
-- Description: Adds URL validation and health monitoring to political_promises
-- This ensures all promise sources are verifiable and accessible

-- ============================================================================
-- Add URL health tracking columns to political_promises
-- ============================================================================

ALTER TABLE political_promises
  ADD COLUMN IF NOT EXISTS source_url_status varchar(50) DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS source_url_http_status integer,
  ADD COLUMN IF NOT EXISTS source_url_last_checked timestamptz,
  ADD COLUMN IF NOT EXISTS source_url_redirect_url varchar(1000),
  ADD COLUMN IF NOT EXISTS source_url_archive_url varchar(1000), -- archive.org fallback
  ADD COLUMN IF NOT EXISTS source_url_error_message text,
  ADD COLUMN IF NOT EXISTS url_check_attempts integer DEFAULT 0;

-- Add constraint for valid URL status
ALTER TABLE political_promises
  ADD CONSTRAINT valid_source_url_status
  CHECK (source_url_status IN (
    'unchecked',        -- Not yet validated
    'valid',            -- URL accessible (HTTP 200)
    'redirect',         -- URL redirects (HTTP 301/302)
    'client_error',     -- HTTP 4xx errors
    'server_error',     -- HTTP 5xx errors
    'network_error',    -- Cannot reach URL
    'timeout',          -- Request timed out
    'invalid_format',   -- Not a valid URL format
    'archived_only'     -- Only archive.org version works
  ));

-- ============================================================================
-- Create index for URL health queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_promises_url_status
  ON political_promises(source_url_status);

CREATE INDEX IF NOT EXISTS idx_promises_url_last_checked
  ON political_promises(source_url_last_checked DESC);

-- Index for finding unchecked URLs
CREATE INDEX IF NOT EXISTS idx_promises_url_unchecked
  ON political_promises(source_url_status, created_at DESC)
  WHERE source_url_status = 'unchecked';

-- Index for finding URLs needing re-validation (checked more than 7 days ago)
CREATE INDEX IF NOT EXISTS idx_promises_url_needs_recheck
  ON political_promises(source_url_last_checked)
  WHERE source_url_status IN ('valid', 'redirect')
  AND source_url_last_checked < NOW() - INTERVAL '7 days';

-- ============================================================================
-- Helper function to get URL health summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_url_health_summary()
RETURNS TABLE(
  status varchar(50),
  count bigint,
  percentage numeric(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH total AS (
    SELECT COUNT(*)::numeric as total_count
    FROM political_promises
  )
  SELECT
    pp.source_url_status,
    COUNT(*) as count,
    ROUND((COUNT(*)::numeric / total.total_count * 100), 2) as percentage
  FROM political_promises pp, total
  GROUP BY pp.source_url_status, total.total_count
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper function to find URLs needing validation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_urls_needing_check(limit_count integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  source_url varchar(1000),
  politician_id uuid,
  promise_text text,
  created_at timestamptz,
  url_check_attempts integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.source_url,
    pp.politician_id,
    pp.promise_text,
    pp.created_at,
    pp.url_check_attempts
  FROM political_promises pp
  WHERE
    -- Unchecked URLs
    pp.source_url_status = 'unchecked'
    OR
    -- URLs that need rechecking (older than 7 days)
    (pp.source_url_status IN ('valid', 'redirect')
     AND pp.source_url_last_checked < NOW() - INTERVAL '7 days')
    OR
    -- Failed URLs with low attempt count (retry)
    (pp.source_url_status IN ('timeout', 'server_error')
     AND pp.url_check_attempts < 3
     AND pp.source_url_last_checked < NOW() - INTERVAL '1 day')
  ORDER BY
    CASE pp.source_url_status
      WHEN 'unchecked' THEN 1
      WHEN 'timeout' THEN 2
      WHEN 'server_error' THEN 3
      ELSE 4
    END,
    pp.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update consistency score calculation to exclude invalid URLs
-- ============================================================================

-- Update the existing function to consider URL health
CREATE OR REPLACE FUNCTION calculate_consistency_score(pol_id uuid)
RETURNS numeric AS $$
DECLARE
    kept integer;
    broken integer;
    partial integer;
    total integer;
    score numeric;
BEGIN
    -- Count promise outcomes (only include promises with valid sources)
    SELECT
        COUNT(*) FILTER (WHERE pv.match_type = 'kept') as kept_count,
        COUNT(*) FILTER (WHERE pv.match_type = 'broken') as broken_count,
        COUNT(*) FILTER (WHERE pv.match_type = 'partial') as partial_count,
        COUNT(*) as total_count
    INTO kept, broken, partial, total
    FROM promise_verifications pv
    JOIN political_promises pp ON pv.promise_id = pp.id
    WHERE pp.politician_id = pol_id
    AND pv.verified_at IS NOT NULL
    AND pv.is_disputed = false
    -- EXCLUDE promises with invalid/unchecked source URLs
    AND pp.source_url_status IN ('valid', 'redirect', 'archived_only');

    -- Calculate score (kept = 100%, partial = 50%, broken = 0%)
    IF total > 0 THEN
        score := ((kept * 1.0 + partial * 0.5) / total) * 100;
    ELSE
        score := NULL; -- Not enough data
    END IF;

    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_url_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_urls_needing_check(integer) TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN political_promises.source_url_status IS 'Health status of the source URL (valid, invalid, redirect, error, etc.)';
COMMENT ON COLUMN political_promises.source_url_http_status IS 'HTTP status code from last URL check (200, 404, 500, etc.)';
COMMENT ON COLUMN political_promises.source_url_last_checked IS 'Timestamp of last URL validation check';
COMMENT ON COLUMN political_promises.source_url_redirect_url IS 'Final URL if source_url redirects';
COMMENT ON COLUMN political_promises.source_url_archive_url IS 'Archive.org URL as fallback if original is dead';
COMMENT ON COLUMN political_promises.source_url_error_message IS 'Error message from last failed URL check';
COMMENT ON COLUMN political_promises.url_check_attempts IS 'Number of times URL validation has been attempted';

COMMENT ON FUNCTION get_url_health_summary() IS 'Returns summary statistics of URL health statuses across all promises';
COMMENT ON FUNCTION get_urls_needing_check(integer) IS 'Returns list of URLs that need validation or re-validation';
