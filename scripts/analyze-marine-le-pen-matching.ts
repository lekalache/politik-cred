/**
 * Analyze Marine Le Pen Matching
 * Deep dive into why her promises don't automatically match her votes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Extract keywords from text
function extractKeywords(text: string, minLength: number = 4): Set<string> {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= minLength)

  const stopWords = new Set(['dans', 'pour', 'avec', 'sans', 'plus', 'sous', 'tous', 'tout', 'cette', 'leur', 'leurs', 'fait', 'faire', 'sont', 'etre', 'avoir', 'elle', 'elles', 'vous', 'nous', 'ils', 'celle', 'ceux', 'comme', 'peut', 'doit'])

  return new Set([...words].filter(w => !stopWords.has(w)))
}

// Calculate Jaccard similarity
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return union.size > 0 ? intersection.size / union.size : 0
}

async function analyzeMarine() {
  console.log('\n🔍 ANALYZING MARINE LE PEN MATCHING\n')
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

  console.log(`Found: ${mlp.name} (${mlp.id})`)

  // Get her promises
  const { data: promises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('politician_id', mlp.id)

  console.log(`\nPromises: ${promises?.length || 0}`)

  // Get her votes
  const { data: votes } = await supabase
    .from('parliamentary_actions')
    .select('*')
    .eq('politician_id', mlp.id)
    .eq('action_type', 'vote')

  console.log(`Votes: ${votes?.length || 0}`)

  if (!promises || !votes || promises.length === 0 || votes.length === 0) {
    console.log('Not enough data')
    return
  }

  // Analyze each promise
  for (const promise of promises) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📌 PROMISE: ${promise.promise_text}`)
    console.log(`   Category: ${promise.category}`)

    const promiseKeywords = extractKeywords(promise.promise_text)
    console.log(`   Promise keywords (${promiseKeywords.size}): ${[...promiseKeywords].slice(0, 15).join(', ')}`)

    // Find best matching votes
    const matches = votes.map(vote => {
      const voteKeywords = extractKeywords(vote.description || '')
      const similarity = jaccardSimilarity(promiseKeywords, voteKeywords)
      const commonKeywords = [...promiseKeywords].filter(k => voteKeywords.has(k))

      return {
        vote,
        similarity,
        commonKeywords,
        voteKeywords
      }
    }).sort((a, b) => b.similarity - a.similarity)

    console.log(`\n   🎯 TOP 5 MATCHING VOTES:`)

    matches.slice(0, 5).forEach((match, i) => {
      console.log(`\n   ${i + 1}. Similarity: ${(match.similarity * 100).toFixed(1)}%`)
      console.log(`      Vote: ${match.vote.description?.substring(0, 120)}...`)
      console.log(`      Position: ${match.vote.vote_position}`)
      console.log(`      Date: ${match.vote.action_date}`)
      if (match.commonKeywords.length > 0) {
        console.log(`      Common words: ${match.commonKeywords.slice(0, 8).join(', ')}`)
      } else {
        console.log(`      Common words: NONE`)
        console.log(`      Vote keywords: ${[...match.voteKeywords].slice(0, 8).join(', ')}`)
      }
    })

    // Check if similarity > 0.2 (20%)
    const goodMatches = matches.filter(m => m.similarity > 0.2)
    console.log(`\n   ✓ Matches > 20%: ${goodMatches.length}`)
    console.log(`   ✓ Matches > 15%: ${matches.filter(m => m.similarity > 0.15).length}`)
    console.log(`   ✓ Matches > 10%: ${matches.filter(m => m.similarity > 0.10).length}`)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('\n💡 KEY INSIGHTS:')
  console.log('   - Promises: broad policy statements (énergie, salaires, immigration)')
  console.log('   - Votes: specific amendments (article 15, amendement n°672)')
  console.log('   - Very different vocabulary and abstraction levels')
  console.log('   - Need topic-based or semantic matching, not just keywords')
  console.log('')
}

analyzeMarine()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
