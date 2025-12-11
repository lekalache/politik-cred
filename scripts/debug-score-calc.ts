/**
 * Debug Score Calculation
 * Step-by-step debugging to understand query issues
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCalculation() {
  console.log('\n🐛 DEBUG SCORE CALCULATION\n')

  // Step 1: Get all promises
  const { data: promises, error: promisesError } = await supabase
    .from('political_promises')
    .select('politician_id')

  console.log('Step 1: Get all promises')
  console.log('  Total promises:', promises?.length || 0)
  if (promisesError) console.log('  Error:', promisesError)

  if (!promises || promises.length === 0) {
    console.log('  ❌ No promises found!')
    return
  }

  // Step 2: Get unique politician IDs
  const politicianIds = [...new Set(promises.map(p => p.politician_id))]
  console.log('\nStep 2: Get unique politician IDs')
  console.log('  Politicians with promises:', politicianIds.length)
  console.log('  First politician ID:', politicianIds[0])

  // Step 3: Get promises for first politician
  const testPoliticianId = politicianIds[0]
  const { data: politicianPromises, error: ppError } = await supabase
    .from('political_promises')
    .select('id, promise_text')
    .eq('politician_id', testPoliticianId)

  console.log('\nStep 3: Get promises for politician', testPoliticianId)
  console.log('  Promises:', politicianPromises?.length || 0)
  if (ppError) console.log('  Error:', ppError)

  if (politicianPromises && politicianPromises.length > 0) {
    console.log('  First promise:', politicianPromises[0].promise_text.substring(0, 60))
  }

  // Step 4: Get verifications for those promises
  const promiseIds = politicianPromises?.map(p => p.id) || []
  const { data: verifications, error: verError } = await supabase
    .from('promise_verifications')
    .select('*')
    .in('promise_id', promiseIds)

  console.log('\nStep 4: Get verifications for those promises')
  console.log('  Verifications:', verifications?.length || 0)
  if (verError) console.log('  Error:', verError)

  if (verifications && verifications.length > 0) {
    console.log('  First verification:')
    console.log('    promise_id:', verifications[0].promise_id)
    console.log('    action_id:', verifications[0].action_id)
    console.log('    match_type:', verifications[0].match_type)
    console.log('    verified_at:', verifications[0].verified_at)
    console.log('    is_disputed:', verifications[0].is_disputed)
  }

  // Step 5: Filter verified, non-disputed
  const validVerifications = verifications?.filter(v =>
    v.verified_at !== null && v.is_disputed === false
  ) || []

  console.log('\nStep 5: Filter verified, non-disputed')
  console.log('  Valid verifications:', validVerifications.length)

  if (validVerifications.length > 0) {
    const kept = validVerifications.filter(v => v.match_type === 'kept').length
    const broken = validVerifications.filter(v => v.match_type === 'broken').length
    const partial = validVerifications.filter(v => v.match_type === 'partial').length

    console.log('  Kept:', kept)
    console.log('  Broken:', broken)
    console.log('  Partial:', partial)

    const total = kept + broken + partial
    const score = total > 0 ? (kept * 100 + partial * 50) / total : 0

    console.log('\n  Calculated score:', score)
  }
}

debugCalculation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
