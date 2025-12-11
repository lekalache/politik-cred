# Automated Daily Data Collection Setup

This guide explains how to set up automated daily data collection for PolitikCred' using Netlify Scheduled Functions.

## Architecture

```
Netlify Scheduled Function
    ↓ (runs daily at 6:00 AM Paris time)
API Endpoint: /api/cron/daily-audit
    ↓ (orchestrates pipeline)
┌───────────────┬──────────────┬──────────────┬──────────────┐
│ Step 1        │ Step 2       │ Step 3       │ Step 4       │
│ Collect Data  │ Match        │ Calculate    │ Generate     │
│ (10 min)      │ Promises     │ Scores       │ Report       │
│               │ (5 min)      │ (2 min)      │ (1 min)      │
└───────────────┴──────────────┴──────────────┴──────────────┘
```

## Setup Instructions

### 1. Create Database Table

Run the SQL migration to create the `audit_logs` table:

```bash
# Connect to your Supabase project and run:
psql $DATABASE_URL -f scripts/create-audit-logs-table.sql
```

Or execute in Supabase SQL editor:
- Go to Supabase Dashboard → SQL Editor
- Copy contents of `scripts/create-audit-logs-table.sql`
- Execute

### 2. Configure Environment Variables

Add these environment variables to your Netlify site:

```bash
# Go to Netlify Dashboard → Site Settings → Environment Variables

# Required for cron to work
CRON_SECRET_TOKEN=<generate-a-secure-random-token>
ENABLE_CRON=true

# Your site URL (Netlify provides this automatically)
URL=https://your-site.netlify.app

# Existing variables (already set)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
HUGGINGFACE_API_KEY=...
```

**Generate a secure CRON_SECRET_TOKEN:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install Dependencies

The scheduled function requires `@netlify/functions`:

```bash
npm install @netlify/functions --save
```

### 4. Deploy to Netlify

```bash
# Commit changes
git add .
git commit -m "feat: Add automated daily data collection"
git push

# Netlify will automatically deploy
```

### 5. Verify Deployment

Check that the scheduled function is deployed:

1. Go to Netlify Dashboard → Functions
2. Look for `scheduled-data-collection`
3. Check the logs for any errors

### 6. Configure Schedule (Optional)

The default schedule is `@daily` (midnight UTC). To run at 6:00 AM Paris time:

1. Update `netlify/functions/scheduled-data-collection.ts`:
   ```typescript
   // Change from:
   export const handler = schedule('0 6 * * *', async (event) => {

   // Winter (CET = UTC+1): 5:00 AM UTC = 6:00 AM CET
   // Summer (CEST = UTC+2): 4:00 AM UTC = 6:00 AM CEST

   // For year-round 6:00 AM Paris time, use:
   export const handler = schedule('0 5 * * *', async (event) => {
   ```

## Testing

### Manual Test (Recommended)

Trigger a manual audit without waiting for the scheduled time:

```bash
curl -X POST https://your-site.netlify.app/api/cron/test-audit \
  -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN" \
  -H "Content-Type: application/json"
```

### Local Testing

```bash
# Start dev server
npm run dev

# In another terminal, trigger the audit:
curl -X POST http://localhost:3000/api/cron/test-audit \
  -H "Authorization: Bearer change-me-in-production" \
  -H "Content-Type: application/json"
```

### Check Audit Logs

View recent audit logs via API:

```bash
curl https://your-site.netlify.app/api/cron/daily-audit \
  -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"
```

Or query the database directly:

```sql
SELECT * FROM audit_logs
WHERE activity = 'daily-audit'
ORDER BY created_at DESC
LIMIT 10;
```

## Pipeline Steps

### Step 1: Collect Parliamentary Data (10 min)
- Scrapes Assemblée Nationale API
- Fetches votes, bills, amendments, attendance
- Stores in `parliamentary_actions` table
- Updates `data_collection_jobs` table

### Step 2: Match Promises to Actions (5 min)
- Uses semantic similarity (Hugging Face API)
- Fallback to Jaccard similarity if API unavailable
- Creates `promise_verifications` entries
- Updates promise status to 'verified'

### Step 3: Calculate Scores (2 min)
- Calculates consistency scores per politician
- Formula: (kept×100 + partial×50) / total
- Updates `consistency_scores` table
- Updates `politicians.ai_score` field

### Step 4: Generate Report (1 min)
- Aggregates statistics
- Logs to `audit_logs` table
- Can be extended to send email notifications

## Monitoring

### Check Function Logs

1. Go to Netlify Dashboard → Functions
2. Click on `scheduled-data-collection`
3. View execution logs

### Check Audit Logs

Query the database:

```sql
-- Get today's audits
SELECT * FROM audit_logs
WHERE activity = 'daily-audit'
  AND created_at > CURRENT_DATE
ORDER BY created_at DESC;

-- Get failed audits
SELECT * FROM audit_logs
WHERE activity = 'daily-audit'
  AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Set Up Alerts (Optional)

Use Netlify's built-in notifications:

1. Go to Netlify Dashboard → Site Settings → Build & Deploy
2. Enable "Deploy notifications"
3. Add webhook for function failures

## Troubleshooting

### Function Not Running

1. **Check ENABLE_CRON**: Ensure it's set to `true` in Netlify environment variables
2. **Check schedule**: Verify the cron expression in the function
3. **Check logs**: Look for errors in Netlify function logs

### Function Timing Out

1. **Increase timeout**: Update `netlify.toml` with longer timeout
2. **Split work**: Break long-running tasks into smaller chunks
3. **Optimize queries**: Add database indexes for common queries

### Authentication Errors

1. **Check CRON_SECRET_TOKEN**: Ensure it's set in Netlify and matches locally
2. **Check Authorization header**: Ensure it's formatted as `Bearer <token>`

### Data Not Updating

1. **Check each step**: Look at the `results` array in audit logs
2. **Check database permissions**: Ensure service role key has proper access
3. **Check API rate limits**: Hugging Face API has rate limits

## Cost Optimization

Netlify Scheduled Functions are free for:
- Up to 125,000 function invocations per month
- Up to 100 hours of function execution time

Our daily cron uses approximately:
- 1 invocation per day = 30 invocations/month
- ~18 minutes per run = 9 hours/month

**Well within free tier limits!**

## Next Steps

1. **Add email notifications**: Send daily report to admins
2. **Add retry logic**: Retry failed steps automatically
3. **Add monitoring**: Integrate with monitoring service (e.g., Sentry)
4. **Add more data sources**: Scrape Sénat, news articles, social media
5. **Optimize performance**: Cache results, add database indexes

## References

- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
