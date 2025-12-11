/**
 * Audit Database Status
 * Shows what data we actually have for running politician audits
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function auditDatabaseStatus() {
  console.log('\n🔍 POLITICIAN AUDIT - DATABASE STATUS\n')
  console.log('='.repeat(60))

  // 1. Politicians
  const { data: politicians, count: politicianCount } = await supabase
    .from('politicians')
    .select('*', { count: 'exact' })

  console.log('\n📊 POLITICIANS')
  console.log(`Total: ${politicianCount}`)

  const withScore = politicians?.filter(p => p.ai_score !== null).length || 0
  const withoutScore = politicians?.filter(p => p.ai_score === null).length || 0
  console.log(`With AI Score: ${withScore}`)
  console.log(`Without AI Score: ${withoutScore}`)

  if (politicians && politicians.length > 0) {
    console.log('\nSample politicians:')
    politicians.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} (${p.party || 'No party'}) - AI Score: ${p.ai_score || 'N/A'}`)
    })
  }

  // 2. Political Promises
  const { count: promisesCount } = await supabase
    .from('political_promises')
    .select('*', { count: 'exact', head: true })

  const { count: promisesVerified } = await supabase
    .from('political_promises')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'verified')

  console.log('\n📝 POLITICAL PROMISES')
  console.log(`Total: ${promisesCount || 0}`)
  console.log(`Verified: ${promisesVerified || 0}`)
  console.log(`Unverified: ${(promisesCount || 0) - (promisesVerified || 0)}`)

  // 3. Parliamentary Actions
  const { count: actionsCount } = await supabase
    .from('parliamentary_actions')
    .select('*', { count: 'exact', head: true })

  const { data: actionsByType } = await supabase
    .from('parliamentary_actions')
    .select('action_type')

  const actionTypes = actionsByType?.reduce((acc: any, action) => {
    acc[action.action_type] = (acc[action.action_type] || 0) + 1
    return acc
  }, {})

  console.log('\n🏛️ PARLIAMENTARY ACTIONS')
  console.log(`Total: ${actionsCount || 0}`)
  if (actionTypes) {
    Object.entries(actionTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`)
    })
  }

  // 4. Promise Verifications (Matches)
  const { count: verificationsCount } = await supabase
    .from('promise_verifications')
    .select('*', { count: 'exact', head: true })

  const { data: verificationsByType } = await supabase
    .from('promise_verifications')
    .select('match_type')

  const matchTypes = verificationsByType?.reduce((acc: any, v) => {
    acc[v.match_type] = (acc[v.match_type] || 0) + 1
    return acc
  }, {})

  console.log('\n✅ PROMISE VERIFICATIONS')
  console.log(`Total: ${verificationsCount || 0}`)
  if (matchTypes) {
    Object.entries(matchTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`)
    })
  }

  // 5. Consistency Scores
  const { count: scoresCount } = await supabase
    .from('consistency_scores')
    .select('*', { count: 'exact', head: true })

  console.log('\n🎯 CONSISTENCY SCORES')
  console.log(`Total: ${scoresCount || 0}`)

  // 6. Data Collection Jobs
  const { data: jobs } = await supabase
    .from('data_collection_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5)

  console.log('\n⚙️ DATA COLLECTION JOBS (Last 5)')
  if (jobs && jobs.length > 0) {
    jobs.forEach(job => {
      console.log(`  - ${job.job_type}: ${job.status} (${job.records_collected || 0} records)`)
    })
  } else {
    console.log('  No jobs found')
  }

  // 7. Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📋 SUMMARY - CAN WE RUN AN AUDIT?')
  console.log('='.repeat(60))

  const canRunAudit = (politicianCount || 0) > 0 &&
                       (promisesCount || 0) > 0 &&
                       (actionsCount || 0) > 0

  if (canRunAudit) {
    console.log('✅ YES - We have the minimum data to run an audit')
    console.log(`\nNext steps:`)
    console.log(`1. Match ${promisesCount} promises to ${actionsCount} actions`)
    console.log(`2. Calculate consistency scores for ${politicianCount} politicians`)
    console.log(`3. Display results on /score page`)
  } else {
    console.log('❌ NO - Missing critical data:')
    if ((politicianCount || 0) === 0) console.log('   - No politicians in database')
    if ((promisesCount || 0) === 0) console.log('   - No promises extracted')
    if ((actionsCount || 0) === 0) console.log('   - No parliamentary actions collected')
    console.log(`\nNext steps:`)
    console.log(`1. Add politicians to database`)
    console.log(`2. Extract promises from sources (campaigns, interviews)`)
    console.log(`3. Collect parliamentary actions from Assemblée Nationale`)
  }

  console.log('\n')
}

auditDatabaseStatus().catch(console.error)
