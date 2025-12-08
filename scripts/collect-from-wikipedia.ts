#!/usr/bin/env tsx
/**
 * Collect Promises from Wikipedia
 *
 * Extracts political promises from Wikipedia pages about French politicians
 *
 * Usage:
 *   npm run collect:wikipedia
 *   or
 *   tsx scripts/collect-from-wikipedia.ts [politician-name]
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

import {
  extractPromisesFromWikipedia,
  extractPromisesFromWikipediaForAll
} from '../src/lib/scrapers/wikipedia-promise-scraper'

// Default list of French politicians to scrape
const DEFAULT_POLITICIANS = [
  'Emmanuel Macron',
  'Marine Le Pen',
  'Jean-Luc Mélenchon',
  'François Bayrou',
  'Gabriel Attal',
  'Jordan Bardella',
  'Édouard Philippe',
  'Olivier Faure',
  'Mathilde Panot',
  'Fabien Roussel',
  'Bruno Le Maire',
  'Éric Ciotti',
  'Yannick Jadot'
]

async function main() {
  console.log('📚 Promise Collection from Wikipedia')
  console.log('=' .repeat(60))
  console.log()

  // Check if specific politician was provided as argument
  const specificPolitician = process.argv[2]

  if (specificPolitician) {
    console.log(`Processing single politician: ${specificPolitician}`)
    console.log()

    const result = await extractPromisesFromWikipedia(specificPolitician)

    console.log('\n' + '='.repeat(60))
    console.log('📊 Results')
    console.log('=' .repeat(60))
    console.log(`Politician:           ${result.politicianName}`)
    console.log(`Wikipedia pages:      ${result.wikipediaPages.length}`)
    console.log(`Promises found:       ${result.promisesFound}`)
    console.log(`Promises stored:      ${result.promisesStored}`)

    if (result.wikipediaPages.length > 0) {
      console.log('\nPages processed:')
      result.wikipediaPages.forEach(page => console.log(`  - ${page}`))
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:')
      result.errors.forEach(err => console.log(`  - ${err}`))
    }

    console.log('\n✅ Collection completed!')
    process.exit(0)
  }

  // Process all politicians
  console.log(`Processing ${DEFAULT_POLITICIANS.length} politicians...`)
  console.log()

  const results = await extractPromisesFromWikipediaForAll(DEFAULT_POLITICIANS)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Collection Summary')
  console.log('=' .repeat(60))

  const totalPages = results.reduce((sum, r) => sum + r.wikipediaPages.length, 0)
  const totalPromisesFound = results.reduce((sum, r) => sum + r.promisesFound, 0)
  const totalPromisesStored = results.reduce((sum, r) => sum + r.promisesStored, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  console.log(`Politicians processed:          ${results.length}`)
  console.log(`Wikipedia pages processed:      ${totalPages}`)
  console.log(`Total promises found:           ${totalPromisesFound}`)
  console.log(`Total promises stored:          ${totalPromisesStored}`)
  console.log(`Total errors:                   ${totalErrors}`)

  console.log('\nResults by Politician:')
  results
    .sort((a, b) => b.promisesStored - a.promisesStored)
    .forEach(r => {
      console.log(`  ${r.politicianName}:`)
      console.log(`    Pages: ${r.wikipediaPages.length}`)
      console.log(`    Promises: ${r.promisesStored} stored (${r.promisesFound} found)`)
    })

  if (totalErrors > 0) {
    console.log('\n⚠️  Errors encountered:')
    results
      .filter(r => r.errors.length > 0)
      .forEach(r => {
        console.log(`  ${r.politicianName}:`)
        r.errors.slice(0, 3).forEach(err => console.log(`    - ${err}`))
      })
  }

  console.log('\n✅ Collection from Wikipedia completed!')
  console.log('\n💡 Tip: Run with a politician name to process only that person:')
  console.log('   npm run collect:wikipedia "Emmanuel Macron"')

  process.exit(0)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
