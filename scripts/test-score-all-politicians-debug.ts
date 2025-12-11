/**
 * Test: Calculate scores for ALL 70 politicians (with debug logging)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testWithDebug() {
  console.log('\n🔍 DEBUG: Checking database state\n')
  console.log('='.repeat(80))

  // 1. Check politicians count
  const { data: allPols, count: totalCount } = await supabase
    .from('politicians')
    .select('id', { count: 'exact' })

  console.log(`\n📊 Total politicians in database: ${totalCount}`)
  console.log(`   Politicians array length: ${allPols?.length}`)

  if (allPols && allPols.length > 0) {
    console.log(`   First 5 politician IDs:`)
    allPols.slice(0, 5).forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.id}`)
    })
  }

  // 2. Check promises
  const { data: promises } = await supabase
    .from('political_promises')
    .select('politician_id')

  const politiciansWithPromises = promises
    ? [...new Set(promises.map(p => p.politician_id))].length
    : 0

  console.log(`\n📝 Promises:`)
  console.log(`   Total promises: ${promises?.length || 0}`)
  console.log(`   Politicians with promises: ${politiciansWithPromises}`)

  // 3. Now call the calculator
  console.log(`\n🧮 Calling score calculator...`)

  const { consistencyCalculator } = await import('../src/lib/promise-extraction/consistency-calculator')

  const result = await consistencyCalculator.calculateAllScores()

  console.log('\n✅ RESULTS:')
  console.log(`   Politicians updated: ${result.updated}`)
  console.log(`   Politicians failed: ${result.failed}`)
  console.log(`   Duration: ${result.duration}s`)

  // 4. Check updated count
  const { count: scoredCount } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })
    .not('ai_score', 'is', null)

  console.log(`\n📊 After calculation:`)
  console.log(`   Politicians with AI scores: ${scoredCount}`)

  console.log('\n' + '='.repeat(80))
}

testWithDebug()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
