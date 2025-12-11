-- Create audit_logs table for tracking cron job executions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_activity ON audit_logs(activity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow authenticated users to read
CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE audit_logs IS 'Logs for automated audit activities and cron jobs';
