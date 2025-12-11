# 🛡️ BULLETPROOF AUDIT STRATEGY - Politik Cred'

**Last Updated:** 2025-01-11
**Status:** Implementation Planning
**Goal:** Make politician audit system legally defensible, technically robust, and maximally transparent

---

## 📊 CURRENT STATE ANALYSIS

### ✅ Strong Foundation (Already Implemented)

#### 1. **URL Health Tracking** (Migration 010)
- ✅ Automatic source verification with HTTP status codes
- ✅ Archive.org fallback for dead links
- ✅ Retry logic for transient failures
- ✅ **Only valid sources included in scores** (critical for defensibility)
- ✅ 7-day revalidation for living URLs

#### 2. **Complete Audit Trail** (Migration 008)
- ✅ `credibility_history` table tracking every score change
- ✅ Full context: previous_score, new_score, change_reason
- ✅ Verification sources array
- ✅ Confidence scores
- ✅ Dispute flags (`is_disputed`, `dispute_notes`)
- ✅ Evidence URLs for every change

#### 3. **Multi-Source Verification** (Migrations 004, 007)
- ✅ AI-assisted semantic matching (Hugging Face)
- ✅ Vigie du mensonge integration support
- ✅ Parliamentary data (Assemblée Nationale)
- ✅ Confidence scoring (0-1 scale)
- ✅ Verification source tracking

#### 4. **Legal Compliance Foundations**
- ✅ Factual language policy (not character judgments)
- ✅ Dispute tracking infrastructure
- ✅ Transparent methodology (formulas published)
- ✅ Public audit trail (RLS policies)

#### 5. **Data Quality Infrastructure**
- ✅ Data quality score (0-1) per politician
- ✅ Source platform tracking
- ✅ External ID deduplication (no double-counting)
- ✅ Minimum thresholds (5 promises, 50 votes, 10 actions)

---

## ⚠️ CRITICAL GAPS TO CLOSE

### 🔴 **Priority 1: Legal Defensibility (URGENT)**

| # | Gap | Risk | Impact | French Law |
|---|-----|------|--------|------------|
| 1 | **No formal dispute resolution process** | 🔴 CRITICAL | Politicians can claim unfairness with no clear appeal path | Art. 29 Loi 1881 |
| 2 | **No politician right-of-reply mechanism** | 🔴 CRITICAL | Required by French law for public allegations | Droit de réponse |
| 3 | **No independent review option** | 🟡 HIGH | No external validation of controversial scores | Transparency requirement |

### 🟡 **Priority 2: Technical Robustness**

| # | Gap | Risk | Impact |
|---|-----|------|--------|
| 4 | **No evidence chain of custody** | 🟡 MEDIUM | Can't prove evidence integrity |
| 5 | **No algorithm version control** | 🟡 MEDIUM | Can't reproduce historical scores if formula changes |
| 6 | **No data freshness monitoring** | 🟡 MEDIUM | Stale data → inaccurate scores |
| 7 | **No anomaly detection** | 🟡 MEDIUM | Gaming/errors go unnoticed |

### 🟢 **Priority 3: Quality & Trust**

| # | Gap | Risk | Impact |
|---|-----|------|--------|
| 8 | **No source reliability scoring** | 🟢 LOW | All sources treated equally |
| 9 | **No cross-validation between sources** | 🟢 LOW | Contradictory data not flagged |
| 10 | **No temporal consistency checks** | 🟢 LOW | Score volatility not monitored |

---

## 🛡️ BULLETPROOF IMPLEMENTATION PLAN

---

## **PHASE 1: LEGAL ARMOR (Weeks 1-2)** 🔴 CRITICAL

**Goal:** Ensure full French law compliance, make system legally bulletproof.

### 1.1 Dispute Resolution System

**Database Schema:**
```sql
-- migration: 017_dispute_resolution_system.sql
CREATE TABLE politician_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id uuid REFERENCES politicians(id) NOT NULL,
  disputed_score_id uuid REFERENCES credibility_history(id),
  disputed_promise_id uuid REFERENCES political_promises(id),

  -- Dispute details
  dispute_type varchar(50) CHECK (dispute_type IN (
    'promise_misattribution',  -- "I never said that"
    'source_invalid',          -- "That source is fake/manipulated"
    'context_missing',         -- "You took it out of context"
    'action_miscounted',       -- "That vote was miscounted"
    'calculation_error',       -- "Your math is wrong"
    'right_of_reply'           -- Formal droit de réponse
  )),

  dispute_statement text NOT NULL,
  evidence_urls text[],

  -- Review process
  status varchar(50) DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Awaiting review
    'under_review',      -- Being investigated
    'accepted',          -- Dispute valid, score corrected
    'partially_accepted',-- Some merit, partial correction
    'rejected',          -- Dispute invalid
    'awaiting_evidence'  -- Need more proof from politician
  )),

  -- Review results
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_notes text,
  resolution_action text, -- What was done

  -- Public response (droit de réponse)
  politician_response text,
  response_published_at timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true,

  -- SLA tracking
  target_response_date timestamptz GENERATED ALWAYS AS (created_at + interval '14 days') STORED
);

CREATE INDEX idx_disputes_politician ON politician_disputes(politician_id);
CREATE INDEX idx_disputes_status ON politician_disputes(status);
CREATE INDEX idx_disputes_pending_sla ON politician_disputes(target_response_date)
  WHERE status IN ('pending', 'under_review');

COMMENT ON TABLE politician_disputes IS 'Politician dispute resolution system - implements droit de réponse';
COMMENT ON COLUMN politician_disputes.target_response_date IS 'Must respond within 14 days per French law';
```

**API Endpoints:**
```typescript
// /api/v1/public/disputes/submit
POST /api/v1/public/disputes/submit
Body: {
  politicianId: uuid,
  disputedScoreId?: uuid,
  disputedPromiseId?: uuid,
  disputeType: string,
  statement: string,
  evidenceUrls: string[]
}

// /api/v1/public/disputes/[id]/status
GET /api/v1/public/disputes/{id}/status

// Admin only:
POST /api/admin/disputes/{id}/review
```

### 1.2 Right of Reply System (Droit de Réponse)

**UI Components:**
- `/src/components/disputes/dispute-submission-form.tsx`
- `/src/components/disputes/dispute-status-tracker.tsx`
- `/src/app/dispute/[disputeId]/page.tsx`

**Public Display:**
```typescript
// On politician profile page
<Card className="border-amber-500 bg-amber-50">
  <CardHeader>
    <AlertCircle className="text-amber-600" />
    <h3>Réponse du Politique</h3>
  </CardHeader>
  <CardContent>
    <p>{dispute.politician_response}</p>
    <p className="text-xs text-gray-600">
      Publié le {dispute.response_published_at}
    </p>
  </CardContent>
</Card>
```

### 1.3 Independent Review Mechanism

**Database:**
```sql
CREATE TABLE independent_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type varchar(50) CHECK (audit_type IN (
    'full_system',        -- Complete system audit
    'politician_specific',-- Audit one politician's scores
    'algorithm_review',   -- Review calculation methods
    'data_quality'        -- Review data sources
  )),

  auditor_name varchar(200) NOT NULL,
  auditor_organization varchar(200),
  auditor_credentials text,

  audit_scope text NOT NULL,
  findings text NOT NULL,
  recommendations text,

  -- Results
  overall_assessment varchar(50) CHECK (overall_assessment IN (
    'passed',
    'passed_with_recommendations',
    'failed',
    'inconclusive'
  )),

  confidence_in_system numeric(3,2) CHECK (confidence_in_system >= 0 AND confidence_in_system <= 1),

  audit_date date NOT NULL,
  published_at timestamptz,
  report_url varchar(1000),

  is_public boolean DEFAULT true
);
```

---

## **PHASE 2: TECHNICAL ROBUSTNESS (Weeks 3-4)** 🟡

**Goal:** Ensure data integrity, algorithm reproducibility, anomaly detection.

### 2.1 Evidence Chain of Custody

**Database:**
```sql
CREATE TABLE evidence_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id uuid REFERENCES political_promises(id),
  action_id uuid REFERENCES parliamentary_actions(id),

  -- Content hash (SHA-256)
  content_hash varchar(64) NOT NULL,
  content_snapshot jsonb NOT NULL, -- Original data

  -- Source verification
  source_url varchar(1000) NOT NULL,
  source_fetched_at timestamptz NOT NULL,
  source_http_status integer,
  source_content_type varchar(100),

  -- Archive backup
  archive_org_url varchar(1000),
  archive_org_snapshot_date date,

  -- Verification
  verified_by varchar(50) CHECK (verified_by IN ('ai', 'human', 'automated')),
  verified_at timestamptz NOT NULL,

  -- Integrity
  tamper_check_last_run timestamptz,
  integrity_status varchar(50) DEFAULT 'verified' CHECK (integrity_status IN (
    'verified',
    'integrity_warning',
    'tampered',
    'unavailable'
  ))
);

-- Function to verify evidence hasn't changed
CREATE FUNCTION verify_evidence_integrity(evidence_id uuid)
RETURNS boolean AS $$
DECLARE
  current_hash varchar(64);
  stored_hash varchar(64);
BEGIN
  -- Re-fetch source and compare hash
  -- Implementation details...
  RETURN current_hash = stored_hash;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Algorithm Version Control

**Database:**
```sql
CREATE TABLE algorithm_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version varchar(50) NOT NULL UNIQUE, -- e.g., "1.2.0"
  algorithm_name varchar(100) NOT NULL,

  -- Formula
  formula_description text NOT NULL,
  formula_code text NOT NULL, -- Actual TypeScript/SQL code

  -- Weights and parameters
  parameters jsonb NOT NULL,
  -- Example: {
  --   "promise_kept_weight": 100,
  --   "promise_broken_weight": 0,
  --   "promise_partial_weight": 50,
  --   "min_promises_threshold": 5
  -- }

  -- Metadata
  effective_from timestamptz NOT NULL,
  effective_until timestamptz,
  is_current boolean DEFAULT true,

  change_reason text,
  changed_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),

  created_at timestamptz DEFAULT now()
);

-- Link scores to algorithm versions
ALTER TABLE consistency_scores
ADD COLUMN algorithm_version_id uuid REFERENCES algorithm_versions(id);

COMMENT ON TABLE algorithm_versions IS 'Version control for all scoring algorithms - ensures reproducibility';
```

**Reproducibility Function:**
```typescript
// /src/lib/audit/score-reproducer.ts
export async function reproduceHistoricalScore(
  politicianId: string,
  date: Date
): Promise<{
  reproducedScore: number,
  algorithmVersion: string,
  dataSnapshot: any,
  matchesRecorded: boolean
}> {
  // 1. Get algorithm version active at that date
  // 2. Get data state at that date
  // 3. Re-run calculation with historical algorithm
  // 4. Compare to recorded score
  // 5. Flag discrepancies
}
```

### 2.3 Data Freshness Monitoring

**Database:**
```sql
CREATE TABLE data_freshness_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type varchar(50) CHECK (data_type IN (
    'promises',
    'parliamentary_actions',
    'attendance_records',
    'vigie_verifications'
  )),

  politician_id uuid REFERENCES politicians(id),

  -- Freshness metrics
  most_recent_data_date timestamptz,
  data_age_days integer GENERATED ALWAYS AS (
    EXTRACT(day FROM now() - most_recent_data_date)
  ) STORED,

  -- Thresholds
  max_age_warning_days integer DEFAULT 30,
  max_age_critical_days integer DEFAULT 90,

  status varchar(50) GENERATED ALWAYS AS (
    CASE
      WHEN data_age_days <= max_age_warning_days THEN 'fresh'
      WHEN data_age_days <= max_age_critical_days THEN 'stale_warning'
      ELSE 'stale_critical'
    END
  ) STORED,

  last_checked_at timestamptz DEFAULT now(),
  next_check_due timestamptz
);

-- Alert function
CREATE FUNCTION check_data_freshness_alerts()
RETURNS TABLE(politician_name varchar, data_type varchar, days_old integer) AS $$
  SELECT p.name, dfc.data_type, dfc.data_age_days
  FROM data_freshness_checks dfc
  JOIN politicians p ON dfc.politician_id = p.id
  WHERE dfc.status = 'stale_critical'
  ORDER BY dfc.data_age_days DESC;
$$ LANGUAGE sql;
```

### 2.4 Anomaly Detection

**Database:**
```sql
CREATE TABLE anomaly_detection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type varchar(50) CHECK (anomaly_type IN (
    'score_volatility',       -- Score changing too rapidly
    'data_spike',             -- Unusual data volume
    'source_inconsistency',   -- Sources contradicting each other
    'gaming_attempt',         -- Suspicious patterns
    'calculation_mismatch',   -- Score doesn't match formula
    'outlier_value'           -- Value outside normal range
  )),

  entity_type varchar(50),  -- 'politician', 'promise', 'action'
  entity_id uuid,

  -- Detection details
  detected_value numeric,
  expected_range_min numeric,
  expected_range_max numeric,
  severity varchar(50) CHECK (severity IN ('info', 'warning', 'critical')),

  explanation text,

  -- Review
  reviewed boolean DEFAULT false,
  review_outcome varchar(50),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,

  detected_at timestamptz DEFAULT now()
);

-- Automated anomaly detection function
CREATE FUNCTION detect_score_anomalies() RETURNS void AS $$
BEGIN
  -- Check for rapid score changes (>20 points in 7 days)
  INSERT INTO anomaly_detection_log (
    anomaly_type, entity_type, entity_id,
    detected_value, explanation, severity
  )
  SELECT
    'score_volatility',
    'politician',
    p.id,
    ABS(p.ai_score - (
      SELECT ai_score FROM politicians_history
      WHERE politician_id = p.id
      AND created_at >= now() - interval '7 days'
      ORDER BY created_at ASC LIMIT 1
    )),
    format('Score changed by %s points in 7 days', ABS(change)),
    CASE
      WHEN ABS(change) > 30 THEN 'critical'
      WHEN ABS(change) > 20 THEN 'warning'
      ELSE 'info'
    END
  FROM politicians p
  WHERE [score changed > threshold];
END;
$$ LANGUAGE plpgsql;
```

---

## **PHASE 3: QUALITY & TRUST (Weeks 5-6)** 🟢

**Goal:** Maximize data quality, source reliability, cross-validation.

### 3.1 Source Reliability Scoring

**Database:**
```sql
CREATE TABLE source_reliability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url_domain varchar(500) NOT NULL UNIQUE,

  -- Reliability metrics
  reliability_score numeric(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1),
  verification_success_rate numeric(3,2),
  fact_check_accuracy numeric(3,2),

  -- Classification
  source_type varchar(50) CHECK (source_type IN (
    'government_official',   -- 1.0 reliability
    'fact_checker',          -- 0.9-1.0
    'mainstream_media',      -- 0.7-0.9
    'social_media',          -- 0.3-0.7
    'blog_opinion',          -- 0.1-0.5
    'unknown'                -- 0.5 default
  )),

  -- Track record
  total_citations integer DEFAULT 0,
  successful_verifications integer DEFAULT 0,
  failed_verifications integer DEFAULT 0,

  -- Manual overrides
  is_blacklisted boolean DEFAULT false,
  is_whitelisted boolean DEFAULT false,
  manual_reliability_override numeric(3,2),

  last_evaluated_at timestamptz,
  evaluation_notes text
);

-- Whitelist official sources
INSERT INTO source_reliability (source_url_domain, source_type, reliability_score, is_whitelisted)
VALUES
  ('assemblee-nationale.fr', 'government_official', 1.0, true),
  ('senat.fr', 'government_official', 1.0, true),
  ('legifrance.gouv.fr', 'government_official', 1.0, true),
  ('vigiedumensonge.fr', 'fact_checker', 0.95, true),
  ('lemonde.fr', 'mainstream_media', 0.85, false),
  ('franceinfo.fr', 'mainstream_media', 0.85, false);
```

### 3.2 Cross-Validation Between Sources

**Logic:**
```typescript
// /src/lib/audit/cross-validator.ts
export async function crossValidatePromise(promiseId: string): Promise<{
  consistent: boolean,
  sources: SourceVerification[],
  conflicts: Conflict[],
  recommendation: 'accept' | 'reject' | 'needs_review'
}> {
  // Get all verifications for this promise
  const verifications = await getVerifications(promiseId)

  // Group by source type
  const aiVerifications = verifications.filter(v => v.source === 'ai_assisted')
  const vigieVerifications = verifications.filter(v => v.source === 'vigie_community')
  const parliamentaryVerifications = verifications.filter(v => v.source === 'parliamentary_match')

  // Check for consistency
  const aiSaysKept = aiVerifications.some(v => v.match_type === 'kept')
  const vigieSaysKept = vigieVerifications.some(v => v.match_type === 'kept')
  const parliamentSaysKept = parliamentaryVerifications.some(v => v.match_type === 'kept')

  // Conflict detection
  if (aiSaysKept !== vigieSaysKept || aiSaysKept !== parliamentSaysKept) {
    return {
      consistent: false,
      conflicts: detectConflicts(verifications),
      recommendation: 'needs_review'
    }
  }

  return { consistent: true, recommendation: 'accept' }
}
```

### 3.3 Temporal Consistency Monitoring

**Database:**
```sql
CREATE TABLE temporal_consistency_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id uuid REFERENCES politicians(id) NOT NULL,

  -- Score stability metrics
  score_variance_7d numeric,   -- Variance over 7 days
  score_variance_30d numeric,  -- Variance over 30 days
  max_daily_change numeric,    -- Largest single-day change

  -- Flags
  is_volatile boolean GENERATED ALWAYS AS (score_variance_7d > 100) STORED,
  needs_investigation boolean DEFAULT false,

  -- Patterns
  trend varchar(50) CHECK (trend IN ('stable', 'improving', 'declining', 'erratic')),

  calculated_at timestamptz DEFAULT now()
);

-- Calculate temporal consistency
CREATE FUNCTION calculate_temporal_consistency(pol_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO temporal_consistency_checks (politician_id, score_variance_7d, score_variance_30d)
  SELECT
    pol_id,
    VARIANCE(ai_score) OVER (ORDER BY created_at ROWS BETWEEN 7 PRECEDING AND CURRENT ROW),
    VARIANCE(ai_score) OVER (ORDER BY created_at ROWS BETWEEN 30 PRECEDING AND CURRENT ROW)
  FROM politician_score_history
  WHERE politician_id = pol_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 IMPLEMENTATION PRIORITIES

### Week 1-2: Legal Armor (CRITICAL)
1. ✅ Dispute resolution system (migration 017)
2. ✅ Right of reply UI components
3. ✅ Dispute submission API
4. ✅ Independent audit tracking

### Week 3-4: Technical Robustness
5. ✅ Evidence chain of custody (migration 018)
6. ✅ Algorithm version control (migration 019)
7. ✅ Data freshness monitoring
8. ✅ Anomaly detection system

### Week 5-6: Quality & Trust
9. ✅ Source reliability scoring
10. ✅ Cross-validation logic
11. ✅ Temporal consistency monitoring

---

## 📈 SUCCESS METRICS

**Legal Defensibility:**
- ✅ 100% of disputes responded to within 14 days (French law)
- ✅ 0 successful legal challenges
- ✅ Droit de réponse available on all politician pages

**Technical Robustness:**
- ✅ 100% evidence integrity (no tampered data)
- ✅ 100% score reproducibility (historical scores can be recalculated)
- ✅ <5% anomaly rate
- ✅ <30 day data freshness for all politicians

**Quality & Trust:**
- ✅ >0.8 average source reliability score
- ✅ <10% cross-validation conflicts
- ✅ <20% score volatility (7-day variance)

---

## 🚨 RED FLAGS TO MONITOR

1. **Legal Red Flags:**
   - Dispute response time >14 days
   - Politician claiming "I never said that" with no clear rebuttal
   - Character judgments instead of factual descriptions

2. **Technical Red Flags:**
   - Score can't be reproduced with historical algorithm
   - Evidence integrity check fails
   - >30 day stale data for active politician

3. **Quality Red Flags:**
   - Sources contradicting each other
   - Score changing >30 points in 7 days without explanation
   - Reliance on low-reliability sources (<0.5)

---

## 📋 AUDIT CHECKLIST (Pre-Launch)

- [ ] Dispute resolution system deployed
- [ ] Droit de réponse UI live on all politician pages
- [ ] Evidence chain of custody for all existing promises
- [ ] Algorithm version 1.0.0 documented and stored
- [ ] Data freshness monitoring active
- [ ] Anomaly detection running daily
- [ ] Source reliability database populated
- [ ] Cross-validation running on all new verifications
- [ ] Independent audit process documented
- [ ] Legal review completed
- [ ] Penetration testing completed
- [ ] Load testing completed (1000 concurrent users)

---

## 📞 ESCALATION PROCEDURES

**Level 1 - Routine Issues:**
- Stale data warnings → Automated alert
- Low-confidence verifications → Flag for human review

**Level 2 - Serious Issues:**
- Dispute filed → Notify admin within 1 hour
- Evidence integrity failure → Immediate investigation
- Anomaly detected → Review within 24 hours

**Level 3 - Critical Issues:**
- Legal threat received → Notify legal counsel immediately
- Security breach → Activate incident response plan
- Algorithm manipulation detected → Freeze system, investigate

---

## 🎓 CONTINUOUS IMPROVEMENT

**Quarterly Reviews:**
- Algorithm performance analysis
- Source reliability re-evaluation
- Dispute resolution effectiveness
- User trust surveys

**Annual Audits:**
- Independent third-party audit
- Full system security audit
- Legal compliance review
- Data quality audit

---

**Next Steps:**
1. Review this document with team
2. Prioritize Phase 1 (Legal Armor)
3. Create detailed implementation tasks
4. Begin migration development

**Questions to Answer:**
- Who will handle dispute reviews? (Admin role?)
- What's the escalation process for sensitive disputes?
- Do we need legal counsel on retainer?
- Budget for independent audits?
