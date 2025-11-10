# Promise Collection Guide with URL Validation

## Overview

This guide explains how to collect political promises using the new URL validation system. All promises now require **verifiable, accessible source URLs** before being stored in the database.

---

## 🚀 Quick Start

### Step 1: Verify Migrations Are Applied

Run this SQL in your Supabase dashboard to check the setup:

```sql
-- Run this in SQL Editor
\i supabase/migrations/012_verify_setup.sql
```

You should see:
- ✅ Migration 010 applied (URL health tracking)
- ✅ Database flushed (0 promises)

### Step 2: Apply Migration 010 (if not done)

If migration 010 is NOT applied, run it in Supabase SQL Editor:

```sql
\i supabase/migrations/010_url_health_tracking.sql
```

This adds URL health tracking columns to `political_promises` table.

---

## 📝 Collecting Promises

### API Endpoint

**POST** `/api/promises/extract`

**Authentication:** Requires admin role

**Request Body:**
```json
{
  "politicianId": "uuid-of-politician",
  "text": "Text containing promises to extract",
  "sourceUrl": "https://example.com/source",
  "sourceType": "campaign_site | interview | social_media | debate | press_release | manifesto",
  "date": "2024-01-15" (optional, defaults to today)
}
```

**New Feature:** The API now **validates the source URL** before processing:
- ✅ Checks if URL is accessible (HTTP 200)
- ✅ Follows redirects and uses final URL
- ✅ Checks archive.org if original URL is dead
- ❌ Rejects promises if URL is not accessible

### Example: Successful Request

```bash
curl -X POST https://your-domain/api/promises/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "politicianId": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Je m'\''engage à augmenter le budget de la santé de 20% d'\''ici 2025. Nous allons également créer 10 000 emplois dans le secteur public.",
    "sourceUrl": "https://www.vie-publique.fr/discours/290000",
    "sourceType": "interview",
    "date": "2024-01-15"
  }'
```

**Response:**
```json
{
  "success": true,
  "extracted": 2,
  "stored": 2,
  "promises": [
    {
      "id": "...",
      "promise_text": "augmenter le budget de la santé de 20% d'ici 2025",
      "category": "healthcare",
      "confidence_score": 0.95,
      "source_url_status": "valid",
      "source_url_http_status": 200
    }
  ],
  "urlValidation": {
    "status": "valid",
    "httpStatus": 200,
    "responseTime": 342,
    "effectiveUrl": "https://www.vie-publique.fr/discours/290000",
    "archiveUrl": null
  },
  "message": "Successfully extracted and stored 2 promises from verified source"
}
```

### Example: Failed Request (Invalid URL)

**Request with broken URL:**
```bash
curl -X POST https://your-domain/api/promises/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "politicianId": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Je promets de créer 50 000 emplois.",
    "sourceUrl": "https://example.com/404-page-not-found",
    "sourceType": "interview"
  }'
```

**Response (400 error):**
```json
{
  "error": "Source URL is not accessible",
  "details": "HTTP 404: Not Found",
  "status": "client_error",
  "httpStatus": 404,
  "archiveUrl": "https://web.archive.org/web/20231215/https://example.com/404-page-not-found",
  "suggestion": "An archived version is available. Use the archive URL instead."
}
```

**What to do:**
- Use the provided `archiveUrl` if available
- Find a different valid source
- Fix the broken URL

---

## 🎯 Best Practices

### 1. **Use Official Government Sources**

Preferred sources (always accessible):
- ✅ `www.vie-publique.fr` - Official government communications
- ✅ `www.assemblee-nationale.fr` - Parliamentary records
- ✅ `www.senat.fr` - Senate records
- ✅ `www.elysee.fr` - Presidential speeches
- ✅ `www.gouvernement.fr` - Government announcements

### 2. **Validate URLs Before Bulk Import**

If importing many promises, validate URLs first:

```bash
# Check single URL manually
curl -I https://example.com/article

# Or use the validation API
curl -X POST https://your-domain/api/promises/validate-urls \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com/article"]}'
```

### 3. **Handle Redirects**

The system automatically follows redirects:
- Original URL: `http://example.com/article`
- Final URL: `https://example.com/article` (stored as `source_url`)
- Redirect URL: Saved in `source_url_redirect_url` column

### 4. **Use Archive.org for Historical Promises**

For old promises with dead links:
1. Find the archive.org snapshot: https://web.archive.org
2. Use the archive URL as `sourceUrl`:
   ```json
   {
     "sourceUrl": "https://web.archive.org/web/20230515/https://original-url.com",
     "sourceType": "archived_content"
   }
   ```

### 5. **Source Type Guidelines**

Choose the correct `sourceType`:

| Type | When to Use | Example |
|------|-------------|---------|
| `campaign_site` | Official campaign websites | `https://campaign2024.fr/program` |
| `interview` | Media interviews | `https://franceinfo.fr/interview/politician` |
| `social_media` | Twitter, Facebook posts | `https://twitter.com/politician/status/123` |
| `debate` | Televised debates | `https://www.vie-publique.fr/debat/2024` |
| `press_release` | Official press releases | `https://gouvernement.fr/communique/2024` |
| `manifesto` | Party manifestos | `https://parti.fr/manifeste-2024.pdf` |

---

## 🔄 Promise Collection Workflow

### Recommended Process

1. **Find Politician ID**
   ```sql
   SELECT id, name FROM politicians WHERE name ILIKE '%politician name%';
   ```

2. **Locate Promise Sources**
   - Search Vie Publique for speeches
   - Check Assemblée Nationale records
   - Review official campaign sites

3. **Validate URL Accessibility**
   ```bash
   curl -I https://source-url.com
   ```

4. **Extract Text from Source**
   - Copy relevant text containing promises
   - Include context (date, event, audience)

5. **Submit via API**
   ```bash
   curl -X POST /api/promises/extract \
     -d '{...}'
   ```

6. **Verify in Admin Dashboard**
   - Check `/admin` → Promises tab
   - Confirm URL status is "valid"
   - Review extracted promises

---

## 🛠️ Admin Dashboard Tools

### URL Health Monitor

Access: `/admin` → "URL Health" tab

Features:
- View total promises and URL validation status
- See breakdown: valid, errors, redirects, timeouts
- One-click validation for unchecked URLs
- View failed URLs with archive.org fallbacks

**How to Use:**

1. Navigate to admin dashboard
2. Click "URL Health" tab
3. Review statistics
4. Click "Valider les URLs (X)" button to check unchecked URLs
5. Review results and fix broken sources

### Validate Existing URLs

If you already have promises in the database:

```bash
# Validate all unchecked URLs (batch of 50)
curl -X POST https://your-domain/api/promises/validate-urls \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'

# Validate specific promises
curl -X POST https://your-domain/api/promises/validate-urls \
  -H "Content-Type: application/json" \
  -d '{"promiseIds": ["uuid1", "uuid2"]}'
```

---

## 📊 Understanding URL Health Statuses

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `valid` ✅ | URL accessible (HTTP 200) | None - perfect! |
| `redirect` ↗️ | URL redirects to another URL | None - handled automatically |
| `archived_only` 📦 | Only archive.org version works | Consider using archived URL |
| `unchecked` ⏱️ | Not yet validated | Run validation |
| `client_error` ❌ | HTTP 4xx (404, 403, etc.) | Fix or replace URL |
| `server_error` ⚠️ | HTTP 5xx (500, 503, etc.) | Retry later or replace |
| `network_error` 🌐 | Cannot reach server | Check URL or network |
| `timeout` ⏰ | Request timed out (10s) | Slow server - retry or replace |

---

## 🧪 Testing the System

### Test with Valid URL

```bash
curl -X POST http://localhost:3000/api/promises/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "politicianId": "test-politician-id",
    "text": "Je m'\''engage à créer 1000 emplois dans le secteur de la santé.",
    "sourceUrl": "https://www.vie-publique.fr",
    "sourceType": "interview"
  }'
```

### Test with Invalid URL

```bash
curl -X POST http://localhost:3000/api/promises/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "politicianId": "test-politician-id",
    "text": "Je promets d'\''augmenter les salaires.",
    "sourceUrl": "https://this-url-does-not-exist-12345.com",
    "sourceType": "interview"
  }'
```

Expected: **400 error** with message about inaccessible URL.

---

## 📈 Monitoring Promise Quality

### View URL Health Statistics

```sql
-- Get URL health summary
SELECT * FROM get_url_health_summary();

-- Find promises needing validation
SELECT * FROM get_urls_needing_check(100);

-- Count promises by status
SELECT
  source_url_status,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*)::numeric FROM political_promises) * 100, 2) as percentage
FROM political_promises
GROUP BY source_url_status
ORDER BY count DESC;
```

### Ensure Consistency Scores Are Accurate

Only promises with valid URLs are counted:

```sql
-- This query shows which promises ARE counted in scores
SELECT COUNT(*)
FROM political_promises pp
JOIN promise_verifications pv ON pv.promise_id = pp.id
WHERE pp.source_url_status IN ('valid', 'redirect', 'archived_only')
AND pv.verified_at IS NOT NULL;

-- This query shows which promises are EXCLUDED from scores
SELECT COUNT(*)
FROM political_promises pp
WHERE pp.source_url_status NOT IN ('valid', 'redirect', 'archived_only');
```

---

## 🎯 Next Steps

1. ✅ Apply migration 010 (if not done)
2. ✅ Verify database is flushed (migration 011 executed)
3. 📥 Start collecting promises with validated URLs
4. 🔍 Use admin dashboard to monitor URL health
5. 🔄 Periodically re-validate URLs (automatic every 7 days)

---

## 💡 Tips

- **Start with official sources** (vie-publique.fr, assemblee-nationale.fr)
- **Validate URLs before bulk import** to avoid wasted API calls
- **Use archive.org** for historical promises with dead links
- **Monitor URL health** regularly via admin dashboard
- **Re-run validation** for timeout/server errors (transient failures)

---

## 📞 Troubleshooting

### Problem: Migration 010 Not Applied

**Symptom:** Error when extracting promises about missing columns

**Solution:**
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/010_url_health_tracking.sql
```

### Problem: URL Validation Timeouts

**Symptom:** Many URLs marked as "timeout"

**Solution:**
- Slow source servers - this is normal
- Retry later via admin dashboard
- Consider using archive.org URL instead

### Problem: Archive.org Not Finding Old URLs

**Symptom:** Dead URL with no archive fallback

**Solution:**
- Manually search https://web.archive.org
- Try different date snapshots
- Find alternative source for the same promise

---

## 🎉 Success Criteria

You'll know the system is working when:

✅ New promises require valid URLs
✅ Invalid URLs are rejected with helpful errors
✅ Admin dashboard shows URL health statistics
✅ Consistency scores only include verifiable promises
✅ Archive.org fallbacks are suggested for dead links
✅ URL validation runs automatically every 7 days

---

**Need Help?** Check `/admin` → "URL Health" tab for real-time status.
