/**
 * Improved Semantic Matcher
 * Better promise-to-vote matching with topic extraction and keyword expansion
 */

import { supabase } from '@/lib/supabase'

// Keyword expansion: map policy terms to related technical terms
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  // Energy
  'energie': ['electricite', 'carburant', 'petrole', 'essence', 'chauffage', 'nucleaire', 'renouvelable', 'facture'],
  'tva': ['taxe', 'taxes', 'fiscalite', 'prix', 'tarif', 'cout'],

  // Employment
  'emploi': ['travail', 'chomage', 'salarie', 'entreprise', 'embauche', 'licenciement'],
  'salaire': ['remuneration', 'smic', 'revenu', 'pouvoir', 'achat', 'augmentation'],

  // Immigration
  'immigration': ['etranger', 'migrant', 'asile', 'refugie', 'nationalite', 'frontieres', 'expulsion', 'regularisation'],
  'voile': ['laicite', 'religion', 'islamique', 'religieux', 'cultuel'],

  // Security
  'securite': ['police', 'gendarmerie', 'delinquance', 'criminalite', 'violence', 'ordre'],
  'homicide': ['meurtre', 'assassinat', 'crime', 'violence', 'agression'],

  // European
  'europeen': ['bruxelles', 'commission', 'union', 'traite', 'reglementation'],

  // Social
  'retraite': ['pension', 'senior', 'vieillesse', 'cotisation'],
}

// Parliamentary jargon to remove from vote descriptions
const VOTE_NOISE_PATTERNS = [
  /l['']amendement.*?(?:de|n°)\s+[\w\s]+/gi,
  /l['']article\s+\d+\w*/gi,
  /en application de.*?Constitution/gi,
  /déposée? par.*?(?:et|de)/gi,
  /les amendements identiques suivants/gi,
  /de suppression/gi,
  /la motion de.*?(?:par|du)/gi,
  /projet de loi/gi,
  /proposition de loi/gi,
  /première lecture/gi,
  /deuxième lecture/gi,
  /troisième lecture/gi,
  /texte de la commission/gi,
]

export class ImprovedSemanticMatcher {
  /**
   * Clean vote description by removing parliamentary jargon
   */
  private cleanVoteDescription(description: string): string {
    let cleaned = description.toLowerCase()

    // Remove noise patterns
    for (const pattern of VOTE_NOISE_PATTERNS) {
      cleaned = cleaned.replace(pattern, ' ')
    }

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim()

    return cleaned
  }

  /**
   * Extract and expand keywords from text
   */
  private extractExpandedKeywords(text: string): Set<string> {
    // Normalize text
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ')

    // Extract base keywords
    const words = normalized.split(/\s+/).filter(w => w.length >= 4)

    // Remove French stop words
    const stopWords = new Set([
      'dans', 'pour', 'avec', 'sans', 'plus', 'sous', 'tous', 'tout',
      'cette', 'leur', 'leurs', 'fait', 'faire', 'sont', 'etre', 'avoir',
      'elle', 'elles', 'vous', 'nous', 'ils', 'celle', 'ceux', 'comme',
      'peut', 'doit', 'sera', 'ainsi', 'alors', 'entre', 'autres', 'aussi'
    ])

    const baseKeywords = words.filter(w => !stopWords.has(w))

    // Expand keywords
    const expandedKeywords = new Set<string>(baseKeywords)

    for (const keyword of baseKeywords) {
      if (KEYWORD_EXPANSIONS[keyword]) {
        KEYWORD_EXPANSIONS[keyword].forEach(expanded => {
          expandedKeywords.add(expanded)
        })
      }
    }

    return expandedKeywords
  }

  /**
   * Calculate enhanced similarity score
   */
  private calculateSimilarity(
    promiseKeywords: Set<string>,
    voteKeywords: Set<string>,
    cleanedVoteText: string
  ): number {
    // Jaccard similarity with expanded keywords
    const intersection = new Set([...promiseKeywords].filter(x => voteKeywords.has(x)))
    const union = new Set([...promiseKeywords, ...voteKeywords])

    const jaccardScore = union.size > 0 ? intersection.size / union.size : 0

    // Boost score if cleaned vote text contains promise keywords directly
    let directMatchBoost = 0
    for (const keyword of promiseKeywords) {
      if (cleanedVoteText.includes(keyword)) {
        directMatchBoost += 0.05 // +5% per direct keyword match
      }
    }

    return Math.min(jaccardScore + directMatchBoost, 1)
  }

  /**
   * Determine if promise was kept based on vote position
   */
  private determineMatchType(
    promiseText: string,
    votePosition: string,
    voteDescription: string
  ): 'kept' | 'broken' | 'partial' {
    const promiseLower = promiseText.toLowerCase()
    const voteLower = voteDescription.toLowerCase()

    // Check if promise is positive (wants something) or negative (opposes something)
    const isPositivePromise = /promet|engage|va\s|fera|veut|augment|creer|construire|renforc|défend|proteg/i.test(promiseLower)
    const isNegativePromise = /refus|oppose|contre|interdi|supprimer|abolir|réduire|empêch|bloqu|stopp/i.test(promiseLower)

    // Check vote context
    const isMotionCensure = /motion.*censure/i.test(voteLower)
    const isAmendementSuppression = /suppression/i.test(voteLower)
    const isMotionRejet = /motion.*rejet/i.test(voteLower)

    // Voting FOR a motion of censure or rejection = opposing the bill
    if (isMotionCensure || isMotionRejet) {
      if (votePosition === 'pour') {
        // Voted to reject/censor
        return isNegativePromise ? 'kept' : 'broken'
      } else {
        // Voted against rejection
        return isPositivePromise ? 'kept' : 'broken'
      }
    }

    // Voting FOR a deletion amendment = opposing that provision
    if (isAmendementSuppression) {
      if (votePosition === 'pour') {
        return isNegativePromise ? 'kept' : 'broken'
      } else {
        return isPositivePromise ? 'kept' : 'broken'
      }
    }

    // Normal vote
    if (votePosition === 'pour') {
      return isPositivePromise ? 'kept' : 'broken'
    } else if (votePosition === 'contre') {
      return isNegativePromise ? 'kept' : 'broken'
    }

    return 'partial'
  }

  /**
   * Match promises to votes for a politician
   */
  async matchPromisesToVotes(
    politicianId: string,
    minSimilarity: number = 0.08 // Lower threshold: 8%
  ): Promise<{
    promise: any
    vote: any
    similarity: number
    matchType: 'kept' | 'broken' | 'partial'
    explanation: string
  }[]> {
    // Get promises
    const { data: promises } = await supabase
      .from('political_promises')
      .select('*')
      .eq('politician_id', politicianId)
      .eq('verification_status', 'pending')

    if (!promises || promises.length === 0) {
      return []
    }

    // Get votes
    const { data: votes } = await supabase
      .from('parliamentary_actions')
      .select('*')
      .eq('politician_id', politicianId)
      .eq('action_type', 'vote')

    if (!votes || votes.length === 0) {
      return []
    }

    console.log(`\nMatching ${promises.length} promises to ${votes.length} votes...`)

    const matches: any[] = []

    for (const promise of promises) {
      console.log(`\n📌 Promise: ${promise.promise_text.substring(0, 60)}...`)

      const promiseKeywords = this.extractExpandedKeywords(promise.promise_text)

      let bestMatch: any = null
      let bestScore = 0

      for (const vote of votes) {
        const cleanedVote = this.cleanVoteDescription(vote.description || '')
        const voteKeywords = this.extractExpandedKeywords(cleanedVote)

        const similarity = this.calculateSimilarity(
          promiseKeywords,
          voteKeywords,
          cleanedVote
        )

        if (similarity > bestScore) {
          bestScore = similarity
          bestMatch = vote
        }
      }

      if (bestMatch && bestScore >= minSimilarity) {
        const matchType = this.determineMatchType(
          promise.promise_text,
          bestMatch.vote_position,
          bestMatch.description
        )

        const explanation = `${matchType.toUpperCase()}: Voted ${bestMatch.vote_position} on "${bestMatch.description.substring(0, 100)}..." (${(bestScore * 100).toFixed(1)}% match)`

        matches.push({
          promise,
          vote: bestMatch,
          similarity: bestScore,
          matchType,
          explanation
        })

        console.log(`   ✅ Match: ${(bestScore * 100).toFixed(1)}% - ${matchType}`)
        console.log(`      Vote: ${bestMatch.description.substring(0, 80)}...`)
      } else {
        console.log(`   ⚠️ No match found (best: ${(bestScore * 100).toFixed(1)}%)`)
      }
    }

    return matches
  }

  /**
   * Store matches in database
   */
  async storeMatches(matches: any[]): Promise<number> {
    let stored = 0

    for (const match of matches) {
      const { error } = await supabase
        .from('promise_verifications')
        .insert({
          promise_id: match.promise.id,
          action_id: match.vote.id,
          match_type: match.matchType,
          match_confidence: match.similarity,
          verification_method: 'ai_assisted',
          explanation: match.explanation,
          verified_at: new Date().toISOString()
        })

      if (!error) {
        stored++

        // Update promise status
        await supabase
          .from('political_promises')
          .update({ verification_status: 'verified' })
          .eq('id', match.promise.id)
      } else if (error.code !== '23505') {
        console.error(`Failed to store match:`, error.message)
      }
    }

    return stored
  }
}

export const improvedMatcher = new ImprovedSemanticMatcher()
