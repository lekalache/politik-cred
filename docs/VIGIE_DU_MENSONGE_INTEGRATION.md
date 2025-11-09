# Vigie du mensonge Integration Plan

## Overview

**Vigie du mensonge** (https://www.vigiedumensonge.fr) is a collaborative French fact-checking platform that tracks:
- Political lies and false statements
- Broken promises
- Verified fact-checks with sources
- User-contributed evidence

## Why It's Valuable for Politik Cred'

### 1. **Verified Historical Data**
- Already fact-checked promises and lies
- Community-verified sources
- Historical tracking of political statements
- Reduces manual verification work

### 2. **Complementary to Our System**
```
Our System (AI + Parliamentary Data):
├── Automated promise extraction
├── Semantic matching with votes
└── Official government sources

Vigie du mensonge (Human + Community):
├── Manual fact-checking
├── Diverse source verification
└── Community contributions

= Combined Power: AI automation + Human verification
```

### 3. **Data Quality**
- Multiple verification levels
- Source citations
- Temporal tracking (when promised vs when broken)
- Categorized by topic and politician

## Integration Strategies

### Strategy 1: Web Scraping (Immediate)

**Pros:**
- Can start immediately
- Access to all public data
- No API dependency

**Cons:**
- Website structure changes break scraper
- Higher maintenance
- Rate limiting concerns

**Implementation:**
```typescript
// src/lib/scrapers/vigie-scraper.ts
interface VigiePromise {
  politician: string
  statement: string
  date: Date
  status: 'verified_lie' | 'broken_promise' | 'misleading'
  sources: string[]
  category: string
}
```

### Strategy 2: Data Partnership (Long-term)

**Pros:**
- Stable data access
- Potential API
- Collaborative verification

**Cons:**
- Requires partnership negotiation
- May take time to establish

**Action:**
- Contact Vigie du mensonge team
- Propose data sharing agreement
- Mutual benefit: we provide AI matching, they provide verified data

### Strategy 3: User Contribution Bridge (Community)

**Pros:**
- Users can import Vigie data
- Community-driven
- Attribution maintained

**Implementation:**
- Add "Import from Vigie du mensonge" feature
- Users paste Vigie URLs
- We fetch, verify, and attribute

## Data Mapping

### Vigie du mensonge → Politik Cred'

```typescript
Vigie Fields:
├── Politician name → politicians.name (match)
├── Statement → political_promises.promise_text
├── Date → political_promises.promise_date
├── Verification status → promise_verifications.match_type
│   ├── "Mensonge vérifié" → 'broken'
│   ├── "Promesse non tenue" → 'broken'
│   └── "Trompeur" → 'partial'
├── Sources → promise_verifications.evidence_urls
└── Category → political_promises.category
```

## Implementation Phases

### Phase 1: Research & Prototype (1-2 days)
- [ ] Analyze Vigie website structure
- [ ] Build basic scraper
- [ ] Test data extraction
- [ ] Map to our schema

### Phase 2: Data Integration (2-3 days)
- [ ] Create Vigie import script
- [ ] Handle politician name matching
- [ ] Deduplicate with existing promises
- [ ] Add attribution to sources

### Phase 3: UI Integration (1-2 days)
- [ ] Add "Verified by Vigie du mensonge" badge
- [ ] Link to original Vigie sources
- [ ] Display community verification count

### Phase 4: Automation (Ongoing)
- [ ] Scheduled scraping
- [ ] Conflict resolution (AI vs Human verification)
- [ ] Update tracking

## Database Schema Updates

### Add Vigie Attribution

```sql
-- Add source_platform to political_promises
ALTER TABLE political_promises
ADD COLUMN source_platform varchar(50) DEFAULT 'politik_cred';
-- 'politik_cred', 'vigie_du_mensonge', 'assemblee_nationale'

-- Add external_id for deduplication
ALTER TABLE political_promises
ADD COLUMN external_id varchar(200);
-- Store Vigie URL or ID

-- Add verification_source
ALTER TABLE promise_verifications
ADD COLUMN verification_source varchar(50) DEFAULT 'ai_assisted';
-- 'ai_assisted', 'vigie_community', 'manual_review'
```

## Example Use Cases

### Use Case 1: Promise Enrichment
```typescript
// User searches for "Macron retraites"
// Our system shows:
// 1. Our AI-extracted promises from speeches
// 2. Vigie-verified broken promises
// 3. Parliamentary voting record
// = Complete picture with multiple verification sources
```

### Use Case 2: Credibility Scoring
```typescript
Credibility Score = (
  AI matching score * 0.4 +
  Parliamentary action score * 0.4 +
  Vigie community verification * 0.2
)
```

### Use Case 3: Source Diversity
```typescript
Promise Card displays:
├── 📄 Original source (campaign website)
├── 🔍 Vigie du mensonge verification (if available)
├── 🏛️ Parliamentary action (if matched)
└── 🤖 Our AI confidence score
```

## Technical Considerations

### 1. Attribution & Legal
- Must clearly attribute Vigie data
- Link to original Vigie page
- Respect their licensing
- Credit community contributors

### 2. Data Quality
- Cross-reference with our AI system
- Flag conflicts (AI says kept, Vigie says broken)
- Allow moderators to review conflicts
- Display multiple viewpoints

### 3. Performance
- Cache Vigie data locally
- Refresh periodically (daily/weekly)
- Don't scrape too frequently
- Use respectful rate limiting

## Sample Scraper Implementation

```typescript
// src/lib/scrapers/vigie-client.ts
class VigieClient {
  async getPromises(politicianName: string): Promise<VigiePromise[]> {
    // Respectful scraping with rate limiting
    const url = `https://www.vigiedumensonge.fr/search?politician=${politicianName}`

    // Parse HTML
    // Extract statements
    // Map to our format

    return promises
  }

  async verifyPromise(promiseText: string): Promise<VigieVerification | null> {
    // Search Vigie for similar promise
    // Return their verification if found
  }
}
```

## Benefits Summary

✅ **Data Quality**: Human-verified promises complement AI extraction
✅ **Credibility**: Multiple verification sources increase trust
✅ **Coverage**: Access to historical promises we might have missed
✅ **Community**: Tap into existing fact-checking community
✅ **Transparency**: Show multiple perspectives (AI vs Human)
✅ **Deduplication**: Avoid duplicate promises from different sources

## Next Steps

1. **Immediate**: Build basic Vigie scraper to test feasibility
2. **Short-term**: Import verified historical data
3. **Medium-term**: Contact Vigie team for partnership
4. **Long-term**: Build collaborative verification system

## Resources

- Vigie du mensonge: https://www.vigiedumensonge.fr
- Their GitHub (if available): Check for open data
- Contact: Look for collaboration email on their site
