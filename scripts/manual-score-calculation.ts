/**
 * Manual Score Calculation
 * Direct calculation without complex queries
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function calculateAndStoreScores() {
  console.log('\n🔢 MANUAL SCORE CALCULATION\n')
  console.log('='.repeat(60))

  // Get all promises
  const { data: allPromises } = await supabase
    .from('political_promises')
    .select('id, politician_id, promise_text')

  if (!allPromises || allPromises.length === 0) {
    console.log('❌ No promises found')
    return
  }

  // Get unique politician IDs
  const politicianIds = [...new Set(allPromises.map(p => p.politician_id))]
  console.log(`Found ${politicianIds.length} politicians with promises\n`)

  let updated = 0

  for (const politicianId of politicianIds) {
    console.log(`\nProcessing politician: ${politicianId}`)

    // Get promises for this politician
    const politicianPromises = allPromises.filter(p => p.politician_id === politicianId)
    const promiseIds = politicianPromises.map(p => p.id)

    console.log(`  Promises: ${politicianPromises.length}`)

    // Get verifications
    const { data: verifications } = await supabase
      .from('promise_verifications')
      .select('*')
      .in('promise_id', promiseIds)
      .not('action_id', 'is', null)
      .not('verified_at', 'is', null)
      .eq('is_disputed', false)

    if (!verifications || verifications.length === 0) {
      console.log('  ⚠️ No valid verifications')
      continue
    }

    console.log(`  Valid verifications: ${verifications.length}`)

    // Count by type
    const kept = verifications.filter(v => v.match_type === 'kept').length
    const broken = verifications.filter(v => v.match_type === 'broken').length
    const partial = verifications.filter(v => v.match_type === 'partial').length
    const pending = verifications.filter(v => v.match_type === 'pending').length
    const total = kept + broken + partial

    // Calculate score
    const score = total > 0 ? (kept * 100 + partial * 50) / total : 0

    console.log(`    Kept: ${kept}, Broken: ${broken}, Partial: ${partial}, Pending: ${pending}`)
    console.log(`    Score: ${score.toFixed(2)}`)

    // Get voting data for attendance
    const { data: votes } = await supabase
      .from('parliamentary_actions')
      .select('vote_position')
      .eq('politician_id', politicianId)
      .eq('action_type', 'vote')

    const totalVotes = votes?.length || 0
    const attended = votes?.filter(v => v.vote_position !== 'absent').length || 0
    const attendanceRate = totalVotes > 0 ? (attended / totalVotes) * 100 : null

    console.log(`    Attendance: ${attended}/${totalVotes} = ${attendanceRate?.toFixed(2) || 'N/A'}%`)

    // Store in consistency_scores table
    const { error: scoreError } = await supabase
      .from('consistency_scores')
      .upsert({
        politician_id: politicianId,
        overall_score: Math.round(score * 100) / 100,
        promises_kept: kept,
        promises_broken: broken,
        promises_partial: partial,
        promises_pending: pending,
        attendance_rate: attendanceRate ? Math.round(attendanceRate * 100) / 100 : null,
        sessions_attended: attended,
        sessions_scheduled: totalVotes,
        legislative_activity_score: null,
        bills_sponsored: 0,
        amendments_proposed: 0,
        debates_participated: 0,
        questions_asked: 0,
        data_quality_score: 0.5,
        last_calculated_at: new Date().toISOString()
      }, {
        onConflict: 'politician_id'
      })

    if (scoreError) {
      console.error('  ❌ Error storing score:', scoreError.message)
      continue
    }

    // Update politicians table
    const { error: politicianError } = await supabase
      .from('politicians')
      .update({
        ai_score: Math.round(score),
        ai_last_audited_at: new Date().toISOString()
      })
      .eq('id', politicianId)

    if (politicianError) {
      console.error('  ❌ Error updating politician:', politicianError.message)
      continue
    }

    console.log('  ✅ Score calculated and stored')
    updated++
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ SCORE CALCULATION COMPLETE!`)
  console.log(`   Politicians updated: ${updated}`)
  console.log('')
}

calculateAndStoreScores()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
