/**
 * API Key Verification Script
 *
 * Verifies an API key's configuration and permissions.
 * Run with: tsx scripts/verify-api-key.ts <API_KEY>
 *
 * This helps debug authentication issues by showing:
 * - Key status (active/inactive/expired)
 * - Assigned scopes
 * - Tier level
 * - Rate limits
 * - Whether the key can access specific endpoints
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Hash API key with SHA-256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Check if scopes satisfy requirements (supports wildcards)
 */
function checkScopes(keyScopes: string[], requiredScopes: string[]): boolean {
  for (const requiredScope of requiredScopes) {
    let scopeMatched = false

    for (const keyScope of keyScopes) {
      // Exact match
      if (keyScope === requiredScope) {
        scopeMatched = true
        break
      }

      // Wildcard match: read:* matches read:anything
      if (keyScope.endsWith(':*')) {
        const prefix = keyScope.slice(0, -1) // Remove *
        if (requiredScope.startsWith(prefix)) {
          scopeMatched = true
          break
        }
      }

      // Admin wildcard: admin:* grants everything
      if (keyScope === 'admin:*') {
        scopeMatched = true
        break
      }
    }

    // If this required scope wasn't matched, return false
    if (!scopeMatched) {
      return false
    }
  }

  return true
}

/**
 * Main verification function
 */
async function verifyApiKey(apiKey: string) {
  console.log('\n🔍 API Key Verification Tool')
  console.log('='.repeat(60))
  console.log(`\nVerifying key: ${apiKey.substring(0, 16)}...\n`)

  try {
    // Hash the key
    const keyHash = hashApiKey(apiKey)

    // Lookup key in database
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyData) {
      console.log('❌ ERROR: API key not found in database')
      console.log('\nPossible reasons:')
      console.log('  • Key has been deleted')
      console.log('  • Key was never created')
      console.log('  • Wrong environment (check .env.local)')
      console.log('\nTo create a new key, run: tsx scripts/setup-api-keys.ts\n')
      return
    }

    // Display key information
    console.log('✅ API Key Found!\n')
    console.log('Key Information:')
    console.log(`  ID: ${keyData.id}`)
    console.log(`  Name: ${keyData.name}`)
    console.log(`  Prefix: ${keyData.key_prefix}...`)
    console.log(`  Tier: ${keyData.tier}`)
    console.log(`  Active: ${keyData.is_active ? '✅ Yes' : '❌ No'}`)

    // Check expiration
    if (keyData.expires_at) {
      const expiresAt = new Date(keyData.expires_at)
      const isExpired = expiresAt < new Date()
      console.log(`  Expires: ${expiresAt.toISOString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`)
    } else {
      console.log('  Expires: Never')
    }

    // Display scopes
    console.log(`\nScopes (${keyData.scopes.length}):`)
    keyData.scopes.forEach((scope: string) => {
      console.log(`  • ${scope}`)
    })

    // Display rate limits
    console.log('\nRate Limits:')
    const tierLimits = {
      free: { minute: 10, hour: 100, day: 1000 },
      standard: { minute: 60, hour: 1000, day: 10000 },
      premium: { minute: 120, hour: 5000, day: 50000 },
      enterprise: { minute: 300, hour: 20000, day: 200000 }
    }[keyData.tier as keyof typeof tierLimits] || { minute: 10, hour: 100, day: 1000 }

    console.log(`  Per Minute: ${keyData.rate_limit_minute ?? tierLimits.minute}`)
    console.log(`  Per Hour: ${keyData.rate_limit_hour ?? tierLimits.hour}`)
    console.log(`  Per Day: ${keyData.rate_limit_day ?? tierLimits.day}`)

    // Usage stats
    console.log('\nUsage Statistics:')
    console.log(`  Total Requests: ${keyData.total_requests}`)
    console.log(`  Last Used: ${keyData.last_used_at || 'Never'}`)
    if (keyData.last_used_ip) {
      console.log(`  Last IP: ${keyData.last_used_ip}`)
    }

    // IP whitelist
    if (keyData.allowed_ips && keyData.allowed_ips.length > 0) {
      console.log('\nIP Whitelist:')
      keyData.allowed_ips.forEach((ip: string) => {
        console.log(`  • ${ip}`)
      })
    }

    // Test endpoint permissions
    console.log('\n' + '='.repeat(60))
    console.log('Endpoint Permission Check')
    console.log('='.repeat(60) + '\n')

    const endpoints = [
      { name: 'List Politicians', scope: 'read:politicians', path: '/api/v1/public/politicians' },
      { name: 'Get Politician Details', scope: 'read:politicians', path: '/api/v1/public/politicians/{id}' },
      { name: 'Get Politician Scores', scope: 'read:scores', path: '/api/v1/public/politicians/{id}/scores' },
      { name: 'List Promises', scope: 'read:promises', path: '/api/v1/public/promises' },
      { name: 'Extract Promises', scope: 'write:promises', path: '/api/v1/public/promises (POST)' },
      { name: 'Trigger Data Collection', scope: 'trigger:data_collection', path: '/api/v1/public/triggers/data-collection' },
      { name: 'Match Promises', scope: 'trigger:semantic_matching', path: '/api/v1/public/triggers/match-promises' },
      { name: 'Calculate Scores', scope: 'trigger:score_calculation', path: '/api/v1/public/triggers/calculate-scores' },
      { name: '🎯 Trigger Politician Audit', scope: 'trigger:data_collection', path: '/api/v1/public/triggers/politician-audit' }
    ]

    let allowedCount = 0
    let deniedCount = 0

    endpoints.forEach(endpoint => {
      const hasAccess = checkScopes(keyData.scopes, [endpoint.scope])
      const icon = hasAccess ? '✅' : '❌'
      const status = hasAccess ? 'ALLOWED' : 'DENIED'

      if (hasAccess) allowedCount++
      else deniedCount++

      console.log(`${icon} ${status.padEnd(10)} ${endpoint.name}`)
      console.log(`   Required Scope: ${endpoint.scope}`)
      console.log(`   Path: ${endpoint.path}`)
      console.log()
    })

    console.log('='.repeat(60))
    console.log(`Summary: ${allowedCount} allowed, ${deniedCount} denied`)
    console.log('='.repeat(60))

    // Recommendations
    if (deniedCount > 0) {
      console.log('\n💡 Recommendations:\n')

      if (!checkScopes(keyData.scopes, ['trigger:data_collection'])) {
        console.log('⚠️  This key CANNOT trigger politician audits!')
        console.log('   Required: trigger:data_collection scope')
        console.log('   Required Tier: premium or higher')
        console.log('\n   To fix:')
        console.log('   1. Create a new premium tier key with trigger:* scope')
        console.log('   2. Run: tsx scripts/setup-api-keys.ts')
        console.log('   3. Use the "AI Orchestrator - Premium" key\n')
      }

      if (keyData.tier === 'free' || keyData.tier === 'standard') {
        console.log(`⚠️  Current tier: ${keyData.tier}`)
        console.log('   Trigger endpoints require premium or enterprise tier')
        console.log('   Consider upgrading this key or creating a new premium key\n')
      }
    } else {
      console.log('\n✅ This key has full access to all endpoints!\n')
    }

    // Test connectivity
    console.log('='.repeat(60))
    console.log('Testing Live Endpoint Connection')
    console.log('='.repeat(60) + '\n')

    const testUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'https://politik-cred.netlify.app') || 'http://localhost:3000'

    console.log(`Test URL: ${testUrl}/api/v1/public/politicians`)
    console.log('Authorization: Bearer ' + apiKey.substring(0, 16) + '...')
    console.log('\nTo test this key, run:')
    console.log(`\ncurl -H "Authorization: Bearer ${apiKey}" \\`)
    console.log(`     https://politik-cred.netlify.app/api/v1/public/politicians\n`)

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    console.log('\nPlease check:')
    console.log('  • NEXT_PUBLIC_SUPABASE_URL is set in .env.local')
    console.log('  • SUPABASE_SERVICE_ROLE_KEY is set in .env.local')
    console.log('  • Database migration 013 has been run\n')
  }
}

// Parse command line arguments
const apiKey = process.argv[2]

if (!apiKey) {
  console.log('\n❌ Error: No API key provided')
  console.log('\nUsage: tsx scripts/verify-api-key.ts <API_KEY>')
  console.log('\nExample:')
  console.log('  tsx scripts/verify-api-key.ts sk_live_abc123xyz...\n')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Error: Missing environment variables')
  console.log('\nPlease ensure .env.local contains:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_service_key\n')
  process.exit(1)
}

// Run verification
verifyApiKey(apiKey)
  .then(() => {
    console.log('✅ Verification complete\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Verification error:', error)
    process.exit(1)
  })
