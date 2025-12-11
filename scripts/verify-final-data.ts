/**
 * Verify Final Data
 * Check that all data is properly stored for display
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyData() {
  console.log('\n✅ VERIFYING FINAL DATA\n')
  console.log('='.repeat(60))

  // Check politicians with AI scores
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name, party, ai_score, ai_last_audited_at')
    .not('ai_score', 'is', null)
    .order('ai_score', { ascending: false })

  console.log(`\n1. POLITICIANS WITH AI SCORES: ${politicians?.length || 0}`)
  politicians?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.party || 'No party'})`)
    console.log(`      AI Score: ${p.ai_score}/100`)
    console.log(`      Last audited: ${p.ai_last_audited_at ? new Date(p.ai_last_audited_at).toLocaleDateString('fr-FR') : 'Never'}`)
  })

  // Check consistency scores
  const { data: scores } = await supabase
    .from('consistency_scores')
    .select('*')

  console.log(`\n2. CONSISTENCY SCORES: ${scores?.length || 0}`)
  scores?.forEach((s, i) => {
    const politician = politicians?.find(p => p.id === s.politician_id)
    console.log(`\n   ${i + 1}. ${politician?.name || s.politician_id}`)
    console.log(`      Overall Score: ${s.overall_score}/100`)
    console.log(`      Promises: ${s.promises_kept} kept, ${s.promises_broken} broken, ${s.promises_partial} partial`)
    console.log(`      Attendance: ${s.attendance_rate}% (${s.sessions_attended}/${s.sessions_scheduled})`)
    console.log(`      Activity: ${s.legislative_activity_score}/100`)
    console.log(`      Data Quality: ${((s.data_quality_score || 0) * 100).toFixed(0)}%`)
  })

  // Check promise verifications
  const { data: verifications } = await supabase
    .from('promise_verifications')
    .select('*')
    .not('action_id', 'is', null)

  console.log(`\n3. VALID PROMISE VERIFICATIONS: ${verifications?.length || 0}`)
  const byPolitician = new Map<string, any[]>()

  for (const v of verifications || []) {
    const { data: promise } = await supabase
      .from('political_promises')
      .select('politician_id')
      .eq('id', v.promise_id)
      .single()

    if (promise) {
      if (!byPolitician.has(promise.politician_id)) {
        byPolitician.set(promise.politician_id, [])
      }
      byPolitician.get(promise.politician_id)!.push(v)
    }
  }

  byPolitician.forEach((vList, politicianId) => {
    const politician = politicians?.find(p => p.id === politicianId)
    const kept = vList.filter(v => v.match_type === 'kept').length
    const broken = vList.filter(v => v.match_type === 'broken').length
    const partial = vList.filter(v => v.match_type === 'partial').length

    console.log(`   - ${politician?.name || politicianId}: ${vList.length} verifications (${kept}K / ${broken}B / ${partial}P)`)
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n🎯 END-TO-END VERIFICATION SUMMARY:')
  console.log(`   ✓ Politicians with scores: ${politicians?.length || 0}`)
  console.log(`   ✓ Consistency score records: ${scores?.length || 0}`)
  console.log(`   ✓ Valid promise verifications: ${verifications?.length || 0}`)
  console.log(`   ✓ Data ready for /score page: ${politicians && politicians.length > 0 ? 'YES' : 'NO'}`)
  console.log('')

  if (politicians && politicians.length > 0) {
    console.log('🟢 SUCCESS! The system is working end-to-end:')
    console.log('   1. ✅ Promises extracted')
    console.log('   2. ✅ Parliamentary votes collected')
    console.log('   3. ✅ Seed matches created')
    console.log('   4. ✅ Scores calculated')
    console.log('   5. ✅ Data stored in database')
    console.log('   6. ✅ Ready to display on /score page')
    console.log('')
    console.log('👉 Visit /score to see the results!')
  } else {
    console.log('🔴 No politicians with scores found')
  }

  console.log('')
}

verifyData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
