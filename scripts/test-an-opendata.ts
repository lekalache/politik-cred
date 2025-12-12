/**
 * Test script for Assemblée Nationale Open Data collection
 * Tests the new ZIP-based data collection approach
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { assembleeOpendataClient } from '../src/lib/scrapers/assemblee-opendata-client'

async function main() {
  console.log('🧪 Testing Assemblée Nationale Open Data collection...\n')

  try {
    // Run full collection (all 4755 scrutins)
    const result = await assembleeOpendataClient.collectAllData({ limit: 4755 })

    console.log('\n📊 Test Results:')
    console.log(`   Deputies loaded: ${result.deputies}`)
    console.log(`   Scrutins processed: ${result.scrutins}`)
    console.log(`   Votes stored: ${result.votes}`)
    console.log(`   Errors: ${result.errors}`)

    if (result.votes > 0) {
      console.log('\n✅ SUCCESS: Vote data collection is working!')
    } else if (result.deputies > 0 && result.scrutins > 0) {
      console.log('\n⚠️ PARTIAL: Deputies and scrutins loaded but no votes matched to politicians.')
      console.log('   This might mean politicians need to be imported from RNE first.')
    } else {
      console.log('\n❌ ISSUE: Data collection may have problems.')
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error)
  }
}

main()
