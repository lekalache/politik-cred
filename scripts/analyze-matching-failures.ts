/**
 * Analyze Matching Failures
 * Understand why promises aren't matching to votes
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
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= minLength)

  // Remove common French stop words
  const stopWords = new Set(['dans', 'pour', 'avec', 'sans', 'plus', 'sous', 'tous', 'tout', 'cette', 'leur', 'leurs', 'fait', 'faire', 'sont', 'etre', 'avoir', 'elle', 'elles', 'vous', 'nous', 'ils'])

  return new Set([...words].filter(w => !stopWords.has(w)))
}

// Calculate Jaccard similarity
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return union.size > 0 ? intersection.size / union.size : 0
}

async function analyzeFailures() {
  console.log('\n🔍 ANALYZING MATCHING FAILURES\n')
  console.log('='.repeat(60))

  // Get a sample promise
  const { data: promises } = await supabase
    .from('political_promises')
    .select('*')
    .limit(5)

  if (!promises || promises.length === 0) {
    console.log('No promises found')
    return
  }

  for (const promise of promises) {
    console.log(`\n📌 PROMISE: ${promise.promise_text.substring(0, 100)}...`)
    console.log(`   Politician: ${promise.politician_id}`)
    console.log(`   Category: ${promise.category}`)

    // Extract keywords from promise
    const promiseKeywords = extractKeywords(promise.promise_text)
    console.log(`   Keywords: ${[...promiseKeywords].slice(0, 10).join(', ')}`)

    // Get votes for this politician
    const { data: votes } = await supabase
      .from('parliamentary_actions')
      .select('*')
      .eq('politician_id', promise.politician_id)
      .eq('action_type', 'vote')
      .limit(10)

    if (!votes || votes.length === 0) {
      console.log('\n   ⚠️ No votes found for this politician')
      continue
    }

    console.log(`\n   📊 ANALYZING ${votes.length} SAMPLE VOTES:`)

    // Find best matches
    const matches = votes.map(vote => {
      const voteKeywords = extractKeywords(vote.description || '')
      const similarity = jaccardSimilarity(promiseKeywords, voteKeywords)
      const commonKeywords = [...promiseKeywords].filter(k => voteKeywords.has(k))

      return {
        vote,
        similarity,
        commonKeywords
      }
    }).sort((a, b) => b.similarity - a.similarity)

    // Show top 3 matches
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`\n   ${i + 1}. Similarity: ${(match.similarity * 100).toFixed(1)}%`)
      console.log(`      Vote: ${match.vote.description?.substring(0, 80)}...`)
      console.log(`      Position: ${match.vote.vote_position}`)
      console.log(`      Date: ${match.vote.action_date}`)
      console.log(`      Common keywords: ${match.commonKeywords.slice(0, 5).join(', ') || 'None'}`)
    })

    console.log('\n' + '-'.repeat(60))
  }

  // Overall statistics
  console.log('\n\n📈 OVERALL STATISTICS:')

  const { data: allPromises } = await supabase
    .from('political_promises')
    .select('promise_text, category')

  const { data: allVotes } = await supabase
    .from('parliamentary_actions')
    .select('description')
    .eq('action_type', 'vote')
    .limit(100)

  if (allPromises && allVotes) {
    const avgPromiseLength = allPromises.reduce((sum, p) => sum + p.promise_text.length, 0) / allPromises.length
    const avgVoteLength = allVotes.reduce((sum, v) => sum + (v.description?.length || 0), 0) / allVotes.length

    console.log(`   Avg promise length: ${avgPromiseLength.toFixed(0)} chars`)
    console.log(`   Avg vote description length: ${avgVoteLength.toFixed(0)} chars`)

    const promiseKeywordCounts = allPromises.map(p => extractKeywords(p.promise_text).size)
    const avgPromiseKeywords = promiseKeywordCounts.reduce((a, b) => a + b, 0) / promiseKeywordCounts.length

    const voteKeywordCounts = allVotes.map(v => extractKeywords(v.description || '').size)
    const avgVoteKeywords = voteKeywordCounts.reduce((a, b) => a + b, 0) / voteKeywordCounts.length

    console.log(`   Avg promise keywords: ${avgPromiseKeywords.toFixed(1)}`)
    console.log(`   Avg vote keywords: ${avgVoteKeywords.toFixed(1)}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n💡 INSIGHTS:')
  console.log('   1. Promises are high-level policy statements')
  console.log('   2. Votes are specific technical amendments')
  console.log('   3. Direct keyword matching has low overlap')
  console.log('   4. Need semantic understanding or topic modeling')
  console.log('   5. May need to analyze bill texts, not just vote descriptions')
  console.log('')
}

analyzeFailures()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
