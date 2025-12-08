-- Migration Status Check and Application Guide
-- Run this to verify migration 010 has been applied

-- Check if URL health tracking columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'political_promises'
    AND column_name = 'source_url_status'
  ) THEN
    RAISE NOTICE '✅ Migration 010 already applied - URL health tracking is active';
  ELSE
    RAISE NOTICE '❌ Migration 010 NOT applied - Please run 010_url_health_tracking.sql';
  END IF;
END $$;

-- Verify the flush was successful
DO $$
DECLARE
  promises_count integer;
  verifications_count integer;
  actions_count integer;
BEGIN
  SELECT COUNT(*) INTO promises_count FROM political_promises;
  SELECT COUNT(*) INTO verifications_count FROM promise_verifications;
  SELECT COUNT(*) INTO actions_count FROM parliamentary_actions;

  RAISE NOTICE 'Current database state:';
  RAISE NOTICE '  - Promises: %', promises_count;
  RAISE NOTICE '  - Verifications: %', verifications_count;
  RAISE NOTICE '  - Actions: %', actions_count;

  IF promises_count = 0 AND verifications_count = 0 THEN
    RAISE NOTICE '✅ Database successfully flushed - Ready for clean import';
  ELSE
    RAISE NOTICE '⚠️  Database still contains data - Run migration 011 if you want to flush';
  END IF;
END $$;
