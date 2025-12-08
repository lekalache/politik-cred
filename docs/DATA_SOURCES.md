# Political Promise Data Sources

This document explains all available sources for collecting **real political promise data** for Politik Cred'.

---

## 🎯 Available Data Sources

### 1. **Your News Articles** ✅ (Best Quality)
Extract promises from news articles you're already collecting via World News API.

**Advantages:**
- ✅ Already integrated (you have the data!)
- ✅ Real-time/recent promises
- ✅ High quality journalism
- ✅ Automatically links to politicians

**How to use:**
```bash
npm run collect:news
```

**Configuration:**
```bash
# In .env.local or as environment variables
NEWS_ARTICLE_LIMIT=100  # Number of articles to process
SINCE_DATE=2024-01-01   # Only process articles since this date
```

**What it does:**
1. Fetches your latest news articles from database
2. Identifies which politician is mentioned
3. Extracts promises using AI classifier
4. Validates source URLs
5. Stores promises with politician linkage

**Example output:**
```
🗞️  Promise Collection from News Articles
============================================================

📰 Processing: "Macron annonce 10 milliards pour la santé"
   Politician: Emmanuel Macron
   URL: https://www.lemonde.fr/article/...
   ✅ URL validated: valid (HTTP 200)
   ✓ Promises found: 3
   ✓ Promises stored: 3

============================================================
📊 Collection Summary
============================================================
Total articles processed:       47
Articles with promises:         23
Total promises found:           67
Total promises stored:          65
```

---

### 2. **Wikipedia** ✅ (Structured & Historical)
Extract promises from Wikipedia pages about French politicians and campaigns.

**Advantages:**
- ✅ Free & open access
- ✅ Structured data
- ✅ Historical campaign information
- ✅ Multi-source verified
- ✅ Available in French (fr.wikipedia.org)

**How to use:**
```bash
# Collect from all default politicians
npm run collect:wikipedia

# Collect for specific politician
npm run collect:wikipedia "Emmanuel Macron"
```

**What it does:**
1. Searches French Wikipedia for politician-related pages
2. Fetches campaign, manifesto, and biography pages
3. Extracts promises using AI classifier
4. Validates Wikipedia URLs (always valid)
5. Stores with context

**Wikipedia pages it processes:**
- `Élection présidentielle française de 2022`
- `Élection présidentielle française de 2027`
- `Programme d'Emmanuel Macron`
- `Programme de Marine Le Pen`
- `La France insoumise` (party pages)
- `Rassemblement national`
- And politician-specific biography pages

**Example output:**
```
📚 Promise Collection from Wikipedia
============================================================

   📖 Processing: Élection présidentielle française de 2022
      Found 12 promises
      ✅ Stored 12 promises

   📖 Processing: Programme d'Emmanuel Macron
      Found 8 promises
      ✅ Stored 8 promises

============================================================
📊 Collection Summary
============================================================
Politicians processed:          13
Wikipedia pages processed:      47
Total promises found:           156
Total promises stored:          152
```

---

### 3. **Official Government Sources** ✅ (Most Authoritative)

#### **Vie Publique (vie-publique.fr)**
Official French government information portal.

**What it contains:**
- Presidential speeches
- Government announcements
- Policy documents
- Parliamentary debates

**Status:** URLs included in `collect-promises.ts`, content needs to be manually provided or scraped.

#### **Élysée (elysee.fr)**
Official French presidency website.

**What it contains:**
- Presidential speeches
- Press conferences
- Official statements

**Status:** URLs included in `collect-promises.ts`.

#### **Gouvernement.fr**
Official French government website.

**What it contains:**
- Minister announcements
- Policy proposals
- Government programs

**Status:** URLs included in `collect-promises.ts`.

---

## 📊 Comparison Table

| Source | Quality | Quantity | Real-time | Cost | Setup |
|--------|---------|----------|-----------|------|-------|
| **News API** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐⭐ Medium | ✅ Yes | Free* | ✅ Already done |
| **Wikipedia** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ High | ❌ No | Free | ✅ Just added |
| **Government Sites** | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐ Low | ✅ Yes | Free | ⚠️ Needs scraping |

*Free within API limits

---

## 🚀 Quick Start Guide

### Step 1: Apply Migration 010 (URL Health Tracking)
```sql
-- In Supabase SQL Editor
-- Copy and paste: supabase/migrations/010_url_health_tracking.sql
```

### Step 2: Verify Politicians Are Seeded
```bash
npm run seed-politicians
```

### Step 3: Collect from Your News Articles (Recommended First!)
```bash
npm run collect:news
```

This will process your existing news articles and extract promises.

### Step 4: Collect from Wikipedia (Historical Data)
```bash
npm run collect:wikipedia
```

This will scrape Wikipedia for historical campaign promises.

### Step 5: View Results
```bash
# In Supabase or admin dashboard
SELECT COUNT(*) FROM political_promises;
SELECT politician_id, COUNT(*) FROM political_promises GROUP BY politician_id;
```

Or go to `/admin` → "Promesses" tab to view all collected promises.

---

## 📝 Data Quality Guidelines

### **High Quality Promises** ✅
```
✅ "Je m'engage à créer 500 000 emplois d'ici 2027"
   - Clear commitment phrase ("Je m'engage")
   - Specific number (500 000)
   - Specific timeframe (d'ici 2027)
   - Verifiable

✅ "Nous allons augmenter le budget de la santé de 20%"
   - Strong indicator ("Nous allons")
   - Specific percentage (20%)
   - Measurable
```

### **Low Quality Promises** ❌
```
❌ "J'aimerais améliorer la situation"
   - Conditional ("j'aimerais")
   - Vague ("améliorer")
   - Not measurable

❌ "Peut-être que nous devrons réfléchir à..."
   - Uncertain ("peut-être")
   - No commitment
```

---

## 🔧 Advanced Configuration

### Collect from Specific News Categories
```typescript
// Modify src/lib/scrapers/news-promise-extractor.ts

// Only process political news
.eq('category', 'politics')

// Only high-relevance articles
.gte('relevance_score', 0.7)
```

### Filter by Politician
```bash
# Process only Macron's articles
npm run collect:news "Emmanuel Macron"
```

### Custom Date Range
```bash
SINCE_DATE=2024-06-01 npm run collect:news
```

---

## 🎯 Recommended Collection Strategy

### **Phase 1: Immediate (Week 1)**
1. ✅ Collect from **News Articles** (most recent, high quality)
   ```bash
   npm run collect:news
   ```
   **Expected:** 50-100 promises from recent news

### **Phase 2: Historical (Week 2)**
2. ✅ Collect from **Wikipedia** (campaigns 2022, 2024, 2027)
   ```bash
   npm run collect:wikipedia
   ```
   **Expected:** 100-200 promises from campaign pages

### **Phase 3: Ongoing (Weekly)**
3. ✅ Re-run **News collection** weekly for new promises
   ```bash
   # Every Monday
   SINCE_DATE=$(date -d '7 days ago' +%Y-%m-%d) npm run collect:news
   ```

---

## 📦 Other Potential Sources

### **Vigie du mensonge** (vigiedumensonge.fr)
Community fact-checking platform for French politicians.

**Status:** Schema support added (migration 007), needs integration.

**Pros:**
- Community-verified promises
- Historical tracking
- Multiple sources per promise

**Next steps:** Create scraper for their API/data.

### **Assemblée Nationale API** (NosDéputés.fr)
Official parliamentary data.

**Status:** Client exists (`assemblee-nationale-client.ts`).

**Pros:**
- Official government data
- Voting records
- Bill sponsorships

**Use case:** Match promises to actual votes (verification phase).

### **Party Manifestos (PDF/Web)**
- Renaissance (avecvous.fr)
- Rassemblement National (rassemblementnational.fr)
- La France Insoumise (lafranceinsoumise.fr)
- Les Républicains (republicains.fr)
- Parti Socialiste (parti-socialiste.fr)

**Status:** URLs exist, need web scraping.

---

## 🛠️ Troubleshooting

### "No news articles found"
**Problem:** News database is empty.
**Solution:** Run news collection first:
```bash
# In admin dashboard: /admin → Actualités → "Actualiser maintenant"
```

### "Politician not found"
**Problem:** Politicians not seeded in database.
**Solution:**
```bash
npm run seed-politicians
```

### "Wikipedia rate limit"
**Problem:** Too many requests to Wikipedia.
**Solution:** Scripts have 1-2 second delays. If still hitting limits, increase delay in `wikipedia-promise-scraper.ts`.

### "URL validation timeout"
**Problem:** Some URLs take too long to validate.
**Solution:** These will be marked as `timeout` status and can be retried later via admin dashboard.

---

## 📊 Expected Results

After running all collectors:

```sql
-- Check total promises
SELECT COUNT(*) FROM political_promises;
-- Expected: 150-400 promises

-- By source
SELECT source_type, COUNT(*)
FROM political_promises
GROUP BY source_type;
-- Expected:
--   social_media (news): 50-100
--   manifesto (wikipedia): 100-200
--   campaign_site: 20-50

-- By politician
SELECT p.name, COUNT(pp.id) as promise_count
FROM politicians p
LEFT JOIN political_promises pp ON p.id = pp.politician_id
GROUP BY p.name
ORDER BY promise_count DESC
LIMIT 10;
```

---

## 🔄 Maintenance

### Weekly Tasks
1. Collect new promises from news
2. Validate existing URL health (admin dashboard)
3. Review and verify new promises

### Monthly Tasks
1. Re-run Wikipedia collection for new pages
2. Update politician list if needed
3. Check for broken URLs and fix

---

## 💡 Pro Tips

1. **Start with News**: Your news articles are the best source - they're recent and high quality.

2. **Wikipedia for History**: Use Wikipedia to backfill historical campaign promises from 2022 elections.

3. **Validate URLs**: Always check the URL health tab in admin dashboard after collection.

4. **Manual Review**: Review high-confidence promises (>0.8) first for verification.

5. **Rate Limiting**: All scrapers have built-in rate limiting to respect source servers.

---

## 📞 Need More Sources?

Create an issue with:
- Source URL
- Type of data available
- Access method (API, scraping, etc.)

We can create a custom collector for it!
