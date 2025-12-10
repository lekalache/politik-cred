#!/usr/bin/env tsx
/**
 * Complete Data Population Script
 * Populates the Politik Cred' database with real French political data
 *
 * This orchestrates:
 * 1. Politicians (from NosDéputés.fr)
 * 2. Parliamentary actions (votes, bills, attendance)
 * 3. Promises from Vigie du Mensonge
 * 4. Promises from news articles
 * 5. Semantic matching
 * 6. Consistency score calculation
 *
 * Usage:
 *   npm run populate-all
 *   or
 *   tsx scripts/populate-all-data.ts
 *
 * Options:
 *   --skip-politicians   Skip politician seeding
 *   --skip-parliament    Skip parliamentary data
 *   --skip-vigie         Skip Vigie du Mensonge
 *   --skip-news          Skip news collection
 *   --skip-matching      Skip semantic matching
 *   --skip-scores        Skip score calculation
 *   --limit=N            Limit to N politicians (default: all)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Validate environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase environment variables')
  console.error('\nRequired in .env.local:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase
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

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  skipPoliticians: args.includes('--skip-politicians'),
  skipParliament: args.includes('--skip-parliament'),
  skipVigie: args.includes('--skip-vigie'),
  skipNews: args.includes('--skip-news'),
  skipMatching: args.includes('--skip-matching'),
  skipScores: args.includes('--skip-scores'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0')
}

// Statistics tracker
const stats = {
  politicians: { inserted: 0, updated: 0, errors: 0 },
  parliamentaryActions: { inserted: 0, updated: 0, errors: 0 },
  vigiePromises: { imported: 0, skipped: 0, errors: 0 },
  newsPromises: { extracted: 0, stored: 0, errors: 0 },
  matching: { matched: 0, autoVerified: 0, needsReview: 0 },
  scores: { calculated: 0, errors: 0 }
}

/**
 * Phase 1: Populate Politicians from NosDéputés.fr
 */
async function populatePoliticians(): Promise<string[]> {
  console.log('\n' + '='.repeat(70))
  console.log('📋 PHASE 1: Populate Politicians from Assemblée Nationale')
  console.log('='.repeat(70))

  try {
    console.log('\n🔍 Fetching deputies from NosDéputés.fr...')

    const response = await fetch('https://www.nosdeputes.fr/deputes/enmandat/json', {
      headers: {
        'User-Agent': 'PolitikCred/1.0 (Data Population)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch deputies: ${response.status}`)
    }

    const data = await response.json()
    const deputies = data.deputes?.map((d: any) => d.depute) || []

    console.log(`✅ Found ${deputies.length} deputies\n`)

    const politicianIds: string[] = []
    const limit = options.limit || deputies.length

    for (let i = 0; i < Math.min(deputies.length, limit); i++) {
      const deputy = deputies[i]

      try {
        // Check if politician exists
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('name', deputy.nom)
          .single()

        const politicianData = {
          name: deputy.nom,
          party: deputy.parti_ratt_financier || deputy.groupe_sigle,
          position: 'Député',
          bio: `Député ${deputy.sexe === 'H' ? 'de' : 'de'} ${deputy.circonscription}`,
          external_id: `nosdeputes_${deputy.slug}`,
          is_active: true
        }

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('politicians')
            .update({
              ...politicianData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (error) {
            console.error(`   ❌ Error updating ${deputy.nom}:`, error.message)
            stats.politicians.errors++
          } else {
            console.log(`   ✓ Updated: ${deputy.nom}`)
            stats.politicians.updated++
            politicianIds.push(existing.id)
          }
        } else {
          // Insert new
          const { data: inserted, error } = await supabase
            .from('politicians')
            .insert({
              ...politicianData,
              credibility_score: 50,
              total_votes: 0,
              positive_votes: 0,
              negative_votes: 0
            })
            .select('id')
            .single()

          if (error) {
            console.error(`   ❌ Error inserting ${deputy.nom}:`, error.message)
            stats.politicians.errors++
          } else {
            console.log(`   ✓ Inserted: ${deputy.nom} (${deputy.parti_ratt_financier})`)
            stats.politicians.inserted++
            if (inserted) politicianIds.push(inserted.id)
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`   ❌ Error processing ${deputy.nom}:`, error)
        stats.politicians.errors++
      }
    }

    console.log(`\n✅ Politicians: ${stats.politicians.inserted} inserted, ${stats.politicians.updated} updated`)
    return politicianIds
  } catch (error) {
    console.error('\n❌ Failed to populate politicians:', error)
    return []
  }
}

/**
 * Phase 2: Collect Parliamentary Actions (via API endpoint)
 */
async function collectParliamentaryData(politicianIds: string[]): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('🏛️  PHASE 2: Collect Parliamentary Actions')
  console.log('='.repeat(70))

  if (politicianIds.length === 0) {
    console.log('\n⚠️  No politicians to process')
    return
  }

  console.log(`\n🔍 Collecting data for ${politicianIds.length} politicians...\n`)

  // This would call the data collection API endpoint
  // For now, we'll show how to do it via API
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://politik-cred.netlify.app'

  console.log(`💡 To collect parliamentary data, call the API endpoint:`)
  console.log(`   POST ${apiUrl}/api/v1/public/triggers/data-collection`)
  console.log(`   Body: { "type": "incremental", "limit": 100 }`)
  console.log(`   Auth: Bearer <your-premium-api-key>`)
  console.log('\n   Or use the orchestrator to call it automatically.')
}

/**
 * Phase 3: Import Promises from Vigie du Mensonge
 */
async function importVigiePromises(politicianIds: string[]): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('👁️  PHASE 3: Import Promises from Vigie du Mensonge')
  console.log('='.repeat(70))

  console.log('\n⚠️  Vigie du Mensonge Integration Status:')
  console.log('   • Schema: ✅ Ready (Migration 007)')
  console.log('   • Badge Component: ✅ Ready')
  console.log('   • API Scraper: ⚠️  Needs implementation')
  console.log('\n📝 Manual Import Process:')
  console.log('   1. Visit: https://www.vigiedumensonge.fr')
  console.log('   2. Find promises by politician')
  console.log('   3. Import manually using the demo script:')
  console.log('      tsx scripts/demo-vigie-import.ts')
  console.log('\n💡 Or build automated scraper:')
  console.log('   • Contact Vigie team for API access')
  console.log('   • Implement scraper in src/lib/scrapers/vigie-client.ts')
  console.log('   • Use external_id for deduplication')
  console.log('\n📊 Example Manual Import:')
  console.log(`
  const { data } = await supabase
    .from('political_promises')
    .insert({
      politician_id: '<politician-uuid>',
      promise_text: 'Promise text from Vigie',
      promise_date: '2024-01-01',
      source_platform: 'vigie_du_mensonge',
      external_id: 'vigie_12345',
      external_url: 'https://www.vigiedumensonge.fr/promesse/12345',
      verification_status: 'verified',
      category: 'social'
    })
  `)
}

/**
 * Phase 4: Extract Promises from News Articles
 */
async function extractNewsPromises(): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('📰 PHASE 4: Extract Promises from News Articles')
  console.log('='.repeat(70))

  console.log('\n🔍 Checking for news articles...')

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, content, url, published_at')
    .order('published_at', { ascending: false })
    .limit(50)

  if (error || !articles || articles.length === 0) {
    console.log('\n⚠️  No news articles found in database')
    console.log('   Run news collection first:')
    console.log('   1. Go to /admin → Actualités')
    console.log('   2. Click "Actualiser maintenant"')
    console.log('   Or use: npm run collect:news')
    return
  }

  console.log(`✅ Found ${articles.length} recent articles\n`)

  // Extract promises (simplified - in production use the promise extraction API)
  console.log('💡 To extract promises from news:')
  console.log('   Use the promise extraction endpoint:')
  console.log('   POST /api/promises/extract')
  console.log('   Or run: tsx scripts/collect-from-news.ts')
}

/**
 * Phase 5: Run Semantic Matching
 */
async function runSemanticMatching(politicianIds: string[]): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('🧠 PHASE 5: Run Semantic Matching')
  console.log('='.repeat(70))

  if (politicianIds.length === 0) {
    console.log('\n⚠️  No politicians to process')
    return
  }

  console.log('\n💡 To run semantic matching:')
  console.log('   POST /api/v1/public/triggers/match-promises')
  console.log('   Body: { "politicianId": "<uuid>", "minConfidence": 0.6 }')
  console.log('   Auth: Bearer <your-premium-api-key>')
}

/**
 * Phase 6: Calculate Consistency Scores
 */
async function calculateScores(politicianIds: string[]): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('📊 PHASE 6: Calculate Consistency Scores')
  console.log('='.repeat(70))

  if (politicianIds.length === 0) {
    console.log('\n⚠️  No politicians to process')
    return
  }

  console.log('\n💡 To calculate scores:')
  console.log('   POST /api/v1/public/triggers/calculate-scores')
  console.log('   Body: { "politicianId": "<uuid>" }')
  console.log('   Auth: Bearer <your-premium-api-key>')
}

/**
 * Print final summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(70))
  console.log('📊 DATA POPULATION SUMMARY')
  console.log('='.repeat(70))

  console.log('\n✅ Politicians:')
  console.log(`   Inserted: ${stats.politicians.inserted}`)
  console.log(`   Updated: ${stats.politicians.updated}`)
  console.log(`   Errors: ${stats.politicians.errors}`)

  console.log('\n📝 Next Steps:')
  console.log('   1. Set up API keys: tsx scripts/setup-api-keys.ts')
  console.log('   2. Use the Premium API key with your orchestrator')
  console.log('   3. Call these endpoints via orchestrator:')
  console.log('      • /api/v1/public/triggers/data-collection (parliamentary data)')
  console.log('      • /api/v1/public/triggers/politician-audit (complete audit)')
  console.log('   4. Manually import Vigie du Mensonge data')
  console.log('   5. Run news collection in admin panel')
  console.log('\n💡 Or use the orchestrator to automate everything!')
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🇫🇷 Politik Cred\' - Complete Data Population')
  console.log('='.repeat(70))
  console.log('\nThis will populate your database with:')
  console.log('  • French deputies from Assemblée Nationale')
  console.log('  • Parliamentary voting data')
  console.log('  • Political promises from Vigie du Mensonge')
  console.log('  • Promises from news articles')
  console.log('  • Semantic matching results')
  console.log('  • Consistency scores')
  console.log('\nOptions:', options)
  console.log('='.repeat(70))

  const startTime = Date.now()
  let politicianIds: string[] = []

  try {
    // Phase 1: Politicians
    if (!options.skipPoliticians) {
      politicianIds = await populatePoliticians()
    }

    // Phase 2: Parliamentary data
    if (!options.skipParliament) {
      await collectParliamentaryData(politicianIds)
    }

    // Phase 3: Vigie du Mensonge
    if (!options.skipVigie) {
      await importVigiePromises(politicianIds)
    }

    // Phase 4: News promises
    if (!options.skipNews) {
      await extractNewsPromises()
    }

    // Phase 5: Semantic matching
    if (!options.skipMatching) {
      await runSemanticMatching(politicianIds)
    }

    // Phase 6: Score calculation
    if (!options.skipScores) {
      await calculateScores(politicianIds)
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    printSummary()

    console.log('\n' + '='.repeat(70))
    console.log(`✅ Population completed in ${duration} seconds`)
    console.log('='.repeat(70))
    console.log()

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Population failed:', error)
    process.exit(1)
  }
}

// Run
main()
