# Debugging: Politician Audit Endpoint (triggerPoliticianAudit)

## Issue Summary

The `triggerPoliticianAudit` endpoint (`/api/v1/public/triggers/politician-audit`) requires specific API key permissions that may not be configured in the orchestrator's API key.

## Root Cause Analysis

### Required Permissions

The endpoint requires:
- **Scope**: `trigger:data_collection` (or wildcard `trigger:*`)
- **Minimum Tier**: `premium` or higher
- **Authentication**: Bearer token in `Authorization` header

### Why It's Failing

Most likely causes:

1. **Insufficient Scopes**: The API key used by the orchestrator doesn't have the `trigger:data_collection` scope
2. **Wrong Tier**: The API key is `free` or `standard` tier (needs `premium` or `enterprise`)
3. **Inactive/Expired Key**: The API key has been deactivated or expired
4. **Missing/Malformed Authorization**: The Bearer token isn't being passed correctly

### Error Responses

| Error Code | Status | Meaning |
|------------|--------|---------|
| `MISSING_API_KEY` | 401 | No Authorization header provided |
| `INVALID_API_KEY_FORMAT` | 401 | Key format invalid (must be `sk_(live\|test)_xxx`) |
| `INVALID_API_KEY` | 401 | Key not found in database |
| `API_KEY_INACTIVE` | 403 | Key has been deactivated |
| `API_KEY_EXPIRED` | 403 | Key has expired |
| `INSUFFICIENT_SCOPES` | 403 | **Key lacks `trigger:data_collection` scope** |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

## Diagnostic Steps

### 1. Verify API Key Configuration

Run the verification script with the orchestrator's API key:

```bash
tsx scripts/verify-api-key.ts sk_live_your_key_here
```

This will show:
- ✅ Key status (active/inactive/expired)
- ✅ Assigned scopes
- ✅ Tier level
- ✅ Which endpoints the key can access
- ✅ Specific permission check for politician audit endpoint

### 2. Check Expected Output

**If the key is correctly configured**, you should see:

```
✅ ALLOWED     🎯 Trigger Politician Audit
   Required Scope: trigger:data_collection
   Path: /api/v1/public/triggers/politician-audit
```

**If the key lacks permissions**, you'll see:

```
❌ DENIED      🎯 Trigger Politician Audit
   Required Scope: trigger:data_collection
   Path: /api/v1/public/triggers/politician-audit

⚠️  This key CANNOT trigger politician audits!
   Required: trigger:data_collection scope
   Required Tier: premium or higher
```

### 3. Inspect Orchestrator Configuration

Check how the orchestrator is passing the API key:

**Correct format:**
```http
POST /api/v1/public/triggers/politician-audit
Host: politik-cred.netlify.app
Authorization: Bearer sk_live_example_placeholder
Content-Type: application/json

{
  "politicianId": "uuid-here",
  "timeframe": "month",
  "minConfidence": 0.6
}
```

**Common mistakes:**
- ❌ Missing `Bearer ` prefix
- ❌ Extra spaces: `Bearer  sk_live_...` (two spaces)
- ❌ Using `X-API-Key` header instead of `Authorization`
- ❌ Passing key in request body instead of header

### 4. Test Endpoint Directly

Test the endpoint using curl:

```bash
# Replace with actual politician ID and API key
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/politician-audit \
  -H "Authorization: Bearer sk_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "politicianId": "uuid-here",
    "timeframe": "month",
    "includeNewsSearch": true,
    "minConfidence": 0.6
  }'
```

**Expected successful response:**
```json
{
  "success": true,
  "audit": {
    "politicianId": "...",
    "politicianName": "...",
    "timeframe": "month",
    "steps": {
      "newsSearch": { "articlesFound": 5 },
      "promiseExtraction": { "extracted": 12, "stored": 10 },
      "semanticMatching": { "matched": 8, "autoVerified": 5, "needsReview": 3 },
      "scoreCalculation": { "overallScore": 67.5, ... }
    }
  },
  "meta": { ... }
}
```

## Solutions

### Solution 1: Create a New Premium API Key (Recommended)

If you don't have a premium key with trigger permissions:

```bash
# Run the setup script to create API keys
tsx scripts/setup-api-keys.ts
```

This creates 3 keys:
1. **Test - Read Only** (free tier) - For testing read operations
2. **AI Orchestrator - Standard** (standard tier) - For basic write operations
3. **AI Orchestrator - Premium** (premium tier) - **Use this one!** ✅

The **Premium key** has scope `trigger:*` which grants access to:
- `trigger:data_collection` ✅
- `trigger:semantic_matching` ✅
- `trigger:score_calculation` ✅

**Important:** Save the generated keys immediately - they're only shown once!

### Solution 2: Upgrade Existing Key

If you want to keep using your current key, upgrade it manually in the database:

```sql
-- Update key tier and scopes
UPDATE api_keys
SET
  tier = 'premium',
  scopes = ARRAY['read:*', 'write:*', 'trigger:*']
WHERE key_hash = '<your_key_hash>';
```

**Note:** You'll need to hash your API key first to find it:
```bash
echo -n "sk_live_your_key" | openssl dgst -sha256
```

### Solution 3: Update Orchestrator Configuration

Once you have a valid premium key:

1. **Update environment variable** in your orchestrator:
   ```bash
   export POLITIK_CRED_API_KEY="sk_live_xxxxx"  # Premium key
   ```

2. **Update workflow configuration** (e.g., `workflow_builder.py:549-593`):
   ```python
   # Ensure Bearer token is passed to OpenAPI tools
   headers = {
       "Authorization": f"Bearer {os.getenv('POLITIK_CRED_API_KEY')}"
   }
   ```

3. **Verify authentication in OpenAPI tool calls**:
   ```python
   # Make sure the authentication is applied to ALL tool calls
   openapi_tool = OpenAPITool(
       spec_url="https://politik-cred.netlify.app/api/openapi.json",
       headers=headers  # ← This must be included!
   )
   ```

## Verification Checklist

Before running your orchestrator again:

- [ ] API key has `premium` or `enterprise` tier
- [ ] API key has `trigger:*` or `trigger:data_collection` scope
- [ ] API key is active (not expired/deactivated)
- [ ] Orchestrator passes key as `Authorization: Bearer <key>` header
- [ ] Test endpoint works with `curl` (see above)
- [ ] Run verification script shows all checks pass

## Testing the Fix

### Quick Test

```bash
# 1. Verify key permissions
tsx scripts/verify-api-key.ts $POLITIK_CRED_API_KEY

# 2. Get a politician ID
curl -H "Authorization: Bearer $POLITIK_CRED_API_KEY" \
     https://politik-cred.netlify.app/api/v1/public/politicians?limit=1

# 3. Trigger audit (replace <politician-id>)
curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/politician-audit \
  -H "Authorization: Bearer $POLITIK_CRED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"politicianId":"<politician-id>","timeframe":"week"}'
```

### Expected Timeline

The audit process takes **30-60 seconds** and runs through:
1. 🔍 News search (5-10s)
2. 🤖 Promise extraction with AI (10-20s)
3. 🧠 Semantic matching (15-30s)
4. 📊 Score calculation (5-10s)
5. 📄 Report generation (2-5s)

## OpenAPI Specification

The endpoint is correctly documented in the OpenAPI spec:

**Endpoint:** `/api/v1/public/triggers/politician-audit`
**Method:** `POST`
**Operation ID:** `triggerPoliticianAudit`
**Security:** `bearerAuth` (required)

**Request Body:**
```json
{
  "politicianId": "uuid (required)",
  "includeNewsSearch": "boolean (default: true)",
  "newsSearchQuery": "string (optional)",
  "timeframe": "week|month|quarter|year|all (default: month)",
  "minConfidence": "number 0-1 (default: 0.6)",
  "generateReport": "boolean (default: true)"
}
```

## Additional Resources

### Related Files

- **Endpoint Implementation**: `src/app/api/v1/public/triggers/politician-audit/route.ts`
- **OpenAPI Spec**: `src/app/api/openapi.json/route.ts` (lines 522-585)
- **Auth Middleware**: `src/lib/middleware/api-key.ts`
- **Rate Limit Middleware**: `src/lib/middleware/api-key-rate-limit.ts`
- **Database Migration**: `supabase/migrations/013_api_key_system.sql`
- **Setup Script**: `scripts/setup-api-keys.ts`
- **Verification Script**: `scripts/verify-api-key.ts` ⬅️ NEW!

### Support Commands

```bash
# List all API keys
psql $DATABASE_URL -c "SELECT id, name, tier, scopes, is_active FROM api_keys;"

# Check API usage logs
psql $DATABASE_URL -c "SELECT * FROM api_usage_logs WHERE endpoint LIKE '%politician-audit%' ORDER BY created_at DESC LIMIT 10;"

# View rate limit status
psql $DATABASE_URL -c "SELECT * FROM api_rate_limits WHERE api_key_id = '<key-id>';"
```

## Summary

**The issue is**: Your orchestrator's API key lacks the `trigger:data_collection` scope required for the politician audit endpoint.

**The fix is**: Use or create a **premium tier** API key with the `trigger:*` scope.

**To verify**: Run `tsx scripts/verify-api-key.ts <your_key>` and check for ✅ on the politician audit endpoint.
