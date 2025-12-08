/**
 * Setup API Keys Script
 *
 * Creates initial API keys for testing and development.
 * Run with: tsx scripts/setup-api-keys.ts
 *
 * IMPORTANT: Save the generated keys immediately!
 * They are only shown once and cannot be recovered.
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
 * Generate a secure API key
 * Format: sk_(live|test)_[32+ random characters]
 */
function generateApiKey(prefix: 'sk_live' | 'sk_test' = 'sk_live'): string {
  const randomBytes = crypto.randomBytes(24) // Creates 32 chars when base64url encoded
  const key = `${prefix}_${randomBytes.toString('base64url')}`
  return key
}

/**
 * Hash API key with SHA-256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Create an API key in the database
 */
async function createApiKey(config: {
  name: string
  tier: 'free' | 'standard' | 'premium' | 'enterprise'
  scopes: string[]
  expiresAt?: string
  allowedIps?: string[]
}): Promise<{ key: string; data: any }> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Creating API key: ${config.name}`)
  console.log(`${'='.repeat(60)}`)

  const key = generateApiKey('sk_live')
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 16)

  console.log(`Tier: ${config.tier}`)
  console.log(`Scopes: ${config.scopes.join(', ')}`)
  if (config.expiresAt) {
    console.log(`Expires: ${config.expiresAt}`)
  }
  if (config.allowedIps) {
    console.log(`Allowed IPs: ${config.allowedIps.join(', ')}`)
  }

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: config.name,
      tier: config.tier,
      scopes: config.scopes,
      is_active: true,
      expires_at: config.expiresAt,
      allowed_ips: config.allowedIps
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Error creating API key: ${error.message}`)
    throw error
  }

  console.log(`\n✅ API Key Created Successfully!`)
  console.log(`\nKey ID: ${data.id}`)
  console.log(`Key Prefix: ${keyPrefix}...`)
  console.log(`\n⚠️  SAVE THIS KEY NOW - IT WILL NOT BE SHOWN AGAIN!`)
  console.log(`\n📋 API Key:\n${key}\n`)

  return { key, data }
}

/**
 * Main setup function
 */
async function main() {
  console.log('\n🚀 API Key Setup Script')
  console.log('This script will create initial API keys for testing and development.')
  console.log('\nMake sure you have:')
  console.log('  1. Run migration 013 (API key system)')
  console.log('  2. Set NEXT_PUBLIC_SUPABASE_URL in .env.local')
  console.log('  3. Set SUPABASE_SERVICE_ROLE_KEY in .env.local')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Error: Missing required environment variables')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  try {
    // Verify migration 013 has been run
    const { data: scopes, error: scopesError } = await supabase
      .from('api_key_scopes')
      .select('scope')
      .limit(1)

    if (scopesError) {
      console.error('\n❌ Error: api_key_scopes table not found')
      console.error('Please run migration 013 first: supabase migration up')
      process.exit(1)
    }

    console.log('\n✅ Migration 013 verified\n')

    const keys: Array<{ name: string; key: string }> = []

    // Create Free Tier - Read Only (for testing)
    const key1 = await createApiKey({
      name: 'Test - Read Only',
      tier: 'free',
      scopes: ['read:*']
    })
    keys.push({ name: 'Test - Read Only', key: key1.key })

    // Create Standard Tier - Read + Write Promises/Verifications
    const key2 = await createApiKey({
      name: 'AI Orchestrator - Standard',
      tier: 'standard',
      scopes: ['read:*', 'write:promises', 'write:verifications', 'write:votes']
    })
    keys.push({ name: 'AI Orchestrator - Standard', key: key2.key })

    // Create Premium Tier - Full Access (Read + Write + Trigger)
    const key3 = await createApiKey({
      name: 'AI Orchestrator - Premium',
      tier: 'premium',
      scopes: ['read:*', 'write:*', 'trigger:*']
    })
    keys.push({ name: 'AI Orchestrator - Premium', key: key3.key })

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📝 Summary of Created API Keys:\n')

    keys.forEach((k, i) => {
      console.log(`${i + 1}. ${k.name}`)
      console.log(`   ${k.key}\n`)
    })

    console.log('⚠️  IMPORTANT SECURITY NOTES:')
    console.log('  • Save these keys in a secure password manager')
    console.log('  • Never commit these keys to version control')
    console.log('  • Keys cannot be recovered if lost (you must rotate)')
    console.log('  • Use environment variables to store keys in your app\n')

    console.log('📚 Next Steps:')
    console.log('  1. Save the API keys above')
    console.log('  2. Test with: curl -H "Authorization: Bearer <key>" http://localhost:3000/api/v1/public/politicians')
    console.log('  3. View keys in admin panel: /admin/api-keys\n')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Setup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup script failed:', error)
    process.exit(1)
  })
