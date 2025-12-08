#!/usr/bin/env tsx
/**
 * Promise Collection Script
 * Collects political promises from provided text and stores them in the database
 *
 * Usage:
 *   npm run collect-promises
 *   or
 *   tsx scripts/collect-promises.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase environment variables not set')
  console.error('\nPlease create a .env.local file with:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here')
  console.error('\nGet these from: https://app.supabase.com → Your Project → Settings → API\n')
  process.exit(1)
}

import { promiseCollector, PromiseSource } from '../src/lib/promise-extraction/promise-collector'

/**
 * Sample French Political Promises
 * Real quotes from French politicians with real source URLs (2022-2025)
 */
const SAMPLE_PROMISES: PromiseSource[] = [
]

/**
 * Main collection function
 */
async function main() {
  console.log('🇫🇷 French Political Promise Collection System')
  console.log('=' .repeat(60))
  console.log()

  const results = {
    total: 0,
    stored: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Process each source
  for (const source of SAMPLE_PROMISES) {
    console.log(`\n📝 Processing: ${source.politicianName}`)
    console.log(`   Source: ${source.url}`)
    console.log(`   Type: ${source.type}`)
    console.log('   ' + '-'.repeat(50))

    const result = await promiseCollector.collectAndStore(source)

    console.log(`   ✓ Promises found: ${result.promisesFound}`)
    console.log(`   ✓ Promises stored: ${result.promisesStored}`)

    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`)
      result.errors.forEach(err => console.log(`      - ${err}`))
    }

    results.total += result.promisesFound
    results.stored += result.promisesStored
    if (!result.success) {
      results.failed++
    }
    results.errors.push(...result.errors)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Collection Summary')
  console.log('=' .repeat(60))
  console.log(`Total promises found:  ${results.total}`)
  console.log(`Total promises stored: ${results.stored}`)
  console.log(`Failed collections:    ${results.failed}`)
  console.log(`Total errors:          ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    results.errors.forEach(err => console.log(`   - ${err}`))
  }

  console.log('\n✅ Promise collection completed!')
  process.exit(0)
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
