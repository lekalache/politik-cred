#!/usr/bin/env tsx
/**
 * Collect Promises from News Articles
 *
 * Extracts political promises from your existing news articles
 *
 * Usage:
 *   npm run collect:news
 *   or
 *   tsx scripts/collect-from-news.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Verify environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase environment variables not set')
  process.exit(1)
}

import { extractPromisesFromNews } from '../src/lib/scrapers/news-promise-extractor'

async function main() {
  console.log('🗞️  Promise Collection from News Articles')
  console.log('=' .repeat(60))
  console.log()

  // Configuration
  const LIMIT = parseInt(process.env.NEWS_ARTICLE_LIMIT || '100')
  const SINCE_DATE = process.env.SINCE_DATE // e.g., '2024-01-01'

  console.log(`Configuration:`)
  console.log(`  - Articles to process: ${LIMIT}`)
  if (SINCE_DATE) {
    console.log(`  - Since date: ${SINCE_DATE}`)
  }
  console.log()

  try {
    const results = await extractPromisesFromNews({
      limit: LIMIT,
      sinceDate: SINCE_DATE
    })

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Collection Summary')
    console.log('=' .repeat(60))

    const totalArticles = results.length
    const articlesWithPromises = results.filter(r => r.promisesFound > 0).length
    const totalPromisesFound = results.reduce((sum, r) => sum + r.promisesFound, 0)
    const totalPromisesStored = results.reduce((sum, r) => sum + r.promisesStored, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    console.log(`Total articles processed:       ${totalArticles}`)
    console.log(`Articles with promises:         ${articlesWithPromises}`)
    console.log(`Total promises found:           ${totalPromisesFound}`)
    console.log(`Total promises stored:          ${totalPromisesStored}`)
    console.log(`Total errors:                   ${totalErrors}`)

    // By politician
    console.log('\nBy Politician:')
    const byPolitician = new Map<string, { found: number; stored: number }>()

    results.forEach(r => {
      if (r.politicianName) {
        const existing = byPolitician.get(r.politicianName) || { found: 0, stored: 0 }
        byPolitician.set(r.politicianName, {
          found: existing.found + r.promisesFound,
          stored: existing.stored + r.promisesStored
        })
      }
    })

    Array.from(byPolitician.entries())
      .sort((a, b) => b[1].found - a[1].found)
      .forEach(([name, stats]) => {
        console.log(`  - ${name}: ${stats.stored} promises stored (${stats.found} found)`)
      })

    // Show some example articles with promises
    console.log('\nExample Articles with Promises:')
    results
      .filter(r => r.promisesFound > 0)
      .slice(0, 5)
      .forEach(r => {
        console.log(`  - "${r.articleTitle}"`)
        console.log(`    Politician: ${r.politicianName}`)
        console.log(`    Promises: ${r.promisesStored}/${r.promisesFound} stored`)
      })

    if (totalErrors > 0) {
      console.log('\n⚠️  Errors encountered:')
      results
        .filter(r => r.errors.length > 0)
        .slice(0, 5)
        .forEach(r => {
          console.log(`  - ${r.articleTitle}:`)
          r.errors.forEach(err => console.log(`      ${err}`))
        })
    }

    console.log('\n✅ Collection from news articles completed!')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
