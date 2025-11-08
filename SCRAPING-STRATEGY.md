# Comprehensive Scraping Strategy - Promise Tracker System
**Date**: November 8, 2024
**Objective**: Build a legally defensible, meticulous data collection system for tracking politician promises vs. actions

---

## Core Principles

1. **Everything must be verifiable** - Every data point links to official source
2. **Zero subjective judgments** - Count actions, don't interpret them
3. **Respect rate limits** - No aggressive scraping; stay within ToS
4. **Graceful failure handling** - Log errors, retry intelligently, never crash
5. **Audit trail for everything** - Track when/how/why each piece of data was collected

---

## Data Sources & Scraping Strategies

### 1. Assemblée Nationale (National Assembly)
**API**: https://data.assemblee-nationale.fr/
**What we scrape**: Votes, bills, amendments, attendance, debates

#### Implementation Status
✅ **DONE** - Basic scraper implemented in `src/lib/scrapers/assemblee-nationale-client.ts`

#### NosDéputés.fr API Strategy
- **Endpoint**: `https://www.nosdeputes.fr/deputes/enmandat/json`
- **Rate limit**: No official limit, use 1 request/second to be respectful
- **Data structure**:
  ```json
  {
    "deputes": [
      {
        "depute": {
          "nom": "string",
          "slug": "string",
          "votes": [...],
          "interventions": [...],
          "questions_orales": [...]
        }
      }
    ]
  }
  ```

#### Scraping Schedule
- **Deputies list**: Once per day (5:00 AM CET)
- **Vote updates**: Every 6 hours (after parliamentary sessions)
- **Activity updates**: Daily at midnight

#### Error Handling
```typescript
- Network timeout: Retry 3x with exponential backoff (1s, 2s, 4s)
- 404 Not Found: Log and skip (deputy may have resigned)
- 429 Rate Limit: Back off 60 seconds, then retry
- 500 Server Error: Log, alert admin, retry in 1 hour
```

---

### 2. Sénat (French Senate)
**API**: https://data.senat.fr/
**What we scrape**: Senator votes, bills, attendance

#### Implementation Status
⏳ **TODO** - Not yet implemented

#### Strategy
- **Endpoint**: `https://www.nossenateurs.fr/senateurs/enmandat/json` (similar to NosDéputés)
- **Rate limit**: 1 request/second
- **Data fields needed**:
  - Senator name, party, constituency
  - Voting record with bill references
  - Attendance statistics
  - Sponsored bills and amendments

#### Implementation Priority
- **Week 2** - After Assemblée Nationale scraper is battle-tested

#### Scraping Schedule
- **Senator list**: Daily at 5:30 AM CET
- **Vote updates**: Every 6 hours
- **Activity updates**: Daily at 12:30 AM CET

---

### 3. data.gouv.fr (French Open Data Portal)
**Portal**: https://www.data.gouv.fr/
**What we scrape**: Official government datasets

#### Relevant Datasets
1. **Elected Officials**: https://www.data.gouv.fr/datasets/elus-locaux/
   - Local mayors, regional councilors
   - Updated quarterly by Ministry of Interior

2. **Government Protocol**: https://www.data.gouv.fr/datasets/protocole-du-gouvernement/
   - Official government commitments
   - Ministerial action plans

#### Implementation Status
⏳ **TODO** - Low priority (focus on national politicians first)

#### Strategy
- **Format**: CSV and JSON available
- **Update frequency**: Check for updates weekly
- **Storage**: Download entire dataset, diff with previous version, store only changes

---

### 4. Vigie du Mensonge (Verified Lie Database)
**Website**: https://vigiedumensonge.fr/
**What we scrape**: Verified false statements by politicians

#### Why This Source Matters
- Clément Viktorovitch's team manually verifies every entry
- Each lie is sourced with video evidence and fact-check references
- Legal standard: "sourcé, prouvable, infakable, introllable, inattaquable"
- Complements our promise tracking with verified broken commitments

#### Implementation Status
⏳ **TODO** - High priority

#### Scraping Strategy
**Technical Approach:**
- Website doesn't have public API (as of 2024)
- Need to implement ethical web scraping with:
  - `robots.txt` compliance
  - User-Agent identification: `PolitikCred/1.0 (https://politik-cred.fr; contact@politik-cred.fr)`
  - Respectful rate limiting: 1 page per 5 seconds

**Data Structure to Extract:**
```typescript
interface VigieLie {
  politician: string
  lie_statement: string
  date_stated: string
  context: string
  fact_check_proof: string[]
  video_evidence_url: string
  source_urls: string[]
  category: string // economic, social, foreign_policy, etc.
}
```

**Implementation Steps:**
1. Contact Clément Viktorovitch's team for API access or data partnership
2. If no API: Build scraper with Playwright/Puppeteer
3. Store in `political_promises` table with:
   - `source_type`: 'vigie_du_mensonge'
   - `verification_status`: 'verified' (pre-verified by their team)
   - `is_actionable`: false (these are lies, not promises)

**Alternative: Partnership Approach**
- Email clemovitch team for data sharing agreement
- Offer to credit them prominently on site
- Propose reciprocal data sharing (our parliamentary vote data)

#### Scraping Schedule
- **Initial load**: One-time full scrape
- **Updates**: Weekly check for new entries
- **Verification**: Monthly audit to ensure data alignment

---

### 5. Twitter/X (Political Promises via Social Media)
**API**: https://developer.twitter.com/en/docs/twitter-api
**What we scrape**: Campaign promises, policy commitments

#### Implementation Status
⏳ **TODO** - Medium priority

#### API Limitations (Free Tier)
- **Read limit**: 1,500 tweets/month
- **Write limit**: N/A (we're only reading)
- **Rate limit**: 15 requests per 15 minutes

#### Strategy
**Which Politicians to Track:**
- President, Prime Minister, all Ministers (≈30 accounts)
- Party leaders (≈10 accounts)
- Total: ~40 accounts

**What Tweets to Capture:**
- Tweets containing keywords: "je m'engage", "nous allons", "je promets", "nous ferons"
- Campaign period tweets (6 months before elections)
- Official policy announcements

**Implementation:**
```typescript
// Targeted search query
const query = `from:@politician (je m'engage OR nous allons OR je promets OR nous ferons) -is:retweet`

// Process tweets
- Extract promise text
- Store with tweet URL as source
- Mark extraction_method: 'social_media'
- Set confidence_score based on keyword match strength
```

#### Scraping Schedule
- **Per politician**: 2-3 requests/day (within free tier budget)
- **Rotation**: Cycle through 40 accounts = need 13 days for full rotation
- **Priority**: Focus on politicians with upcoming votes/deadlines

#### Legal Compliance
- All tweets are public information
- We store only text and URL (not republishing copyrighted content)
- Attribution: Link back to original tweet

---

### 6. Campaign Websites (One-Time Promise Scraping)
**What we scrape**: Official campaign platforms, manifestos

#### Implementation Status
⏳ **TODO** - Medium priority

#### Strategy
**Target Sites:**
- Presidential campaign sites (archived versions via archive.org)
- Party manifestos (En Marche, Les Républicains, PS, LFI, RN, etc.)
- Ministerial commitment letters (Lettres de mission)

**Scraping Approach:**
1. **Archive.org Wayback Machine**:
   - Capture campaign sites from election periods
   - Example: Macron 2017 campaign, 2022 campaign

2. **PDF Manifesto Parsing**:
   - Download official party manifestos (usually PDF)
   - Use OCR if needed (Tesseract.js)
   - Extract text, identify promise sentences

3. **Promise Identification**:
   - Keyword matching: "nous proposons", "nous nous engageons", "objectif"
   - Section headers: "Nos propositions", "Programme"
   - Numbered lists of commitments

**Implementation:**
```typescript
interface CampaignPromise {
  politician: string
  promise_text: string
  source_url: string // campaign site URL
  source_type: 'campaign_site'
  document_title: string // "Programme 2022", "Manifesto"
  page_number?: number // for PDF sources
  extraction_date: string
}
```

#### Scraping Schedule
- **One-time per election cycle**: After each election
- **Updates**: Only when new manifestos published
- **Priority**: Focus on elected officials first

---

## Promise Extraction Pipeline

### Step 1: Raw Text Collection
**Sources**: Social media, campaign sites, news articles, Vigie du Mensonge

### Step 2: Promise Classification (AI)
**Tool**: Hugging Face Inference API (free tier: 30K requests/month)

**Model**: `camembert-base` fine-tuned for promise detection

**Classification Logic:**
```python
def is_promise(text: str) -> tuple[bool, float]:
    # Keywords indicating promise
    promise_keywords = [
        "je m'engage", "nous allons", "nous ferons",
        "objectif", "nous proposons", "promesse"
    ]

    # Anti-patterns (not promises)
    non_promise_patterns = [
        "si", "peut-être", "envisager", "réfléchir"
    ]

    # Use camembert for semantic classification
    confidence = model.predict(text)

    return (confidence > 0.7, confidence)
```

### Step 3: Promise Categorization
**Categories**: Economic, Social, Environmental, Security, Healthcare, Education, Justice, Immigration, Foreign Policy

**Tool**: `sentence-transformers` (paraphrase-multilingual-MiniLM-L12-v2)

**Approach**:
```typescript
// Pre-defined category embeddings
const categories = {
  economic: "politique économique emploi fiscalité entreprise",
  social: "famille retraite protection sociale",
  environmental: "climat écologie transition énergétique",
  // ... etc
}

// Compute similarity between promise and categories
const category = findMostSimilar(promiseEmbedding, categoryEmbeddings)
```

### Step 4: Actionability Check
**Question**: Can this promise be verified through parliamentary actions?

**Examples:**
- ✅ Actionable: "Nous voterons contre cette loi" → Can check vote record
- ✅ Actionable: "Nous proposerons une loi sur..." → Can check bill sponsorship
- ❌ Not actionable: "Nous ferons mieux" → Too vague
- ❌ Not actionable: "J'écouterai les Français" → Not measurable

**Implementation:**
```typescript
function isActionable(promise: string): boolean {
  const actionablePatterns = [
    /voter\s+(pour|contre)/i,
    /proposer\s+une\s+loi/i,
    /augmenter|diminuer|supprimer/i,
    /créer|mettre en place/i
  ]

  return actionablePatterns.some(pattern => pattern.test(promise))
}
```

---

## Parliamentary Action Matching Engine

### Semantic Similarity Algorithm

**Goal**: Match promises to parliamentary votes/bills with high confidence

**Tech Stack**:
- `sentence-transformers` (paraphrase-multilingual-MiniLM-L12-v2)
- Runs locally on CPU, no API costs
- 384-dimensional embeddings

**Algorithm:**
```typescript
async function matchPromiseToAction(
  promise: PoliticalPromise,
  actions: ParliamentaryAction[]
): Promise<Match[]> {
  // 1. Compute promise embedding
  const promiseEmbedding = await getEmbedding(promise.promise_text)

  // 2. Compute action embeddings (cached)
  const actionEmbeddings = await Promise.all(
    actions.map(a => getEmbedding(a.description))
  )

  // 3. Calculate cosine similarities
  const similarities = actionEmbeddings.map((ae, idx) => ({
    action: actions[idx],
    similarity: cosineSimilarity(promiseEmbedding, ae)
  }))

  // 4. Filter by confidence threshold
  const highConfidence = similarities.filter(s => s.similarity > 0.85)
  const mediumConfidence = similarities.filter(s => s.similarity >= 0.6 && s.similarity <= 0.85)

  return {
    high: highConfidence, // Auto-match
    medium: mediumConfidence // Manual review queue
  }
}
```

### Matching Rules

**Exact Match (confidence: 1.0)**
- Promise: "Je voterai contre la réforme des retraites"
- Action: Vote record shows "contre" on "Réforme des retraites"
- Method: String matching on bill title + vote position

**Semantic Match (confidence: 0.85-0.95)**
- Promise: "Nous nous opposons à l'augmentation de l'âge de départ"
- Action: Vote "contre" on bill about "âge légal de départ à la retraite"
- Method: Embedding similarity + keyword overlap

**Contradiction Match (confidence: 0.7-0.85)**
- Promise: "Nous défendrons les services publics"
- Action: Vote "pour" on "Réduction des effectifs de la fonction publique"
- Method: Semantic contradiction detection

---

## Data Quality Assurance

### Validation Pipeline

**Stage 1: Source Validation**
```typescript
interface SourceValidation {
  is_official: boolean // From .gouv.fr or official API
  is_archived: boolean // Snapshot saved (archive.org)
  is_accessible: boolean // URL still works
  last_verified: Date
}
```

**Stage 2: Data Completeness**
```typescript
interface DataQuality {
  has_source_url: boolean
  has_timestamp: boolean
  has_politician_id: boolean
  has_category: boolean
  completeness_score: number // 0-100
}
```

**Stage 3: Duplicate Detection**
```typescript
async function isDuplicate(newPromise: Promise): Promise<boolean> {
  // Check exact text match
  const exactMatch = await db.query(
    'SELECT id FROM political_promises WHERE promise_text = $1',
    [newPromise.promise_text]
  )

  if (exactMatch.length > 0) return true

  // Check semantic similarity (>0.95 = likely duplicate)
  const existing = await getAllPromises(newPromise.politician_id)
  const similarities = await computeSimilarities(newPromise, existing)

  return similarities.some(s => s > 0.95)
}
```

---

## Error Handling & Retry Strategy

### Network Errors
```typescript
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        timeout: 30000, // 30 seconds
        headers: {
          'User-Agent': 'PolitikCred/1.0 (https://politik-cred.fr)'
        }
      })

      if (response.ok) return response

      // Handle specific HTTP errors
      if (response.status === 429) {
        await sleep(60000) // Rate limited: wait 1 minute
        continue
      }

      if (response.status >= 500) {
        await sleep(Math.pow(2, attempt) * 1000) // Exponential backoff
        continue
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)

    } catch (error) {
      if (attempt === maxRetries) throw error

      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
}
```

### Data Parsing Errors
```typescript
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('JSON parse error:', error)
    logError({
      type: 'parse_error',
      content: text.substring(0, 200),
      error: error.message
    })
    return fallback
  }
}
```

### Scraping Failures
```typescript
async function handleScrapingFailure(
  job: CollectionJob,
  error: Error
): Promise<void> {
  // Log to database
  await db.query(`
    UPDATE data_collection_jobs
    SET status = 'failed',
        error_message = $1,
        completed_at = NOW()
    WHERE id = $2
  `, [error.message, job.id])

  // Alert admin if critical
  if (job.job_type.includes('assemblee') || job.job_type.includes('senat')) {
    await sendAlert({
      severity: 'high',
      message: `Critical scraper failed: ${job.job_type}`,
      error: error.message
    })
  }

  // Schedule retry for non-critical jobs
  if (job.retry_count < 3) {
    await scheduleRetry(job, job.retry_count + 1)
  }
}
```

---

## Rate Limiting & Politeness

### Global Rate Limiter
```typescript
class RateLimiter {
  private limits: Map<string, { count: number; resetAt: Date }>

  async checkLimit(source: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = new Date()
    const limit = this.limits.get(source)

    if (!limit || now > limit.resetAt) {
      this.limits.set(source, {
        count: 1,
        resetAt: new Date(now.getTime() + windowMs)
      })
      return true
    }

    if (limit.count >= maxRequests) {
      return false // Rate limit exceeded
    }

    limit.count++
    return true
  }
}

// Usage
const limiter = new RateLimiter()

await limiter.checkLimit('nosdeputes.fr', 60, 60000) // 60 req/minute
await limiter.checkLimit('twitter.com', 15, 900000) // 15 req/15min
```

### Respectful Scraping Headers
```typescript
const headers = {
  'User-Agent': 'PolitikCred/1.0 (+https://politik-cred.fr; contact@politik-cred.fr)',
  'Accept': 'application/json',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Cache-Control': 'no-cache'
}
```

---

## Monitoring & Alerting

### Health Checks
```typescript
interface ScraperHealth {
  source: string
  last_successful_run: Date
  success_rate_24h: number
  avg_response_time: number
  status: 'healthy' | 'degraded' | 'down'
}

async function checkScraperHealth(): Promise<ScraperHealth[]> {
  const sources = ['assemblee', 'senat', 'twitter', 'vigie']

  return Promise.all(sources.map(async source => {
    const jobs = await getRecentJobs(source, 24) // Last 24 hours
    const successful = jobs.filter(j => j.status === 'completed')

    return {
      source,
      last_successful_run: successful[0]?.completed_at || null,
      success_rate_24h: (successful.length / jobs.length) * 100,
      avg_response_time: average(jobs.map(j => j.duration_seconds)),
      status: successful.length > 0 ? 'healthy' : 'down'
    }
  }))
}
```

### Alert Conditions
1. **Critical**: Any scraper fails 3 times in a row → Email admin immediately
2. **Warning**: Success rate drops below 80% in 24h → Email daily digest
3. **Info**: New data sources added → Log to dashboard

---

## Legal Compliance Checklist

- [x] **robots.txt compliance** - Check before scraping any site
- [x] **Terms of Service** - Review ToS for NosDéputés, Twitter, data.gouv.fr
- [x] **Attribution** - Link back to original sources on every data point
- [x] **Data retention** - Delete data if source requests removal (GDPR)
- [x] **Rate limiting** - Never exceed published API limits
- [x] **User-Agent identification** - Always identify ourselves in requests
- [ ] **Partnership agreements** - Reach out to Vigie du Mensonge for formal data sharing

---

## Implementation Timeline

### Week 1: Foundation
- ✅ Database schema (DONE)
- ✅ Assemblée Nationale scraper (DONE)
- ⏳ Sénat scraper
- ⏳ Job orchestration system

### Week 2: Promise Extraction
- ⏳ Twitter scraper
- ⏳ Campaign website scraper
- ⏳ Vigie du Mensonge integration
- ⏳ Promise classification AI

### Week 3: Matching Engine
- ⏳ Semantic similarity implementation
- ⏳ Promise-to-action matching
- ⏳ Manual review queue UI

### Week 4: Quality & Testing
- ⏳ End-to-end data pipeline testing
- ⏳ Error handling verification
- ⏳ Performance optimization
- ⏳ Legal compliance audit

---

## Success Criteria

1. **Data Coverage**: 100% of National Assembly deputies + 50% of Senators
2. **Update Frequency**: Parliamentary data < 24 hours old
3. **Match Accuracy**: >90% precision on high-confidence promise matches
4. **Zero Downtime**: Scrapers recover automatically from failures
5. **Legal Safety**: Every data point has verifiable source link

---

**This is a living document. Update as we implement each component and discover edge cases.**
