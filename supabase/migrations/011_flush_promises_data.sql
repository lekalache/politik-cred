-- Migration: Flush Promises Data for Clean Rebuild
-- Date: 2025-01-10
-- Description: Safely removes all promise-related data to enable clean re-import
-- WARNING: This will delete ALL promises, verifications, and consistency scores
-- Use with caution - this is a one-time cleanup migration

-- ============================================================================
-- BACKUP EXISTING DATA (for safety)
-- ============================================================================

-- Create backup tables (in case we need to restore)
CREATE TABLE IF NOT EXISTS political_promises_backup_20250110 AS
  SELECT * FROM political_promises;

CREATE TABLE IF NOT EXISTS promise_verifications_backup_20250110 AS
  SELECT * FROM promise_verifications;

CREATE TABLE IF NOT EXISTS consistency_scores_backup_20250110 AS
  SELECT * FROM consistency_scores;

CREATE TABLE IF NOT EXISTS parliamentary_actions_backup_20250110 AS
  SELECT * FROM parliamentary_actions;

-- Log the backup counts
DO $$
DECLARE
  promises_count integer;
  verifications_count integer;
  scores_count integer;
  actions_count integer;
BEGIN
  SELECT COUNT(*) INTO promises_count FROM political_promises;
  SELECT COUNT(*) INTO verifications_count FROM promise_verifications;
  SELECT COUNT(*) INTO scores_count FROM consistency_scores;
  SELECT COUNT(*) INTO parliamentary_actions INTO actions_count FROM parliamentary_actions;

  RAISE NOTICE 'Backup created:';
  RAISE NOTICE '  - Promises: %', promises_count;
  RAISE NOTICE '  - Verifications: %', verifications_count;
  RAISE NOTICE '  - Scores: %', scores_count;
  RAISE NOTICE '  - Actions: %', actions_count;
END $$;

-- ============================================================================
-- FLUSH PROMISE-RELATED DATA
-- ============================================================================

-- Delete in correct order (respect foreign key constraints)

-- 1. Delete consistency scores (no dependencies)
DELETE FROM consistency_scores;

-- 2. Delete promise verifications (depends on promises and actions)
DELETE FROM promise_verifications;

-- 3. Delete political promises
DELETE FROM political_promises;

-- 4. Delete parliamentary actions
DELETE FROM parliamentary_actions;

-- 5. Delete data collection jobs (cleanup job history)
DELETE FROM data_collection_jobs;

-- ============================================================================
-- RESET SEQUENCES (if any)
-- ============================================================================

-- No sequences to reset (using UUIDs)

-- ============================================================================
-- VERIFY DELETION
-- ============================================================================

DO $$
DECLARE
  promises_remaining integer;
  verifications_remaining integer;
  scores_remaining integer;
  actions_remaining integer;
BEGIN
  SELECT COUNT(*) INTO promises_remaining FROM political_promises;
  SELECT COUNT(*) INTO verifications_remaining FROM promise_verifications;
  SELECT COUNT(*) INTO scores_remaining FROM consistency_scores;
  SELECT COUNT(*) INTO actions_remaining FROM parliamentary_actions;

  IF promises_remaining > 0 OR verifications_remaining > 0 OR scores_remaining > 0 OR actions_remaining > 0 THEN
    RAISE EXCEPTION 'Flush failed - data still exists';
  ELSE
    RAISE NOTICE 'Flush successful - all promise data removed';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE political_promises_backup_20250110 IS 'Backup of political_promises before flush on 2025-01-10';
COMMENT ON TABLE promise_verifications_backup_20250110 IS 'Backup of promise_verifications before flush on 2025-01-10';
COMMENT ON TABLE consistency_scores_backup_20250110 IS 'Backup of consistency_scores before flush on 2025-01-10';
COMMENT ON TABLE parliamentary_actions_backup_20250110 IS 'Backup of parliamentary_actions before flush on 2025-01-10';
