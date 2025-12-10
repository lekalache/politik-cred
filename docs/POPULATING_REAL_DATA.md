# Populating Real Political Data - Complete Guide

This guide shows you how to populate Politik Cred' with **real French political data** from multiple sources.

---

## 🎯 Quick Start (5 Minutes)

### Prerequisites

1. ✅ Supabase project set up
2. ✅ Environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   WORLD_NEWS_API_KEY=your-news-api-key
   HUGGINGFACE_API_KEY=your-huggingface-key
   ```

3. ✅ All migrations applied (especially 004, 005, 007, 013)
4. ✅ API keys created (`tsx scripts/setup-api-keys.ts`)

### Run Complete Population

```bash
# Populate everything
tsx scripts/populate-all-data.ts

# Or with options
tsx scripts/populate-all-data.ts --limit=20  # Only 20 politicians
tsx scripts/populate-all-data.ts --skip-vigie  # Skip Vigie import
```

---

## 📊 Data Sources

### 1. **Assemblée Nationale (NosDéputés.fr)** ✅ Automated

**What it provides:**
- ✅ 577 current French deputies
- ✅ Party affiliations
- ✅ Constituencies
- ✅ Voting records
- ✅ Bill sponsorships
- ✅ Attendance data

**How to populate:**
```bash
# Via populate script (Phase 1)
tsx scripts/populate-all-data.ts

# Or via API endpoint
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/data-collection \
  -H "Authorization: Bearer sk_live_your_premium_key" \
  -H "Content-Type: application/json" \
  -d '{"type":"incremental","limit":100}'
```

**Expected data:**
- 577 politicians inserted
- Each with party, position, bio
- External ID for tracking updates

---

### 2. **Vigie du Mensonge** ⚠️  Manual (For Now)

**What it provides:**
- ✅ Community-verified political promises
- ✅ Fact-checking with vote counts
- ✅ Promise verification status (kept/broken/misleading)
- ✅ Multi-source verification

**Current Status:**
- Schema: ✅ Ready (Migration 007)
- Badge Component: ✅ Ready (`src/components/promises/vigie-badge.tsx`)
- Homepage Attribution: ✅ Complete
- API Scraper: ⚠️  Needs implementation

**How to populate (Manual Method):**

#### Step 1: Visit Vigie du Mensonge
```
https://www.vigiedumensonge.fr
```

#### Step 2: Find Promises
- Search by politician name
- Note the promise ID from URL (e.g., `/promesse/12345`)
- Copy promise text and verification status

#### Step 3: Import via Script
```bash
tsx scripts/import-vigie-promise.ts
```

Or manually via SQL/Supabase:
```sql
-- Insert promise
INSERT INTO political_promises (
  politician_id,
  promise_text,
  promise_date,
  source_platform,
  external_id,
  external_url,
  category,
  verification_status,
  source_url
) VALUES (
  '<politician-uuid>',
  'Promise text from Vigie',
  '2024-01-15',
  'vigie_du_mensonge',
  'vigie_12345',
  'https://www.vigiedumensonge.fr/promesse/12345',
  'social',
  'broken',
  'https://www.vigiedumensonge.fr/promesse/12345'
);

-- Add community verification
INSERT INTO promise_verifications (
  promise_id,
  verification_source,
  community_votes_count,
  community_confidence,
  verification_status,
  notes
) VALUES (
  '<promise-uuid>',
  'vigie_community',
  512,
  0.89,
  'broken',
  'Verified by Vigie community with high confidence'
);
```

#### Step 4: Verify Import
```sql
-- Check promises with Vigie source
SELECT
  pp.promise_text,
  pp.external_url,
  pv.community_votes_count,
  pv.community_confidence
FROM political_promises pp
LEFT JOIN promise_verifications pv ON pp.id = pv.promise_id
WHERE pp.source_platform = 'vigie_du_mensonge';
```

**Automated Scraper (Future):**

To automate Vigie import:
1. Contact Vigie team for API access or permission to scrape
2. Implement scraper in `src/lib/scrapers/vigie-client.ts` (foundation already exists)
3. Use `external_id` for deduplication
4. Run batch import script

---

### 3. **News Articles** ✅ Automated

**What it provides:**
- ✅ Recent political promises from news
- ✅ Real-time promise extraction
- ✅ Source URLs with validation
- ✅ AI-powered classification

**How to populate:**

#### Method 1: Admin Panel (Easiest)
1. Go to `/admin` → Actualités tab
2. Click "Actualiser maintenant"
3. Wait for collection to complete
4. Promises will be automatically extracted

#### Method 2: Script
```bash
# Collect news and extract promises
tsx scripts/collect-from-news.ts

# Or via npm
npm run collect:news
```

#### Method 3: API Endpoint
```bash
# Collect news
curl -X POST http://localhost:3000/api/news/collect \
  -H "Content-Type: application/json" \
  -d '{"searchText":"politique française","limit":50}'

# Extract promises
curl -X POST http://localhost:3000/api/promises/extract \
  -H "Content-Type: application/json" \
  -d '{
    "politicianId":"<uuid>",
    "text":"Article text here...",
    "sourceUrl":"https://article-url.com"
  }'
```

**Expected data:**
- 50-100 promises from recent news
- Each linked to source article
- Categorized by topic
- Confidence scores

---

### 4. **Parliamentary Actions** ✅ Automated

**What it provides:**
- ✅ Voting records
- ✅ Bill sponsorships
- ✅ Parliamentary questions
- ✅ Committee memberships

**How to populate:**
```bash
# Via API endpoint (recommended for orchestrator)
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/data-collection \
  -H "Authorization: Bearer sk_live_your_premium_key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "incremental",
    "limit": 100,
    "forceRefresh": false
  }'

# Types available:
# - "full": Complete data collection for all deputies
# - "incremental": Only recent updates
# - "deputies": Just deputy information
# - "senators": Senator data (if available)
```

---

## 🚀 Complete Population Workflow

### Phase 1: Base Politicians (5 minutes)

```bash
# Populate 577 French deputies
tsx scripts/populate-all-data.ts
```

**Expected:**
- ✅ 577 politicians inserted
- ✅ With party, position, constituency
- ✅ External IDs from NosDéputés

### Phase 2: Parliamentary Data (10-15 minutes)

Use your **orchestrator with Premium API key**:

```python
# In your orchestrator
import requests

API_KEY = "sk_live_your_premium_key"
BASE_URL = "https://politik-cred.netlify.app"

# Trigger data collection
response = requests.post(
    f"{BASE_URL}/api/v1/public/triggers/data-collection",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"type": "incremental", "limit": 100}
)
```

**Expected:**
- ✅ Voting records for recent bills
- ✅ Attendance data
- ✅ Bill sponsorships

### Phase 3: Vigie du Mensonge (Manual - 30 minutes)

Manually import 10-20 high-profile promises:

1. Visit https://www.vigiedumensonge.fr
2. Search for major politicians:
   - Emmanuel Macron
   - Marine Le Pen
   - Jean-Luc Mélenchon
   - Jordan Bardella
   - Gabriel Attal
3. For each promise found:
   - Note the promise ID
   - Copy promise text
   - Note verification status
4. Import using SQL or demo script

**Recommended starter set:**
- 5 promises per major politician
- Mix of kept/broken/pending
- From recent campaigns (2022-2024)

### Phase 4: News Promises (5 minutes)

```bash
# Collect recent news
# Via admin panel: /admin → Actualités → "Actualiser"

# Or via script
tsx scripts/collect-from-news.ts
```

**Expected:**
- ✅ 50-100 recent promises
- ✅ From news articles
- ✅ With source URLs

### Phase 5: Semantic Matching (5 minutes per politician)

Use orchestrator or API:

```bash
# For each politician
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/match-promises \
  -H "Authorization: Bearer sk_live_your_premium_key" \
  -H "Content-Type: application/json" \
  -d '{"politicianId":"<uuid>","minConfidence":0.6}'
```

**Expected:**
- ✅ Promises matched to parliamentary actions
- ✅ 71% similarity detection accuracy
- ✅ Auto-verification for high confidence (>0.85)

### Phase 6: Score Calculation (1 minute per politician)

```bash
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/calculate-scores \
  -H "Authorization: Bearer sk_live_your_premium_key" \
  -H "Content-Type: application/json" \
  -d '{"politicianId":"<uuid>"}'
```

**Expected:**
- ✅ Overall consistency score
- ✅ Promises kept/broken/partial counts
- ✅ Attendance metrics

---

## 🤖 Automated Population via Orchestrator

### Complete Audit (Recommended)

Use the `triggerPoliticianAudit` endpoint to do everything at once:

```python
# In your orchestrator
response = requests.post(
    f"{BASE_URL}/api/v1/public/triggers/politician-audit",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "politicianId": politician_id,
        "includeNewsSearch": True,
        "timeframe": "month",
        "minConfidence": 0.6,
        "generateReport": True
    }
)

# This runs:
# 1. News search for the politician
# 2. Promise extraction from articles
# 3. Semantic matching to parliamentary actions
# 4. Score calculation
# 5. Report generation
```

**Expected duration:** 30-60 seconds per politician

---

## 📊 Verification & Quality Checks

### Check Total Records

```sql
-- Politicians
SELECT COUNT(*) FROM politicians;
-- Expected: 577 (all French deputies)

-- Parliamentary actions
SELECT COUNT(*) FROM parliamentary_actions;
-- Expected: 1000+ votes/bills

-- Promises
SELECT COUNT(*) FROM political_promises;
-- Expected: 200-500 depending on collection

-- Verifications
SELECT COUNT(*) FROM promise_verifications;
-- Expected: 100-300 matches

-- Consistency scores
SELECT COUNT(*) FROM consistency_scores;
-- Expected: 50-100 calculated politicians
```

### Check Data Quality

```sql
-- Promises by source
SELECT source_platform, COUNT(*)
FROM political_promises
GROUP BY source_platform;

-- Expected distribution:
-- vigie_du_mensonge: 10-50 (manual import)
-- politik_cred: 100-400 (news extraction)
-- assemblee_nationale: 0 (not used for promises)

-- Verifications by type
SELECT verification_source, COUNT(*)
FROM promise_verifications
GROUP BY verification_source;

-- Top politicians by promise count
SELECT p.name, COUNT(pp.id) as promise_count
FROM politicians p
LEFT JOIN political_promises pp ON p.id = pp.politician_id
GROUP BY p.name
ORDER BY promise_count DESC
LIMIT 10;
```

### Check Vigie Integration

```sql
-- Promises from Vigie
SELECT
  pp.promise_text,
  pp.external_url,
  pv.community_votes_count,
  pv.community_confidence,
  pv.verification_status
FROM political_promises pp
LEFT JOIN promise_verifications pv ON pp.id = pv.promise_id
WHERE pp.source_platform = 'vigie_du_mensonge';
```

---

## 🛠️ Troubleshooting

### "No deputies fetched"
**Problem:** NosDéputés.fr API not responding
**Solution:**
- Check internet connection
- Verify API endpoint: https://www.nosdeputes.fr/deputes/enmandat/json
- Try again later (rate limiting)

### "Duplicate politician"
**Problem:** Politician already exists
**Solution:** This is normal - script updates existing records

### "No news articles found"
**Problem:** News database is empty
**Solution:**
1. Go to `/admin` → Actualités
2. Click "Actualiser maintenant"
3. Wait for collection
4. Re-run promise extraction

### "Vigie import fails"
**Problem:** Schema not ready
**Solution:**
```bash
# Apply migration 007
npm run migration-007
# Or manually run the SQL in Supabase
```

### "Semantic matching timeout"
**Problem:** Hugging Face API slow or unavailable
**Solution:**
- Check HUGGINGFACE_API_KEY in .env.local
- Fallback to Jaccard similarity (automatic)
- Try again later

---

## 📈 Expected Final State

After complete population:

```
✅ Politicians: 577 French deputies
✅ Parliamentary Actions: 1,000+ votes/bills
✅ Vigie Promises: 10-50 (manual import)
✅ News Promises: 100-400 (automated extraction)
✅ Verifications: 100-300 matches
✅ Consistency Scores: 50-100 calculated
```

### Sample Politician Profile

**Emmanuel Macron**
- Promises: 25-40 (from news + Vigie)
- Parliamentary Actions: 50+ (votes, bills)
- Verifications: 15-25 matches
- Consistency Score: 45-75
- Vigie Verifications: 5-10

---

## 🔄 Ongoing Maintenance

### Weekly Tasks
```bash
# 1. Collect new news articles
tsx scripts/collect-from-news.ts

# 2. Run for 5-10 most active politicians
for politician_id in ${ACTIVE_POLITICIANS[@]}; do
  curl -X POST .../politician-audit \
    -d "{\"politicianId\":\"$politician_id\"}"
done
```

### Monthly Tasks
- Update politician list (new deputies)
- Re-sync Vigie du Mensonge data
- Validate URL health
- Recalculate all scores

---

## 💡 Pro Tips

1. **Start Small**: Populate 10-20 politicians first, verify everything works, then scale

2. **Use Orchestrator**: Let the AI orchestrator handle API calls automatically

3. **Vigie is Gold**: Manually importing 5-10 Vigie promises per major politician gives instant credibility

4. **News is Fresh**: News-based promises are timely and relevant

5. **Batch Processing**: Process politicians in batches of 10-20 for better monitoring

---

## 📞 Support

If you need help:
1. Check error logs in `/api/v1/public/triggers/*` responses
2. Verify API keys with `tsx scripts/verify-api-key.ts`
3. Check Supabase logs for database errors
4. Review migration status in Supabase

---

## 🎯 Next Steps

Once data is populated:

1. **Visit the app**: See promises on `/promises` page
2. **Check admin panel**: `/admin` for moderation
3. **View individual politicians**: `/politicians/[id]`
4. **Run audits**: Use orchestrator to audit politicians automatically
5. **Monitor quality**: Review verification confidence scores

Your Politik Cred' platform is now populated with **real French political data**! 🇫🇷
