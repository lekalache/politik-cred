/**
 * Test Improved Matcher
 * Test the new semantic matching algorithm
 */

import { improvedMatcher } from '@/lib/promise-extraction/improved-semantic-matcher'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testMatcher() {
  console.log('\n🧪 TESTING IMPROVED MATCHER\n')
  console.log('='.repeat(60))

  // Find Marine Le Pen
  const { data: mlp } = await supabase
    .from('politicians')
    .select('id, name')
    .ilike('name', '%Marine Le Pen%')
    .single()

  if (!mlp) {
    console.log('Marine Le Pen not found')
    return
  }

  console.log(`Testing with: ${mlp.name}`)

  // Reset promises to pending for testing
  console.log('\nResetting promises to pending status...')
  await supabase
    .from('political_promises')
    .update({ verification_status: 'pending' })
    .eq('politician_id', mlp.id)

  // Run improved matcher
  console.log('\nRunning improved matcher with 8% threshold...')
  const matches = await improvedMatcher.matchPromisesToVotes(mlp.id, 0.08)

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ RESULTS: ${matches.length} matches found`)

  if (matches.length > 0) {
    console.log('\nMatches by type:')
    const kept = matches.filter(m => m.matchType === 'kept').length
    const broken = matches.filter(m => m.matchType === 'broken').length
    const partial = matches.filter(m => m.matchType === 'partial').length

    console.log(`   Kept: ${kept}`)
    console.log(`   Broken: ${broken}`)
    console.log(`   Partial: ${partial}`)

    console.log('\nTop matches:')
    matches.slice(0, 5).forEach((m, i) => {
      console.log(`\n${i + 1}. ${m.matchType.toUpperCase()} (${(m.similarity * 100).toFixed(1)}%)`)
      console.log(`   Promise: ${m.promise.promise_text.substring(0, 80)}...`)
      console.log(`   Vote: ${m.vote.description.substring(0, 80)}...`)
      console.log(`   Position: ${m.vote.vote_position}`)
    })

    // Store matches
    console.log('\n' + '='.repeat(60))
    console.log('\nStoring matches in database...')
    const stored = await improvedMatcher.storeMatches(matches)
    console.log(`✅ Stored ${stored} matches`)
  } else {
    console.log('\n⚠️ No matches found. Try lowering the threshold.')
  }

  console.log('')
}

testMatcher()
  .then(() => {
    console.log('✅ Test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
