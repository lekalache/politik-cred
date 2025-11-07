# Politik Cred' Implementation Roadmap - 8 November 2024

## The Core Problem We're Solving

Community voting gets gamed by activists. Paid AI costs money. Free AI isn't reliable enough for fact-checking.

**The Solution**: Stop trying to fact-check opinions. Start tracking verifiable behavior.

Politicians generate their own evidence trail every day through parliamentary votes, attendance records, and public statements. We don't need to judge credibility—we need to measure **consistency between promises and actions**. This is objective, verifiable, and automatable without bias.

---

## System Architecture: Promise Tracker

### The Three-Layer Stack

#### Layer 1: Data Collection (Zero Cost)
Scrape official sources:
- **Assemblée Nationale API** (free, public) - all votes, debates, bill text
- **Sénat data** (free, public) - legislative activity JSON exports
- **data.gouv.fr** - official French open data portal with parliamentary records
- **Politician social media** - Twitter/X API free tier (1,500 tweets/month)
- **Campaign websites** - one-time scrape per election cycle for promises
- **World News API** - existing integration for contextual articles

Store everything with timestamps and source links. Every claim must be traceable.

#### Layer 2: Free AI Processing
- **Hugging Face Inference API** free tier (30,000 requests/month) for promise extraction
- **sentence-transformers** (paraphrase-multilingual-MiniLM) for semantic matching - runs locally on CPU, costs nothing
- **camembert-base** (free, French, runs locally) for promise classification
- **Rule-based matching** for objective facts: voted yes/no, attended/absent, sponsored bill

No LLM needed for binary data. AI only for promise extraction and semantic similarity.

#### Layer 3: Consistency Engine
Build a scoring algorithm based on measurable gaps:
- Promise vs vote alignment (did they vote how they said they would?)
- Attendance rate vs public statements about engagement
- Bill sponsorship vs campaign priorities

Each score component links directly to evidence—source URL for promise, official vote record link, timestamps for both.

---

## Database Schema Changes

### New Tables to Add

#### 1. `political_promises`
```sql
CREATE TABLE political_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id uuid REFERENCES politicians(id),
  promise_text text NOT NULL,
  promise_date timestamptz NOT NULL,
  category varchar NOT NULL, -- economic, social, environmental, security, etc.
  source_url varchar NOT NULL,
  source_type varchar NOT NULL, -- campaign_site, interview, social_media, debate
  extraction_method varchar NOT NULL, -- manual, ai_extracted, scraped
  confidence_score numeric(3,2), -- 0.00-1.00 for AI extractions
  verification_status varchar DEFAULT 'pending', -- pending, actionable, non_actionable, verified
  is_actionable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. `parliamentary_actions`
```sql
CREATE TABLE parliamentary_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id uuid REFERENCES politicians(id),
  action_type varchar NOT NULL, -- vote, bill_sponsor, amendment, attendance, debate
  action_date timestamptz NOT NULL,
  session_id varchar, -- official session reference
  description text NOT NULL,
  vote_position varchar, -- pour, contre, abstention, absent (for votes)
  bill_id varchar, -- official bill reference
  official_reference varchar NOT NULL, -- link to official record
  category varchar, -- matches promise categories
  metadata jsonb, -- additional data (debate duration, amendment text, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3. `promise_verifications`
```sql
CREATE TABLE promise_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id uuid REFERENCES political_promises(id),
  action_id uuid REFERENCES parliamentary_actions(id),
  match_type varchar NOT NULL, -- kept, broken, partial, pending
  match_confidence numeric(3,2) NOT NULL, -- 0.00-1.00
  verification_method varchar NOT NULL, -- exact_match, semantic_match, manual_review
  evidence_urls text[], -- array of supporting evidence links
  explanation text, -- why this action matches/breaks the promise
  verified_by uuid REFERENCES users(id), -- null for automatic, user_id for manual
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 4. `consistency_scores`
```sql
CREATE TABLE consistency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id uuid REFERENCES politicians(id) UNIQUE,
  overall_score numeric(5,2) NOT NULL, -- 0.00-100.00
  promises_kept integer DEFAULT 0,
  promises_broken integer DEFAULT 0,
  promises_partial integer DEFAULT 0,
  promises_pending integer DEFAULT 0,
  attendance_rate numeric(5,2), -- 0.00-100.00
  legislative_activity_score numeric(5,2), -- bills sponsored, amendments, etc.
  last_calculated_at timestamptz DEFAULT now(),
  calculation_period_start timestamptz,
  calculation_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 5. `data_collection_jobs`
```sql
CREATE TABLE data_collection_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type varchar NOT NULL, -- assemblee_votes, senat_votes, twitter_scrape, promise_extraction
  status varchar DEFAULT 'running', -- running, completed, failed
  source varchar NOT NULL, -- API endpoint or source name
  records_collected integer DEFAULT 0,
  records_new integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  metadata jsonb -- job-specific data
);
```

---

## The Scoring Formula (Pure Math)

### Overall Consistency Score
```
consistency = (matched_promises / total_actionable_promises) × 100
```

### Attendance Score
```
attendance = (sessions_attended / sessions_scheduled) × 100
```

### Legislative Activity Score
Based on objective counts:
- Bills sponsored
- Amendments proposed
- Debate participation
- Committee memberships

### Time Weighting
Recent activity counts more:
- Last 6 months: 2× weight
- Last year: 1.5× weight
- Older: 1× weight

### Minimum Evidence Threshold
Every score component must have >= 3 verifiable sources or it doesn't count.

---

## MVP Priority Stack

### Phase 1: Database Foundation (Week 1)
1. Create migration files for new tables
2. Implement proper RLS policies with role-based access
3. Add indexes for performance
4. Set up audit logging for all data changes

### Phase 2: Data Collectors (Week 2)
1. Build Assemblée Nationale API scraper
   - Votes collector
   - Attendance collector
   - Bill sponsorship collector
2. Build Sénat API scraper
3. Build Twitter/X promise extractor
4. Set up daily cron jobs for automatic collection

### Phase 3: Local AI Processing (Week 3)
1. Deploy Hugging Face transformers locally
2. Set up sentence embeddings for promise-vote matching
3. Implement batch processing (nightly runs)
4. Build promise classification system

### Phase 4: Matching Engine (Week 4)
1. Write semantic similarity algorithms
2. Implement auto-matching for high-confidence pairs (>0.85)
3. Build manual review queue for medium matches (0.6-0.85)
4. Calculate weekly consistency scores

### Phase 5: UI Rebuild (Week 5)
1. Replace credibility voting with promise tracking interface
2. Build politician detail pages showing:
   - Promises made
   - Actions taken
   - Consistency score with breakdown
   - Evidence links for everything
3. Create promise explorer (filter by kept/broken/pending)

---

## Infrastructure Stack (Cost-Free)

### Hosting & Deployment
- **Netlify** free tier (already in use)
- **Supabase** free tier (500MB database, 50K monthly active users)

### AI/ML Processing
- **Hugging Face Transformers** (local deployment, no API costs)
- **sentence-transformers** library (runs on CPU)
- **camembert-base** for French NLP (open source)

### Data Sources
- All government APIs are public and free
- Twitter/X API free tier sufficient for limited scraping
- News API already integrated

### Scaling Strategy
Free tier supports up to 10K users easily. When you outgrow it:
- Only paid upgrade needed: Claude API ($20/month) for complex promise extraction
- Everything else can scale on free/cheap infrastructure

---

## Positioning & Messaging

### What to Change

**Old tagline:** "Évaluez la crédibilité de vos représentants"
**New tagline:** "Promesses vs. Actions - La vérité par les chiffres"

**Old concept:** Credibility voting by community
**New concept:** Objective promise tracking through official records

**Old tone:** Street slang mixed with serious claims
**New tone:** Data-driven transparency - let the numbers speak

### Why This Works

- **Defensible**: You're not judging character, you're comparing statements to votes
- **Unbiased**: Activists can't dispute official voting records
- **Transparent**: Politicians can't claim bias when you show their tweets next to their votes
- **Trustworthy**: Users can audit the math themselves

---

## Security Implementation

### Proper RLS Policies

Replace current "anyone authenticated = admin" with real role-based access:

```sql
-- Read access for all authenticated users
CREATE POLICY "Users can read promises" ON political_promises
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update
CREATE POLICY "Admins can manage promises" ON political_promises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );
```

Apply this pattern to all tables.

### API Route Protection

Add middleware to verify roles server-side:

```typescript
// lib/auth-guard.ts
export async function requireAdmin(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    throw new Error('Unauthorized')
  }
}
```

---

## Success Metrics

### Technical
- Data freshness: < 24 hours for all sources
- Match accuracy: > 90% for high-confidence matches
- System uptime: > 99.5%
- Zero cost infrastructure for first 10K users

### Product
- Promise database: > 1000 tracked promises within 3 months
- Politician coverage: All major French politicians (President, PM, ministers, party leaders)
- User trust: Every score traceable to official sources
- Media mentions: System cited as authoritative source for promise tracking

---

## The One Thing That Makes This Work

**Brutal honesty in positioning**: This isn't AI fact-checking. This isn't community moderation. This is cold, hard math applied to public records. The data defends itself.

Politicians make promises. You track them. They vote. You compare. The gap between promise and action is the score. No opinions. No bias. No gaming. Just arithmetic.

Build this instead of what you've documented.
