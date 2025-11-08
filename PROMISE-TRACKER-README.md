# Promise Tracker System - Implementation Guide

**Status**: ✅ Phase 1 Complete - Ready for Testing
**Date**: November 8, 2024
**Branch**: `claude/promise-tracker-implementation-011CUuLsYNQMwAQC9ZA87Cjc`

---

## What We Built

A legally defensible, mathematically-driven promise tracking system that replaces subjective community voting with objective promise-action matching.

### Core Philosophy

**Before**: "Credibility score 45/200" (subjective, gameable, legally risky)
**After**: "Promises kept: 4/10" (objective, auditable, legally safe)

---

## System Components

### 1. Database Schema (`004_promise_tracker_system.sql`)

Five new tables with proper RLS policies:

- **`political_promises`** - Promises extracted from various sources
- **`parliamentary_actions`** - Official votes, bills, attendance
- **`promise_verifications`** - Matches between promises and actions
- **`consistency_scores`** - Calculated metrics for each politician
- **`data_collection_jobs`** - Job tracking for scrapers

**Key Features**:
- Real role-based RLS (checks `users.role`, not just `auth.uid()`)
- Comprehensive indexes for performance
- Helper functions for score calculation
- Full audit trail

### 2. Data Collectors

#### Assemblée Nationale Scraper (`assemblee-nationale-client.ts`)
- Scrapes NosDéputés.fr API for all deputies
- Collects votes, attendance, bills, debates
- Rate-limited (1 req/second)
- Job tracking with error handling

#### Data Collection Orchestrator (`data-collection-orchestrator.ts`)
- Coordinates multi-source scraping
- Implements exponential backoff on failures
- Tracks collection jobs in database
- Supports partial updates

### 3. Promise Extraction System

#### Promise Classifier (`promise-classifier.ts`)
- Identifies promises in text using keyword matching
- Categorizes into policy domains (economic, social, environmental, etc.)
- Checks actionability (can promise be verified?)
- Extracts keywords for categorization

**Promise Indicators**:
- Strong: "je m'engage", "nous allons", "je promets"
- Medium: "il faut", "nous devons", "je veux"
- Anti-patterns: "si", "peut-être", "envisager" (filtered out)

#### Semantic Matcher (`semantic-matcher.ts`)
- Matches promises to parliamentary actions
- Uses Jaccard similarity (placeholder for sentence-transformers)
- Detects contradictions (promised "vote pour", actually "vote contre")
- Generates human-readable explanations

**Match Types**:
- **Kept**: Action aligns with promise (similarity > 0.7)
- **Broken**: No matching action found
- **Partial**: Some alignment (similarity 0.5-0.7)
- **Contradictory**: Action directly opposes promise

#### Consistency Calculator (`consistency-calculator.ts`)
- Calculates objective scores from verified matches
- Formula: `(kept * 100 + partial * 50) / total_promises`
- Computes attendance rate from vote records
- Assesses data quality (how complete is our data?)

### 4. API Routes

#### `/api/promises/extract` (POST)
Extracts promises from text and stores in database.

**Request**:
```json
{
  "politicianId": "uuid",
  "text": "Je m'engage à voter contre cette réforme",
  "sourceUrl": "https://twitter.com/politician/status/123",
  "sourceType": "social_media",
  "date": "2024-01-01T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "extracted": 3,
  "stored": 3,
  "promises": [...]
}
```

#### `/api/promises/match` (POST)
Matches promises to parliamentary actions.

**Request**:
```json
{
  "politicianId": "uuid",
  "minConfidence": 0.6
}
```

**Response**:
```json
{
  "success": true,
  "autoMatched": 5,
  "queuedForReview": 3,
  "summary": {
    "promisesProcessed": 10,
    "actionsChecked": 150,
    "highConfidenceMatches": 5,
    "mediumConfidenceMatches": 3
  }
}
```

#### `/api/promises/calculate-scores` (POST)
Calculates consistency scores for politicians.

**Request**:
```json
{
  "all": true
}
```

**Response**:
```json
{
  "success": true,
  "updated": 42,
  "failed": 0,
  "duration": 12
}
```

#### `/api/data-collection/collect` (POST)
Triggers data collection from government sources.

**Request**:
```json
{
  "type": "full",
  "limit": 50
}
```

---

## Data Sources

### ✅ Implemented

1. **Assemblée Nationale** (NosDéputés.fr API)
   - 577 deputies
   - Votes, attendance, bills, debates
   - Updated: Every 6 hours

2. **Promise Extraction** (keyword-based)
   - Campaign sites
   - Social media
   - News articles

### ⏳ Planned

3. **Sénat** (NosSénateurs.fr API)
   - 348 senators
   - Same data as Assemblée

4. **Vigie du Mensonge** (https://vigiedumensonge.fr/)
   - Verified political lies
   - Pre-vetted by Clément Viktorovitch's team
   - Sourced, provable, unattackable

5. **Twitter/X** (API free tier)
   - 1,500 tweets/month
   - Track ~40 major politicians
   - Extract promises from campaign tweets

6. **Campaign Websites** (one-time scrapes)
   - Presidential manifestos
   - Party platforms
   - Ministerial commitment letters

---

## Legal Defensibility

### What Makes This Safe

1. **Objective Data Only**
   - We count actions, we don't judge character
   - "Promises kept: 4/10" vs "Crédibilité: 40/100"
   - Every data point links to official source

2. **Public Record**
   - All data from government APIs
   - Parliamentary votes are public information
   - We aggregate, we don't create content

3. **No Community Voting**
   - Removed user-submitted "votes"
   - Eliminated activist gaming vector
   - Reduced legal exposure (host vs editor)

4. **Attribution Everywhere**
   - Every promise has source URL
   - Every action links to official record
   - Users can verify math themselves

### Legally Risky vs Safe

❌ **RISKY**: "Politician X is a liar" (defamation)
✅ **SAFE**: "Politician X kept 4/10 promises" (fact)

❌ **RISKY**: "Crédibilité: 35/100" (subjective judgment)
✅ **SAFE**: "Consistency score: 35% based on verified promise-action matches" (math)

❌ **RISKY**: Community votes (gameable, biased)
✅ **SAFE**: Official parliamentary records (government data)

---

## Usage Examples

### Extract Promises from Tweet

```bash
curl -X POST https://politik-cred.fr/api/promises/extract \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "politicianId": "abc123",
    "text": "Je m'\''engage à voter contre cette réforme des retraites injuste",
    "sourceUrl": "https://twitter.com/politician/status/123456",
    "sourceType": "social_media",
    "date": "2024-01-15T10:30:00Z"
  }'
```

### Match Promises to Actions

```bash
curl -X POST https://politik-cred.fr/api/promises/match \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "politicianId": "abc123",
    "minConfidence": 0.6
  }'
```

### Calculate Scores

```bash
curl -X POST https://politik-cred.fr/api/promises/calculate-scores \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "all": true
  }'
```

### Trigger Data Collection

```bash
curl -X POST https://politik-cred.fr/api/data-collection/collect \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deputies",
    "limit": 100
  }'
```

---

## Testing the System

### 1. Run Database Migration

```bash
# Apply migration
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/004_promise_tracker_system.sql
```

### 2. Collect Deputy Data

```bash
# Test scraper
curl -X POST http://localhost:3000/api/data-collection/collect \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"type": "deputies"}'
```

### 3. Extract Promises

```bash
# Test promise extraction
curl -X POST http://localhost:3000/api/promises/extract \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "politicianId": "<deputy_id>",
    "text": "Je m'\''engage à défendre les services publics",
    "sourceUrl": "https://example.com",
    "sourceType": "campaign_site"
  }'
```

### 4. Match Promises to Actions

```bash
# Test matching
curl -X POST http://localhost:3000/api/promises/match \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"politicianId": "<deputy_id>"}'
```

### 5. Calculate Consistency Score

```bash
# Test score calculation
curl -X POST http://localhost:3000/api/promises/calculate-scores \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"politicianId": "<deputy_id>"}'
```

---

## Next Steps (Phase 2)

### Week 2: Additional Data Sources

- [ ] Implement Sénat scraper (similar to Assemblée)
- [ ] Build Twitter scraper with free tier limits
- [ ] Contact Vigie du Mensonge team for data partnership
- [ ] Scrape campaign websites via Archive.org

### Week 3: Real Semantic Matching

Current implementation uses Jaccard similarity (placeholder).

**Production options**:

1. **Python Microservice** (recommended)
   ```python
   from sentence_transformers import SentenceTransformer
   model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
   embeddings = model.encode([promise, action])
   similarity = cosine_similarity(embeddings[0], embeddings[1])
   ```

2. **Hugging Face API** (30K requests/month free)
   ```typescript
   const embeddings = await fetch('https://api-inference.huggingface.co/models/sentence-transformers/...')
   ```

### Week 4: UI Rebuild

- [ ] Replace "credibility voting" interface
- [ ] Build politician detail pages with:
  - Promises made (with sources)
  - Actions taken (with official links)
  - Consistency breakdown
  - Timeline visualization
- [ ] Create promise explorer (filter by kept/broken/pending)

---

## Performance Considerations

### Database Indexes

All critical queries are indexed:
- `political_promises(politician_id, verification_status)`
- `parliamentary_actions(politician_id, action_date)`
- `promise_verifications(promise_id, match_confidence)`

### Caching Strategy

1. **Promise embeddings**: Cache after first computation
2. **Consistency scores**: Recalculate weekly, cache results
3. **Parliamentary data**: Update every 6 hours, serve from cache

### Rate Limiting

- NosDéputés: 1 req/second
- Twitter: 15 req/15 minutes
- Vigie du Mensonge: 1 req/5 seconds (ethical scraping)

---

## Monitoring & Alerts

### Health Checks

Run daily:
```sql
SELECT
  COUNT(*) as total_promises,
  COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
  COUNT(*) FILTER (WHERE is_actionable = true) as actionable
FROM political_promises;
```

### Alert Conditions

1. **Critical**: Scraper fails 3x in a row → Email admin
2. **Warning**: Data freshness > 48 hours → Daily digest
3. **Info**: New promises extracted → Log to dashboard

---

## Success Criteria

- [x] Database schema with proper RLS policies
- [x] Assemblée Nationale scraper working
- [x] Promise extraction system functional
- [x] Semantic matching implemented (placeholder)
- [x] Consistency score calculator working
- [x] All API routes implemented
- [x] TypeScript compiles without errors
- [ ] Sénat scraper implemented
- [ ] Production semantic matching (sentence-transformers)
- [ ] UI rebuilt with promise tracker interface
- [ ] 100+ promises tracked with matches
- [ ] All scores link to official sources

---

## Files Changed/Added

### New Files
- `supabase/migrations/004_promise_tracker_system.sql` - Database schema
- `SCRAPING-STRATEGY.md` - Detailed scraping plan
- `src/lib/scrapers/assemblee-nationale-client.ts` - Deputy scraper
- `src/lib/scrapers/data-collection-orchestrator.ts` - Job coordinator
- `src/lib/promise-extraction/promise-classifier.ts` - Promise detection
- `src/lib/promise-extraction/semantic-matcher.ts` - Promise-action matching
- `src/lib/promise-extraction/consistency-calculator.ts` - Score calculation
- `src/app/api/promises/extract/route.ts` - Promise extraction API
- `src/app/api/promises/match/route.ts` - Matching API
- `src/app/api/promises/calculate-scores/route.ts` - Score calculation API
- `src/app/api/data-collection/collect/route.ts` - Data collection trigger

### Modified Files
- `8NovRoadmap.md` - Added Vigie du Mensonge integration

---

## Deployment Checklist

- [ ] Run database migration on production
- [ ] Set up environment variables:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORLD_NEWS_API_KEY` (optional)
- [ ] Create admin user with proper role
- [ ] Test API routes with production credentials
- [ ] Schedule daily data collection cron job
- [ ] Set up monitoring and alerts
- [ ] Deploy to Netlify

---

**This system is ready for testing. The foundation is solid, legally defensible, and built on objective data.**
