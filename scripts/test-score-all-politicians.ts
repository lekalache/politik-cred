/**
 * Test: Calculate scores for ALL 70 politicians
 */

import { consistencyCalculator } from '../src/lib/promise-extraction/consistency-calculator'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function testScoreCalculation() {
  console.log('\n🧮 TESTING: Calculate Scores for ALL Politicians\n')
  console.log('='.repeat(80))

  try {
    console.log('Starting score calculation...')

    const result = await consistencyCalculator.calculateAllScores()

    console.log('\n✅ RESULTS:')
    console.log(`   Politicians updated: ${result.updated}`)
    console.log(`   Politicians failed: ${result.failed}`)
    console.log(`   Duration: ${result.duration}s`)

    console.log('\n' + '='.repeat(80))
    console.log('\n✨ Score calculation complete!')
    console.log('   All 70 politicians should now have AI scores')
    console.log('   Politicians without promises will have score = 0\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testScoreCalculation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
