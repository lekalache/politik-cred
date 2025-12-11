/**
 * Calculate Consistency Scores
 * Standalone script to calculate AI scores for all politicians with promises
 */

import { consistencyCalculator } from '@/lib/promise-extraction/consistency-calculator'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function calculateScores() {
  console.log('\n🔢 CALCULATING CONSISTENCY SCORES\n')
  console.log('='.repeat(60))

  try {
    const results = await consistencyCalculator.calculateAllScores()

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ SCORE CALCULATION COMPLETE!')
    console.log(`   Politicians updated: ${results.updated}`)
    console.log(`   Failed: ${results.failed}`)
    console.log(`   Duration: ${results.duration}s`)
    console.log('')
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    throw error
  }
}

calculateScores()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
