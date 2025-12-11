/**
 * Promise-to-Vote Matching System
 * Uses AI semantic matching to find which votes relate to which promises
 * Determines if promises were kept, broken, or partially fulfilled
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Get semantic embedding using Hugging Face
async function getEmbedding(text: string): Promise<number[]> {
  if (!HUGGINGFACE_API_KEY) {
    console.log('  ⚠️ No Hugging Face API key - using fallback matching')
    return []
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
      }
    )

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('  ⚠️ Embedding failed:', error)
    return []
  }
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Simple keyword matching fallback
function keywordMatch(promiseText: string, voteDescription: string): number {
  const promiseWords = new Set(
    promiseText.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
  )

  const voteWords = voteDescription.toLowerCase().split(/\s+/)
  const matchingWords = voteWords.filter(w => promiseWords.has(w))

  return matchingWords.length / Math.max(promiseWords.size, 1)
}

// Get category-specific keywords to filter votes
function getCategoryKeywords(category: string): string[] {
  const keywords: { [key: string]: string[] } = {
    economic: ['économie', 'emploi', 'salaire', 'smic', 'impôt', 'taxe', 'pouvoir', 'achat', 'budget', 'entreprise'],
    healthcare: ['santé', 'hôpital', 'soignant', 'médical', 'médecin', 'soin', 'assurance', 'maladie'],
    social: ['retraite', 'pension', 'social', 'allocation', 'aide', 'âge', 'travail'],
    security: ['sécurité', 'police', 'prison', 'criminalité', 'délinquance', 'justice', 'peine'],
    immigration: ['immigration', 'immigré', 'frontière', 'sans-papiers', 'étranger', 'asile', 'régularisation'],
    environmental: ['écologie', 'climat', 'environnement', 'transition', 'nucléaire', 'énergie', 'renouvelable'],
    education: ['éducation', 'école', 'université', 'enseignement', 'étudiant', 'professeur', 'formation'],
    other: []
  }

  return keywords[category] || []
}

// Check if vote matches promise category
function matchesCategory(voteText: string, category: string): boolean {
  const keywords = getCategoryKeywords(category)
  if (keywords.length === 0) return true // No filtering for 'other'

  const voteLower = voteText.toLowerCase()
  return keywords.some(keyword => voteLower.includes(keyword))
}

// Determine if promise was kept based on vote
function determineMatchType(
  promiseText: string,
  votePosition: string,
  voteSort: string
): 'kept' | 'broken' | 'partial' {
  const promiseLower = promiseText.toLowerCase()

  // Promise indicators
  const isPositivePromise = /promet|s'engage|va|augment|créer|construire|renforc|défend/i.test(promiseLower)
  const isNegativePromise = /refus|s'oppose|contre|interdi|supprimer|abolir|réduire/i.test(promiseLower)

  // Vote was FOR the measure
  if (votePosition === 'pour') {
    if (isPositivePromise) return 'kept'
    if (isNegativePromise) return 'broken'
  }

  // Vote was AGAINST the measure
  if (votePosition === 'contre') {
    if (isNegativePromise) return 'kept'
    if (isPositivePromise) return 'broken'
  }

  // Abstention or absent = partial
  return 'partial'
}

// Match promises to votes
async function matchPromisesToVotes() {
  console.log('\n🤖 AI PROMISE MATCHING\n')
  console.log('='.repeat(60))

  // Get all unverified promises
  const { data: promises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('verification_status', 'pending')

  if (!promises || promises.length === 0) {
    console.log('❌ No pending promises to match')
    return
  }

  console.log(`Found ${promises.length} promises to match\n`)

  let totalMatches = 0
  let promisesProcessed = 0

  for (const promise of promises) {
    promisesProcessed++
    console.log(`[${promisesProcessed}/${promises.length}] ${promise.promise_text.substring(0, 60)}...`)

    // Get votes for this politician
    const { data: votes } = await supabase
      .from('parliamentary_actions')
      .select('*')
      .eq('politician_id', promise.politician_id)
      .eq('action_type', 'vote')
      .limit(100)

    if (!votes || votes.length === 0) {
      console.log('  ⚠️ No votes found for this politician')
      continue
    }

    console.log(`  Found ${votes.length} votes to check`)

    // Get promise embedding
    const promiseEmbedding = await getEmbedding(promise.promise_text)

    // First filter votes by category
    const relevantVotes = votes.filter(vote =>
      matchesCategory(vote.description || '', promise.category)
    )

    console.log(`  Filtered to ${relevantVotes.length} category-relevant votes`)

    let bestMatch: any = null
    let bestScore = 0

    for (const vote of relevantVotes) {
      const voteText = vote.description || ''

      // Try semantic matching first (if API available)
      let similarity = 0
      if (promiseEmbedding.length > 0) {
        const voteEmbedding = await getEmbedding(voteText)
        similarity = cosineSimilarity(promiseEmbedding, voteEmbedding)
      } else {
        // Fallback to keyword matching
        similarity = keywordMatch(promise.promise_text, voteText)
      }

      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = vote
      }
    }

    // If we found a good match (>30% similarity - lowered threshold)
    if (bestMatch && bestScore > 0.3) {
      const matchType = determineMatchType(
        promise.promise_text,
        bestMatch.vote_position,
        bestMatch.metadata?.sort || ''
      )

      console.log(`  ✅ Match found! Score: ${(bestScore * 100).toFixed(1)}% - ${matchType.toUpperCase()}`)
      console.log(`     Vote: ${bestMatch.description.substring(0, 80)}...`)

      // Insert match
      const { error } = await supabase
        .from('promise_verifications')
        .insert({
          promise_id: promise.id,
          action_id: bestMatch.id,
          match_type: matchType,
          match_confidence: bestScore,
          verification_source: promiseEmbedding.length > 0 ? 'ai_assisted' : 'keyword_match',
          verified_at: new Date().toISOString()
        })

      if (!error) {
        totalMatches++

        // Update promise status
        await supabase
          .from('political_promises')
          .update({ verification_status: 'verified' })
          .eq('id', promise.id)
      } else if (error.code !== '23505') {
        console.error(`  ⚠️ Failed to insert match:`, error.message)
      }
    } else {
      console.log(`  ⚠️ No good match found (best: ${(bestScore * 100).toFixed(1)}%)`)
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ MATCHING COMPLETE!`)
  console.log(`   Promises processed: ${promisesProcessed}`)
  console.log(`   Matches found: ${totalMatches}`)
  console.log('')
}

// Run matching
matchPromisesToVotes()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
