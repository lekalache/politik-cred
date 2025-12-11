/**
 * Diagnose why only 11/70 politicians have AI scores
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('\n🔍 DIAGNOSING SCORING COVERAGE\n')
  console.log('='.repeat(80))

  // 1. Count total politicians
  const { count: totalPoliticians } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 POLITICIANS:`)
  console.log(`   Total in database: ${totalPoliticians}`)

  // 2. Count politicians with AI scores
  const { count: withScores } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })
    .not('ai_score', 'is', null)

  console.log(`   With AI scores: ${withScores}`)
  console.log(`   Missing AI scores: ${(totalPoliticians || 0) - (withScores || 0)}`)

  // 3. Count promises per politician
  const { data: allPromises } = await supabase
    .from('political_promises')
    .select('politician_id')

  const promisesByPolitician = allPromises?.reduce((acc: any, p) => {
    acc[p.politician_id] = (acc[p.politician_id] || 0) + 1
    return acc
  }, {})

  const politiciansWithPromises = Object.keys(promisesByPolitician || {}).length
  const totalPromises = allPromises?.length || 0

  console.log(`\n📝 PROMISES:`)
  console.log(`   Total promises: ${totalPromises}`)
  console.log(`   Politicians with promises: ${politiciansWithPromises}`)
  console.log(`   Politicians without promises: ${(totalPoliticians || 0) - politiciansWithPromises}`)

  // 4. Count parliamentary actions per politician
  const { data: allActions } = await supabase
    .from('parliamentary_actions')
    .select('politician_id')

  const actionsByPolitician = allActions?.reduce((acc: any, a) => {
    acc[a.politician_id] = (acc[a.politician_id] || 0) + 1
    return acc
  }, {})

  const politiciansWithActions = Object.keys(actionsByPolitician || {}).length
  const totalActions = allActions?.length || 0

  console.log(`\n🏛️  PARLIAMENTARY ACTIONS:`)
  console.log(`   Total actions: ${totalActions}`)
  console.log(`   Politicians with actions: ${politiciansWithActions}`)
  console.log(`   Politicians without actions: ${(totalPoliticians || 0) - politiciansWithActions}`)

  // 5. Count verifications (promise matches)
  const { count: totalVerifications } = await supabase
    .from('promise_verifications')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✅ VERIFICATIONS (Promise Matches):`)
  console.log(`   Total verifications: ${totalVerifications}`)

  // 6. Count consistency scores
  const { count: totalScores } = await supabase
    .from('consistency_scores')
    .select('*', { count: 'exact', head: true })

  console.log(`\n🧮 CONSISTENCY SCORES:`)
  console.log(`   Total scores calculated: ${totalScores}`)

  // 7. Show sample politicians WITHOUT scores
  const { data: withoutScores } = await supabase
    .from('politicians')
    .select('id, name, party')
    .is('ai_score', null)
    .limit(10)

  console.log(`\n❌ SAMPLE POLITICIANS WITHOUT AI SCORES (10/${(totalPoliticians || 0) - (withScores || 0)}):`)
  withoutScores?.forEach((pol, i) => {
    console.log(`   ${i + 1}. ${pol.name} (${pol.party || 'No party'})`)
  })

  // 8. Check if they have promises or actions
  console.log(`\n🔍 CHECKING DATA FOR UNSCORED POLITICIANS:`)
  for (const pol of (withoutScores || []).slice(0, 5)) {
    const promiseCount = promisesByPolitician?.[pol.id] || 0
    const actionCount = actionsByPolitician?.[pol.id] || 0

    console.log(`   ${pol.name}:`)
    console.log(`      Promises: ${promiseCount}`)
    console.log(`      Actions: ${actionCount}`)
  }

  // 9. Analysis
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 DIAGNOSIS:\n')

  if (politiciansWithPromises === 0 && politiciansWithActions === 0) {
    console.log('❌ CRITICAL: No promises OR actions in database!')
    console.log('   The data collection step is not working.')
    console.log('   Fix: Check /api/data-collection/collect endpoint\n')
  } else if (politiciansWithPromises === 0) {
    console.log('⚠️  No promises in database')
    console.log('   Without promises, we cannot calculate consistency scores.')
    console.log('   Fix: Run promise extraction on politician data\n')
  } else if (politiciansWithActions === 0) {
    console.log('⚠️  No parliamentary actions in database')
    console.log('   Without actions, we cannot verify promises.')
    console.log('   Fix: Run data collection from Assemblée Nationale API\n')
  } else if (totalVerifications === 0) {
    console.log('⚠️  No promise verifications exist')
    console.log('   Promises and actions exist but are not matched.')
    console.log('   Fix: Run /api/promises/match endpoint\n')
  } else if ((withScores || 0) < politiciansWithPromises) {
    console.log(`✅ System is working but incomplete:`)
    console.log(`   - ${politiciansWithPromises} politicians have promises`)
    console.log(`   - ${withScores} politicians have scores`)
    console.log(`   - ${(politiciansWithPromises || 0) - (withScores || 0)} politicians need scoring`)
    console.log(`\n   Fix: Run /api/promises/calculate-scores with "all: true"\n`)
  } else {
    console.log('⚠️  Most politicians have no promise data yet')
    console.log(`   Only ${politiciansWithPromises}/${totalPoliticians} have promises`)
    console.log(`   The remaining ${(totalPoliticians || 0) - politiciansWithPromises} need data collection.\n`)
  }

  console.log()
}

diagnose()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
