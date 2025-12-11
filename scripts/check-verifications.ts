/**
 * Check Promise Verifications
 * Debug script to see what's in the database
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkVerifications() {
  console.log('\n🔍 CHECKING VERIFICATIONS\n')

  // Check total verifications
  const { data: allVerifications, count } = await supabase
    .from('promise_verifications')
    .select('*', { count: 'exact' })

  console.log(`Total verifications: ${count}`)

  if (allVerifications && allVerifications.length > 0) {
    console.log('\nFirst few verifications:')
    allVerifications.slice(0, 5).forEach((v, i) => {
      console.log(`\n${i + 1}.`, {
        promise_id: v.promise_id,
        action_id: v.action_id,
        match_type: v.match_type,
        verified_at: v.verified_at,
        is_disputed: v.is_disputed,
        verification_method: v.verification_method
      })
    })
  }

  // Check promises with verifications
  const { data: promises } = await supabase
    .from('political_promises')
    .select('id, politician_id, promise_text')

  console.log(`\nTotal promises: ${promises?.length || 0}`)

  // Find which politicians have promises
  const politicianIds = [...new Set(promises?.map(p => p.politician_id) || [])]
  console.log(`Politicians with promises: ${politicianIds.length}`)
}

checkVerifications()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
