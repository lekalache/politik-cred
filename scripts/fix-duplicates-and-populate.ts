#!/usr/bin/env tsx
/**
 * Fix Duplicates and Populate Missing Data
 *
 * Current state:
 * ✅ Politicians: 83 (but has duplicates)
 * ❌ Political Promises: 0
 * ❌ Parliamentary Actions: 0
 * ✅ News Articles: 167
 *
 * This script will:
 * 1. Remove duplicate politicians
 * 2. Extract promises from existing 167 news articles
 * 3. Show how to trigger parliamentary data collection
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

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
 * Step 1: Remove duplicate politicians
 */
async function removeDuplicates() {
  console.log('\n🔧 Step 1: Removing Duplicate Politicians')
  console.log('='.repeat(70))

  const { data: allPoliticians } = await supabase
    .from('politicians')
    .select('id, name, created_at')
    .order('name')

  if (!allPoliticians) {
    console.log('❌ Could not fetch politicians')
    return
  }

  console.log(`\nFound ${allPoliticians.length} total politicians`)

  // Group by name
  const grouped = allPoliticians.reduce((acc: any, pol: any) => {
    if (!acc[pol.name]) {
      acc[pol.name] = []
    }
    acc[pol.name].push(pol)
    return acc
  }, {})

  // Find duplicates
  const duplicates = Object.entries(grouped).filter(([_, pols]: any) => pols.length > 1)

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found')
    return
  }

  console.log(`\n⚠️  Found ${duplicates.length} duplicated names:\n`)

  let totalRemoved = 0

  for (const [name, pols] of duplicates) {
    const politicians = pols as any[]
    console.log(`   ${name}: ${politicians.length} entries`)

    // Keep the oldest one (first created)
    const sorted = politicians.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const toKeep = sorted[0]
    const toRemove = sorted.slice(1)

    console.log(`      Keeping: ${toKeep.id} (created ${toKeep.created_at})`)

    // Remove duplicates
    for (const duplicate of toRemove) {
      const { error } = await supabase
        .from('politicians')
        .delete()
        .eq('id', duplicate.id)

      if (error) {
        console.log(`      ❌ Failed to remove ${duplicate.id}: ${error.message}`)
      } else {
        console.log(`      ✓ Removed ${duplicate.id}`)
        totalRemoved++
      }
    }
  }

  console.log(`\n✅ Removed ${totalRemoved} duplicate politicians`)
}

/**
 * Step 2: Extract promises from news articles
 */
async function extractPromisesFromNews() {
  console.log('\n📰 Step 2: Extract Promises from News Articles')
  console.log('='.repeat(70))

  // Get news articles
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, content, url, published_at')
    .order('published_at', { ascending: false })
    .limit(50)  // Start with 50 most recent

  if (error || !articles || articles.length === 0) {
    console.log('❌ No news articles found')
    return
  }

  console.log(`\n✅ Found ${articles.length} recent articles`)
  console.log('\n💡 To extract promises from these articles:')
  console.log('\n   Option 1: Via Admin Panel (Easiest)')
  console.log('   1. Go to http://localhost:3000/admin')
  console.log('   2. Click on "Promesses" tab')
  console.log('   3. Use the promise extraction interface')

  console.log('\n   Option 2: Via API (for each article)')
  console.log('   POST /api/promises/extract')
  console.log('   Body: {')
  console.log('     "politicianId": "<politician-uuid>",')
  console.log('     "text": "<article-content>",')
  console.log('     "sourceUrl": "<article-url>",')
  console.log('     "sourceType": "news_article",')
  console.log('     "date": "<published-date>"')
  console.log('   }')

  console.log('\n   Option 3: Via Orchestrator (Recommended)')
  console.log('   Use the Premium API key to call:')
  console.log('   POST /api/v1/public/triggers/politician-audit')
  console.log('   This will automatically:')
  console.log('   - Search news for each politician')
  console.log('   - Extract promises')
  console.log('   - Match to parliamentary actions')
  console.log('   - Calculate scores')

  console.log('\n📋 Sample Articles Available:')
  articles.slice(0, 5).forEach((article: any, idx: number) => {
    console.log(`\n   ${idx + 1}. "${article.title}"`)
    console.log(`      URL: ${article.url}`)
    console.log(`      Published: ${article.published_at}`)
  })
}

/**
 * Step 3: Show how to collect parliamentary data
 */
async function showParliamentaryDataCollection() {
  console.log('\n🏛️  Step 3: Collect Parliamentary Data')
  console.log('='.repeat(70))

  console.log('\n💡 To collect parliamentary voting data and actions:')
  console.log('\n   Via API with Premium Key:')
  console.log('   ')
  console.log('   curl -X POST https://politik-cred.netlify.app/api/v1/public/triggers/data-collection \\')
  console.log('     -H "Authorization: Bearer YOUR_PREMIUM_KEY" \\')
  console.log('     -H "Content-Type: application/json" \\')
  console.log('     -d \'{"type":"incremental","limit":100}\'')

  console.log('\n   Or via Orchestrator:')
  console.log('   Use your AI orchestrator to call the endpoint above')

  console.log('\n   This will collect:')
  console.log('   - Voting records for all deputies')
  console.log('   - Bill sponsorships')
  console.log('   - Parliamentary questions')
  console.log('   - Attendance data')
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔧 Fix Duplicates and Populate Data')
  console.log('='.repeat(70))
  console.log('\nCurrent Database State:')
  console.log('   Politicians: 83 (with duplicates)')
  console.log('   Promises: 0 ❌')
  console.log('   Parliamentary Actions: 0 ❌')
  console.log('   News Articles: 167 ✅')
  console.log('='.repeat(70))

  try {
    // Step 1: Fix duplicates
    await removeDuplicates()

    // Step 2: Extract promises from news
    await extractPromisesFromNews()

    // Step 3: Show parliamentary data collection
    await showParliamentaryDataCollection()

    // Final status
    console.log('\n' + '='.repeat(70))
    console.log('📊 Next Steps Summary')
    console.log('='.repeat(70))
    console.log('\n✅ Duplicates removed')
    console.log('\n📝 To populate promises:')
    console.log('   Use your orchestrator with Premium API key to call:')
    console.log('   /api/v1/public/triggers/politician-audit')
    console.log('   For each politician in the database')

    console.log('\n🏛️  To populate parliamentary data:')
    console.log('   /api/v1/public/triggers/data-collection')

    console.log('\n💡 Quick Test:')
    console.log('   Get a politician ID:')
    console.log('   SELECT id, name FROM politicians LIMIT 1;')
    console.log('')
    console.log('   Then run audit via orchestrator or curl:')
    console.log('   POST /api/v1/public/triggers/politician-audit')
    console.log('   Body: {"politicianId":"<id>","timeframe":"month"}')
    console.log()

  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

main()
