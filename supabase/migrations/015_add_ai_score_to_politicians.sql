-- Add AI score columns to politicians table
ALTER TABLE politicians 
ADD COLUMN IF NOT EXISTS ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
ADD COLUMN IF NOT EXISTS ai_last_audited_at TIMESTAMP WITH TIME ZONE;

-- Create index for AI score
CREATE INDEX IF NOT EXISTS idx_politicians_ai_score ON politicians(ai_score DESC);
