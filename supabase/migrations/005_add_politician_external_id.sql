-- Migration: Add external_id to politicians table
-- This prevents duplicate insertions from scrapers by using unique IDs from external sources

-- Add external_id column
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Add source_system column to track where the ID came from
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS source_system VARCHAR(50);

-- Create unique index on external_id + source_system
CREATE UNIQUE INDEX IF NOT EXISTS idx_politicians_external_id_source
ON politicians(external_id, source_system)
WHERE external_id IS NOT NULL;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_politicians_external_id
ON politicians(external_id)
WHERE external_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN politicians.external_id IS 'Unique ID from external source (e.g., NosDéputés slug, Sénat ID)';
COMMENT ON COLUMN politicians.source_system IS 'Source system identifier (e.g., "nosdeputes", "nossenateurs")';

-- Helper function for upsert by external_id
CREATE OR REPLACE FUNCTION upsert_politician_by_external_id(
  p_external_id VARCHAR,
  p_source_system VARCHAR,
  p_name VARCHAR,
  p_party VARCHAR,
  p_position VARCHAR,
  p_photo_url VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  politician_id UUID;
BEGIN
  -- Try to find existing politician by external_id
  SELECT id INTO politician_id
  FROM politicians
  WHERE external_id = p_external_id
    AND source_system = p_source_system;

  IF politician_id IS NULL THEN
    -- Insert new politician
    INSERT INTO politicians (
      name,
      party,
      position,
      photo_url,
      external_id,
      source_system,
      credibility_score
    ) VALUES (
      p_name,
      p_party,
      p_position,
      p_photo_url,
      p_external_id,
      p_source_system,
      0  -- Default score
    )
    RETURNING id INTO politician_id;
  ELSE
    -- Update existing politician
    UPDATE politicians
    SET
      name = p_name,
      party = p_party,
      position = p_position,
      photo_url = COALESCE(p_photo_url, photo_url),
      updated_at = NOW()
    WHERE id = politician_id;
  END IF;

  RETURN politician_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION upsert_politician_by_external_id IS 'Upsert politician using external_id to prevent duplicates';
