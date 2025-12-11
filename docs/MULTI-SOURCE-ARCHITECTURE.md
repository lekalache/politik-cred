# Multi-Source Promise Verification Architecture

## Vision
Transform from binary promise tracking to **Core Values DNA profiling** through multi-source verification.

## Database Schema

### 1. Enhanced Promises Table

```sql
-- Add to existing political_promises table
ALTER TABLE political_promises ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE political_promises ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0;
ALTER TABLE political_promises ADD COLUMN IF NOT EXISTS authenticity_flags JSONB DEFAULT '{}';

-- Value categories
CREATE TYPE value_category AS ENUM (
  'economy',
  'environment',
  'social_justice',
  'security',
  'immigration',
  'health',
  'education',
  'foreign_policy',
  'other'
);

ALTER TABLE political_promises
  ALTER COLUMN category TYPE value_category USING category::value_category;
```

### 2. Promise Sources Table (Multi-Source Verification)

```sql
CREATE TABLE promise_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID REFERENCES political_promises(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL, -- 'vigie', 'les_decodeurs', 'afp_factuel', 'official'
  source_url TEXT NOT NULL,
  source_name TEXT,

  -- Verification details
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credibility_weight NUMERIC DEFAULT 1.0, -- Based on source reputation

  -- What this source says
  status_claimed TEXT, -- 'kept', 'broken', 'partial', 'pending'
  evidence_text TEXT,
  confidence NUMERIC, -- This source's confidence in their claim

  -- Metadata
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(promise_id, source_type, source_url)
);

CREATE INDEX idx_promise_sources_promise ON promise_sources(promise_id);
CREATE INDEX idx_promise_sources_type ON promise_sources(source_type);
```

### 3. Core Value Profiles Table

```sql
CREATE TABLE core_value_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,

  -- Per-category metrics (JSONB for flexibility)
  value_metrics JSONB NOT NULL DEFAULT '{}',
  -- Structure:
  -- {
  --   "economy": {
  --     "promise_count": 24,
  --     "kept_count": 17,
  --     "broken_count": 5,
  --     "partial_count": 2,
  --     "consistency_score": 71,
  --     "attention_score": 30, // % of total promises
  --     "priority_rank": 1
  --   },
  --   "environment": { ... }
  -- }

  -- Overall authenticity metrics
  authenticity_score NUMERIC, -- Do actions match declared priorities?
  greenwashing_flags JSONB DEFAULT '[]', -- Detected greenwashing patterns

  -- Behavioral insights
  priority_shifts JSONB DEFAULT '[]', -- Historical priority changes
  behavioral_patterns TEXT[],

  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_quality_score NUMERIC,

  UNIQUE(politician_id)
);

CREATE INDEX idx_core_value_profiles_politician ON core_value_profiles(politician_id);
```

### 4. Source Reputation Table

```sql
CREATE TABLE source_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT UNIQUE NOT NULL,

  -- Reputation metrics
  accuracy_rate NUMERIC DEFAULT 0.5, -- How often they're correct (when cross-checked)
  credibility_weight NUMERIC DEFAULT 1.0, -- Weight in consensus calculations
  total_claims INTEGER DEFAULT 0,
  verified_claims INTEGER DEFAULT 0,
  disputed_claims INTEGER DEFAULT 0,

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial reputation scores
INSERT INTO source_reputation (source_type, accuracy_rate, credibility_weight) VALUES
  ('vigie', 0.87, 1.0),
  ('les_decodeurs', 0.94, 1.2),
  ('afp_factuel', 0.96, 1.3),
  ('official', 1.0, 1.5),
  ('community', 0.70, 0.8);
```

## Confidence Calculation

### Multi-Source Consensus
```typescript
function calculatePromiseConfidence(sources: PromiseSource[]): number {
  if (sources.length === 0) return 0
  if (sources.length === 1) return 0.4 // Single source = low confidence

  // Get consensus status
  const statusCounts = sources.reduce((acc, s) => {
    acc[s.status_claimed] = (acc[s.status_claimed] || 0) + s.credibility_weight
    return acc
  }, {})

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const max = Math.max(...Object.values(statusCounts))

  // Consensus strength
  const consensus = max / total

  // Base confidence from source count
  let confidence = 0
  if (sources.length === 1) confidence = 0.4
  if (sources.length === 2) confidence = 0.7
  if (sources.length >= 3) confidence = 0.9

  // Adjust by consensus strength
  confidence *= consensus

  // Boost if official source agrees
  if (sources.some(s => s.source_type === 'official')) {
    confidence = Math.min(confidence * 1.2, 1.0)
  }

  return confidence
}
```

### Greenwashing Detection
```typescript
function detectGreenwashing(profile: CoreValueProfile): string[] {
  const flags: string[] = []

  // Check each category
  for (const [category, metrics] of Object.entries(profile.value_metrics)) {
    const talkRatio = metrics.attention_score // How much they talk about it
    const actionRatio = metrics.consistency_score // How much they deliver

    // High talk, low action = greenwashing
    if (talkRatio >= 20 && actionRatio <= 30) {
      flags.push(`greenwashing_${category}`)
    }

    // Priority claim mismatch
    if (metrics.priority_rank <= 3 && actionRatio < 40) {
      flags.push(`priority_mismatch_${category}`)
    }
  }

  return flags
}
```

### Authenticity Score
```typescript
function calculateAuthenticity(profile: CoreValueProfile): number {
  let totalMismatch = 0
  let categoriesChecked = 0

  for (const metrics of Object.values(profile.value_metrics)) {
    if (metrics.promise_count < 3) continue // Skip low-data categories

    const talkRatio = metrics.attention_score
    const actionRatio = metrics.consistency_score

    // Mismatch = |talk - action|
    const mismatch = Math.abs(talkRatio - actionRatio)
    totalMismatch += mismatch
    categoriesChecked++
  }

  if (categoriesChecked === 0) return 0

  const avgMismatch = totalMismatch / categoriesChecked

  // Convert to 0-100 score (lower mismatch = higher authenticity)
  return Math.max(0, 100 - avgMismatch)
}
```

## Data Flow

```
1. COLLECTION
   └─> Vigie du Mensonge scraper
   └─> Les Décodeurs API
   └─> AFP Factuel integration
   └─> Official documents parser

2. VERIFICATION
   └─> Store in promise_sources table
   └─> Calculate confidence via multi-source consensus
   └─> Flag conflicts for manual review

3. CATEGORIZATION
   └─> AI categorizes promise by value (economy, environment, etc.)
   └─> Multiple sources can suggest categories
   └─> Use consensus for final category

4. SCORING
   └─> Calculate per-category consistency
   └─> Build core value profile
   └─> Detect greenwashing patterns
   └─> Calculate authenticity score

5. DISPLAY
   └─> Political DNA profile
   └─> Category radar charts
   └─> Priority vs. Action matrix
   └─> Comparative insights
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Design schema
- [ ] Create migration scripts
- [ ] Add RLS policies
- [ ] Update TypeScript types

### Phase 2: First Source Integration (Week 2)
- [ ] Build Vigie du Mensonge scraper
- [ ] Import existing promises
- [ ] Test multi-source structure
- [ ] Validate confidence calculations

### Phase 3: Category System (Week 3)
- [ ] AI categorization of promises
- [ ] Per-category scoring logic
- [ ] Core value profile calculation
- [ ] Greenwashing detection

### Phase 4: UI & Insights (Week 4)
- [ ] Political DNA display component
- [ ] Category radar charts
- [ ] Priority vs. Action matrix
- [ ] Comparison tools

### Phase 5: Additional Sources (Ongoing)
- [ ] Les Décodeurs integration
- [ ] AFP Factuel integration
- [ ] Official documents parser
- [ ] Source reputation tracking

## Success Metrics

- **Coverage**: 50+ politicians with multi-source data
- **Confidence**: Average confidence score > 75%
- **Categories**: 90%+ promises correctly categorized
- **Insights**: Detect greenwashing in 10+ politicians
- **User Engagement**: 3x increase in profile page views
