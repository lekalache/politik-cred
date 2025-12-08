/**
 * Migration 013: API Key System
 *
 * Implements a complete API key authentication and authorization system
 * for external integrations and AI orchestrators.
 *
 * Features:
 * - Secure API key storage (SHA-256 hashed)
 * - Scoped permissions (read, write, trigger, admin)
 * - Tiered access (free, standard, premium, enterprise)
 * - Per-key rate limiting with sliding windows
 * - Comprehensive audit logging
 * - IP whitelisting support
 * - Key expiration and rotation
 */

-- ============================================================================
-- TABLE 1: api_key_scopes
-- Defines available permission scopes for API keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_key_scopes (
  scope VARCHAR(100) PRIMARY KEY,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('read', 'write', 'trigger', 'admin')),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  required_tier VARCHAR(20) NOT NULL CHECK (required_tier IN ('free', 'standard', 'premium', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE api_key_scopes IS 'Available permission scopes for API keys';
COMMENT ON COLUMN api_key_scopes.scope IS 'Unique scope identifier (e.g., read:promises, write:verifications)';
COMMENT ON COLUMN api_key_scopes.category IS 'Scope category for grouping';
COMMENT ON COLUMN api_key_scopes.risk_level IS 'Security risk level of the scope';
COMMENT ON COLUMN api_key_scopes.required_tier IS 'Minimum tier required to use this scope';

-- ============================================================================
-- TABLE 2: api_keys
-- Stores API keys for external authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key identification
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  name TEXT NOT NULL,

  -- Access control
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'premium', 'enterprise')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  allowed_ips TEXT[],

  -- Rate limiting (custom per-key overrides)
  rate_limit_minute INTEGER,
  rate_limit_hour INTEGER,
  rate_limit_day INTEGER,

  -- Ownership and tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_used_ip INET,
  total_requests INTEGER NOT NULL DEFAULT 0,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE api_keys IS 'API keys for external authentication and authorization';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (never store plain text)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 16 characters of key for display (e.g., sk_live_abc123...)';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for the API key';
COMMENT ON COLUMN api_keys.tier IS 'Access tier determining rate limits and available scopes';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permitted scopes (supports wildcards like read:*)';
COMMENT ON COLUMN api_keys.is_active IS 'Whether the key is currently active';
COMMENT ON COLUMN api_keys.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN api_keys.allowed_ips IS 'Optional IP whitelist for additional security';
COMMENT ON COLUMN api_keys.rate_limit_minute IS 'Custom rate limit per minute (overrides tier default)';
COMMENT ON COLUMN api_keys.rate_limit_hour IS 'Custom rate limit per hour (overrides tier default)';
COMMENT ON COLUMN api_keys.rate_limit_day IS 'Custom rate limit per day (overrides tier default)';

-- Indexes for performance
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX idx_api_keys_tier ON api_keys(tier);

-- ============================================================================
-- TABLE 3: api_usage_logs
-- Comprehensive audit trail for all API requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API key reference
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  request_id UUID NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,

  -- Client information
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Rate limiting metadata
  rate_limit_hit BOOLEAN DEFAULT false,
  rate_limit_remaining INTEGER,

  -- Resource usage (for future billing/analytics)
  ai_tokens_used INTEGER DEFAULT 0,
  db_queries_count INTEGER DEFAULT 0,
  external_api_calls INTEGER DEFAULT 0,
  credits_consumed NUMERIC(10,2) DEFAULT 0,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE api_usage_logs IS 'Audit trail for all API requests made with API keys';
COMMENT ON COLUMN api_usage_logs.request_id IS 'Unique identifier for request tracing';
COMMENT ON COLUMN api_usage_logs.endpoint IS 'API endpoint path';
COMMENT ON COLUMN api_usage_logs.method IS 'HTTP method (GET, POST, etc.)';
COMMENT ON COLUMN api_usage_logs.rate_limit_hit IS 'Whether this request hit a rate limit';
COMMENT ON COLUMN api_usage_logs.credits_consumed IS 'Billing credits consumed (for future monetization)';

-- Indexes for analytics and performance
CREATE INDEX idx_usage_logs_key_created ON api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX idx_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_usage_logs_status ON api_usage_logs(status_code);
CREATE INDEX idx_usage_logs_created ON api_usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_request_id ON api_usage_logs(request_id);

-- ============================================================================
-- TABLE 4: api_rate_limits
-- Sliding window rate limit counters
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API key reference
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Window tracking
  window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per key per window
  UNIQUE(api_key_id, window_type, window_start)
);

COMMENT ON TABLE api_rate_limits IS 'Sliding window rate limit counters for API keys';
COMMENT ON COLUMN api_rate_limits.window_type IS 'Time window type (minute, hour, day)';
COMMENT ON COLUMN api_rate_limits.window_start IS 'Start timestamp of the time window';
COMMENT ON COLUMN api_rate_limits.request_count IS 'Number of requests in this window';

-- Index for efficient rate limit checks
CREATE INDEX idx_rate_limits_window ON api_rate_limits(api_key_id, window_type, window_start DESC);
CREATE INDEX idx_rate_limits_cleanup ON api_rate_limits(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- api_key_scopes: Public can read for documentation
CREATE POLICY "api_key_scopes_public_read" ON api_key_scopes
  FOR SELECT
  USING (true);

-- api_keys: Only service role and admins can manage
CREATE POLICY "api_keys_admin_all" ON api_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "api_keys_service_all" ON api_keys
  FOR ALL
  USING (true); -- Service role bypasses RLS

-- api_usage_logs: Only service role and admins can read
CREATE POLICY "api_usage_logs_admin_read" ON api_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "api_usage_logs_service_all" ON api_usage_logs
  FOR ALL
  USING (true); -- Service role bypasses RLS

-- api_rate_limits: Only service role can access
CREATE POLICY "api_rate_limits_service_all" ON api_rate_limits
  FOR ALL
  USING (true); -- Service role only

-- ============================================================================
-- SEED DATA: API Key Scopes
-- ============================================================================

INSERT INTO api_key_scopes (scope, description, category, risk_level, required_tier) VALUES
  -- Read scopes (low risk, free tier)
  ('read:politicians', 'Read politician profiles and basic information', 'read', 'low', 'free'),
  ('read:scores', 'Read consistency scores and metrics', 'read', 'low', 'free'),
  ('read:promises', 'Read political promises', 'read', 'low', 'free'),
  ('read:actions', 'Read parliamentary actions', 'read', 'low', 'free'),
  ('read:verifications', 'Read promise verifications', 'read', 'low', 'free'),
  ('read:news', 'Read news articles', 'read', 'low', 'free'),

  -- Write scopes (medium risk, standard tier)
  ('write:promises', 'Submit and extract political promises', 'write', 'medium', 'standard'),
  ('write:verifications', 'Submit promise verifications', 'write', 'medium', 'standard'),
  ('write:votes', 'Submit community votes', 'write', 'medium', 'standard'),
  ('write:news', 'Submit news articles', 'write', 'medium', 'standard'),

  -- Trigger scopes (high risk, premium tier)
  ('trigger:data_collection', 'Trigger parliamentary data collection', 'trigger', 'high', 'premium'),
  ('trigger:semantic_matching', 'Trigger semantic matching of promises to actions', 'trigger', 'high', 'premium'),
  ('trigger:score_calculation', 'Trigger consistency score recalculation', 'trigger', 'high', 'premium'),

  -- Admin scopes (critical risk, enterprise tier)
  ('admin:api_keys', 'Manage API keys', 'admin', 'critical', 'enterprise'),
  ('admin:moderation', 'Moderate content and users', 'admin', 'critical', 'enterprise')
ON CONFLICT (scope) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if an API key has required scopes (supports wildcards)
CREATE OR REPLACE FUNCTION check_api_key_scopes(
  key_scopes TEXT[],
  required_scopes TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  required_scope TEXT;
  key_scope TEXT;
BEGIN
  -- Check each required scope
  FOREACH required_scope IN ARRAY required_scopes
  LOOP
    -- Check if any key scope matches
    DECLARE
      scope_matched BOOLEAN := false;
    BEGIN
      FOREACH key_scope IN ARRAY key_scopes
      LOOP
        -- Exact match
        IF key_scope = required_scope THEN
          scope_matched := true;
          EXIT;
        END IF;

        -- Wildcard match: read:* matches read:anything
        IF key_scope LIKE '%:*' AND required_scope LIKE substring(key_scope from 1 for length(key_scope) - 1) || '%' THEN
          scope_matched := true;
          EXIT;
        END IF;

        -- Admin wildcard: admin:* grants everything
        IF key_scope = 'admin:*' THEN
          scope_matched := true;
          EXIT;
        END IF;
      END LOOP;

      -- If this required scope wasn't matched, return false
      IF NOT scope_matched THEN
        RETURN false;
      END IF;
    END;
  END LOOP;

  -- All required scopes were matched
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION check_api_key_scopes IS 'Check if API key scopes satisfy required scopes (supports wildcards)';

-- Function to get tier default rate limits
CREATE OR REPLACE FUNCTION get_tier_rate_limits(tier_name VARCHAR)
RETURNS TABLE(
  minute_limit INTEGER,
  hour_limit INTEGER,
  day_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT
    CASE tier_name
      WHEN 'free' THEN 10
      WHEN 'standard' THEN 60
      WHEN 'premium' THEN 120
      WHEN 'enterprise' THEN 300
      ELSE 10
    END,
    CASE tier_name
      WHEN 'free' THEN 100
      WHEN 'standard' THEN 1000
      WHEN 'premium' THEN 5000
      WHEN 'enterprise' THEN 20000
      ELSE 100
    END,
    CASE tier_name
      WHEN 'free' THEN 1000
      WHEN 'standard' THEN 10000
      WHEN 'premium' THEN 50000
      WHEN 'enterprise' THEN 200000
      ELSE 1000
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_tier_rate_limits IS 'Get default rate limits for a given tier';

-- Function to cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_rate_limits
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Delete rate limit records older than 7 days (for maintenance)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- API key usage summary
CREATE OR REPLACE VIEW api_key_usage_summary AS
SELECT
  ak.id,
  ak.name,
  ak.tier,
  ak.is_active,
  ak.total_requests,
  ak.last_used_at,
  COUNT(aul.id) AS logged_requests,
  COUNT(CASE WHEN aul.status_code >= 200 AND aul.status_code < 300 THEN 1 END) AS successful_requests,
  COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) AS failed_requests,
  AVG(aul.response_time_ms) AS avg_response_time_ms,
  MAX(aul.created_at) AS last_request_at
FROM api_keys ak
LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id
GROUP BY ak.id, ak.name, ak.tier, ak.is_active, ak.total_requests, ak.last_used_at;

COMMENT ON VIEW api_key_usage_summary IS 'Summary statistics for each API key';

-- Popular endpoints
CREATE OR REPLACE VIEW api_popular_endpoints AS
SELECT
  endpoint,
  method,
  COUNT(*) AS request_count,
  AVG(response_time_ms) AS avg_response_time_ms,
  COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) AS successful_requests,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) AS failed_requests
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint, method
ORDER BY request_count DESC;

COMMENT ON VIEW api_popular_endpoints IS 'Most frequently accessed endpoints in the last 30 days';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant service role full access
GRANT ALL ON api_key_scopes TO service_role;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON api_usage_logs TO service_role;
GRANT ALL ON api_rate_limits TO service_role;

-- Grant authenticated users read access to scopes (for documentation)
GRANT SELECT ON api_key_scopes TO authenticated;

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

-- Migration complete!
-- Next steps:
-- 1. Run setup-api-keys.ts script to generate initial keys
-- 2. Implement withApiKey and withApiKeyRateLimit middleware
-- 3. Create public API endpoints under /api/v1/public/
-- 4. Create admin API endpoints under /api/admin/api-keys/
