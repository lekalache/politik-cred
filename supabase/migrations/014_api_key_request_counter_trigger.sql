/**
 * Migration 014: API Key Request Counter Trigger
 *
 * Automatically increment api_keys.total_requests when a new
 * usage log is created.
 */

-- Function to increment total_requests counter
CREATE OR REPLACE FUNCTION increment_api_key_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the total_requests counter for the API key
  UPDATE api_keys
  SET total_requests = total_requests + 1
  WHERE id = NEW.api_key_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that fires after each insert into api_usage_logs
CREATE TRIGGER api_key_request_counter_trigger
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_api_key_requests();

COMMENT ON FUNCTION increment_api_key_requests IS 'Automatically increment api_keys.total_requests when a usage log is created';
