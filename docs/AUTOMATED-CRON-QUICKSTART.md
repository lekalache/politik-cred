# 🚀 Quick Start: Automated Daily Data Collection

## What This Does

Automatically runs every day at 6:00 AM Paris time:
1. ✅ Collects new parliamentary data (votes, bills, amendments)
2. ✅ Matches promises to actions using AI
3. ✅ Calculates consistency scores
4. ✅ Updates politician AI scores
5. ✅ Logs everything to database

**Result**: Your politicians' data stays fresh without manual work!

---

## Setup (5 Steps)

### Step 1: Create Database Table

```bash
# Option A: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Open your project → SQL Editor
3. Copy contents of scripts/create-audit-logs-table.sql
4. Execute

# Option B: Using psql
psql $DATABASE_URL -f scripts/create-audit-logs-table.sql
```

### Step 2: Update .env.local

Replace the placeholder token in `.env.local`:

```bash
# Change this:
CRON_SECRET_TOKEN=your_secure_cron_secret_token_here_change_in_production

# To this (use the secure token generated):
CRON_SECRET_TOKEN=8eb97c9cb38af6afe8f4f15514f2209e8ff6adc7f4c52c56cf95250a010ca1ca

# For local testing, keep this as false:
ENABLE_CRON=false
```

### Step 3: Test Locally

```bash
# Start dev server
npm run dev

# In another terminal, test the cron:
curl -X POST http://localhost:3000/api/cron/test-audit \
  -H "Authorization: Bearer your_secure_cron_secret_token_here_change_in_production" \
  -H "Content-Type: application/json"

# You should see the pipeline run through all 4 steps
```

### Step 4: Commit & Deploy

```bash
git add .
git commit -m "feat: Add automated daily data collection"
git push

# Netlify will automatically deploy
```

### Step 5: Configure Netlify Environment Variables

Go to Netlify Dashboard → Site Settings → Environment Variables and add:

```
CRON_SECRET_TOKEN=8eb97c9cb38af6afe8f4f15514f2209e8ff6adc7f4c52c56cf95250a010ca1ca
ENABLE_CRON=true
```

**⚠️ Important**: Use a DIFFERENT token for production! Generate a new one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Verify It Works

### Check Netlify Functions

1. Go to Netlify Dashboard → Functions
2. Look for `scheduled-data-collection`
3. Check the logs - you should see daily executions

### Check Database

```sql
-- View recent audits
SELECT * FROM audit_logs
WHERE activity = 'daily-audit'
ORDER BY created_at DESC
LIMIT 5;

-- Check if politicians are being updated
SELECT name, ai_score, ai_last_audited_at
FROM politicians
WHERE ai_score IS NOT NULL
ORDER BY ai_last_audited_at DESC
LIMIT 10;
```

### Manual Trigger (for testing)

Force an immediate run without waiting for schedule:

```bash
curl -X POST https://your-site.netlify.app/api/cron/test-audit \
  -H "Authorization: Bearer YOUR_PRODUCTION_CRON_TOKEN" \
  -H "Content-Type: application/json"
```

---

## What Runs Daily

```
6:00 AM Paris Time
    ↓
┌─────────────────────────────────────────────────────┐
│ Step 1: Collect Data (10 min)                      │
│ - Scrape Assemblée Nationale                        │
│ - Fetch votes, bills, amendments                    │
│ - Store in parliamentary_actions table              │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Match Promises (5 min)                     │
│ - Run semantic matching (Hugging Face)              │
│ - Create promise_verifications                      │
│ - Update promise status                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Calculate Scores (2 min)                   │
│ - Calculate consistency scores                       │
│ - Update consistency_scores table                    │
│ - Update politicians.ai_score                        │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Generate Report (1 min)                    │
│ - Aggregate statistics                               │
│ - Log to audit_logs                                  │
│ - (Future: Send email notifications)                │
└─────────────────────────────────────────────────────┘
    ↓
✅ Fresh data ready!
```

---

## Monitoring

### Check Execution Logs

```bash
# View the API endpoint status
curl https://your-site.netlify.app/api/cron/daily-audit \
  -H "Authorization: Bearer YOUR_CRON_TOKEN"

# Returns:
{
  "enabled": true,
  "schedule": "0 6 * * * (Daily at 6:00 AM Paris time)",
  "last_run": "2025-01-08T05:00:00Z",
  "recent_audits": [...]
}
```

### Dashboard Query

```sql
-- Daily audit success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM audit_logs
WHERE activity = 'daily-audit'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### "Cron jobs are disabled"

Set `ENABLE_CRON=true` in Netlify environment variables.

### "Unauthorized"

Check that `CRON_SECRET_TOKEN` matches in Netlify and your request.

### Function times out

Increase timeout in `netlify.toml`:

```toml
[functions]
  "scheduled-data-collection" = { timeout = 600 }  # 10 minutes
```

### No data collected

1. Check Assemblée Nationale API is accessible
2. Check Hugging Face API key is valid
3. Check Supabase service role key has permissions

---

## Cost

**100% Free** on Netlify free tier:
- Daily execution: 1 invocation/day = 30/month (limit: 125,000/month)
- Execution time: ~18 min/day = 9 hours/month (limit: 100 hours/month)

**Well within limits!** ✅

---

## Next Steps

Once automated collection is working:

1. **Add Sénat data** - Expand to upper house of parliament
2. **Add news extraction** - Extract promises from news articles
3. **Add email reports** - Daily summary to admins
4. **Add monitoring** - Integrate with Sentry or similar
5. **Add retry logic** - Auto-retry failed steps

---

## Need Help?

- Full docs: `docs/AUTOMATED-CRON-SETUP.md`
- Test endpoint: `/api/cron/test-audit`
- Check logs: Netlify Dashboard → Functions → scheduled-data-collection
