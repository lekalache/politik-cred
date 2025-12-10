-- Drop view first to allow column changes
DROP VIEW IF EXISTS politician_credibility_summary;

-- Recreate view with AI score columns
CREATE OR REPLACE VIEW politician_credibility_summary AS
SELECT
  p.id,
  p.name,
  p.party,
  p.credibility_score,
  p.credibility_last_updated,
  p.credibility_change_count,
  p.ai_score,
  p.ai_last_audited_at,

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
GROUP BY p.id, p.name, p.party, p.credibility_score, p.credibility_last_updated, p.credibility_change_count, p.ai_score, p.ai_last_audited_at;

COMMENT ON VIEW politician_credibility_summary IS 'Aggregates credibility stats for each politician, including AI scores';
