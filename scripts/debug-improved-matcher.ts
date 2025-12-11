/**
 * Debug Improved Matcher
 * Find out why no matches are being found
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('\n🐛 DEBUG IMPROVED MATCHER\n')

  // Find Marine Le Pen
  const { data: mlp } = await supabase
    .from('politicians')
    .select('id, name')
    .ilike('name', '%Marine Le Pen%')
    .single()

  console.log(`Politician: ${mlp?.name} (${mlp?.id})`)

  // Check promises
  const { data: allPromises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('politician_id', mlp!.id)

  console.log(`\nTotal promises: ${allPromises?.length || 0}`)

  if (allPromises && allPromises.length > 0) {
    console.log('Promise statuses:')
    allPromises.forEach(p => {
      console.log(`  - ${p.verification_status}: ${p.promise_text.substring(0, 60)}...`)
    })
  }

  // Check pending promises specifically
  const { data: pendingPromises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('politician_id', mlp!.id)
    .eq('verification_status', 'pending')

  console.log(`\nPending promises: ${pendingPromises?.length || 0}`)

  // Check votes
  const { data: votes } = await supabase
    .from('parliamentary_actions')
    .select('*')
    .eq('politician_id', mlp!.id)
    .eq('action_type', 'vote')

  console.log(`Votes: ${votes?.length || 0}`)

  // Try resetting
  console.log('\n🔄 Resetting all promises to pending...')
  const { error: resetError } = await supabase
    .from('political_promises')
    .update({ verification_status: 'pending' })
    .eq('politician_id', mlp!.id)

  if (resetError) {
    console.error('Reset error:', resetError)
  } else {
    console.log('✅ Reset successful')

    // Check again
    const { data: afterReset } = await supabase
      .from('political_promises')
      .select('verification_status')
      .eq('politician_id', mlp!.id)
      .eq('verification_status', 'pending')

    console.log(`Pending promises after reset: ${afterReset?.length || 0}`)
  }
}

debug()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
