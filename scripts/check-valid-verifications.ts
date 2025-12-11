/**
 * Check Valid Verifications
 * Find verifications with action_id not null
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkValidVerifications() {
  console.log('\n🔍 CHECKING VALID VERIFICATIONS\n')

  // Get verifications with action_id not null
  const { data: validVerifications } = await supabase
    .from('promise_verifications')
    .select('*')
    .not('action_id', 'is', null)

  console.log(`Valid verifications (with action_id): ${validVerifications?.length || 0}`)

  if (validVerifications && validVerifications.length > 0) {
    console.log('\nVerifications:')
    validVerifications.forEach((v, i) => {
      console.log(`\n${i + 1}.`, {
        promise_id: v.promise_id,
        action_id: v.action_id,
        match_type: v.match_type,
        match_confidence: v.match_confidence,
        verification_method: v.verification_method
      })
    })

    // Get promises for these verifications
    const promiseIds = validVerifications.map(v => v.promise_id)
    const { data: promises } = await supabase
      .from('political_promises')
      .select('id, politician_id, promise_text')
      .in('id', promiseIds)

    console.log('\n\nPromises for these verifications:')
    promises?.forEach(p => {
      const verification = validVerifications.find(v => v.promise_id === p.id)
      console.log(`\n- Politician: ${p.politician_id}`)
      console.log(`  Promise: ${p.promise_text.substring(0, 80)}...`)
      console.log(`  Match type: ${verification?.match_type}`)
    })

    // Group by politician
    const politicianIds = [...new Set(promises?.map(p => p.politician_id) || [])]
    console.log(`\n\nPoliticians with valid verifications: ${politicianIds.length}`)

    for (const politicianId of politicianIds) {
      const politicianPromises = promises?.filter(p => p.politician_id === politicianId) || []
      const politicianVerifications = validVerifications.filter(v =>
        politicianPromises.some(p => p.id === v.promise_id)
      )

      const kept = politicianVerifications.filter(v => v.match_type === 'kept').length
      const broken = politicianVerifications.filter(v => v.match_type === 'broken').length
      const partial = politicianVerifications.filter(v => v.match_type === 'partial').length
      const total = kept + broken + partial
      const score = total > 0 ? (kept * 100 + partial * 50) / total : 0

      console.log(`\n  ${politicianId}:`)
      console.log(`    Kept: ${kept}, Broken: ${broken}, Partial: ${partial}`)
      console.log(`    Score: ${score.toFixed(2)}`)
    }
  }
}

checkValidVerifications()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
