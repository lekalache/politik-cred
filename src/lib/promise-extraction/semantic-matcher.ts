/**
 * Semantic Matching Engine
 * Matches promises to parliamentary actions using semantic similarity
 *
 * Uses Hugging Face Inference API for production-grade semantic matching
 * Falls back to Jaccard similarity if API is unavailable
 */

import { huggingfaceClient } from '@/lib/ai/huggingface-client'

interface Match {
  promiseId: string
  actionId: string
  similarity: number
  matchType: 'kept' | 'broken' | 'partial' | 'contradictory'
  confidence: number
  explanation: string
}

export class SemanticMatcher {
  private useHuggingFace: boolean

  constructor() {
    this.useHuggingFace = huggingfaceClient.isAvailable()

    if (!this.useHuggingFace) {
      console.warn('Hugging Face API not available. Using Jaccard similarity as fallback.')
    } else {
      console.log('Semantic matcher initialized with Hugging Face embeddings')
    }
  }

  /**
   * Compute Jaccard similarity between two texts
   * (Fallback method when Hugging Face is unavailable)
   */
  private jaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1
        .toLowerCase()
        .replace(/[^\wÀ-ÿ\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
    )

    const words2 = new Set(
      text2
        .toLowerCase()
        .replace(/[^\wÀ-ÿ\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
    )

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Calculate semantic similarity between two texts
   * Uses Hugging Face if available, falls back to Jaccard
   */
  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    try {
      if (this.useHuggingFace) {
        return await huggingfaceClient.calculateSimilarity(text1, text2)
      }
    } catch (error) {
      console.error('Hugging Face similarity calculation failed, using fallback:', error)
      this.useHuggingFace = false // Disable for this session
    }

    // Fallback to Jaccard
    return this.jaccardSimilarity(text1, text2)
  }

  /**
   * Detect if action contradicts promise
   */
  private isContradiction(
    promiseText: string,
    actionDescription: string,
    votePosition?: string
  ): boolean {
    const promise = promiseText.toLowerCase()
    const action = actionDescription.toLowerCase()

    // Contradiction patterns
    const contradictionPairs = [
      { promise: /voter\s+pour/i, action: votePosition === 'contre' },
      { promise: /voter\s+contre/i, action: votePosition === 'pour' },
      { promise: /s'opposer|refuser|rejeter/i, action: votePosition === 'pour' },
      { promise: /soutenir|défendre|approuver/i, action: votePosition === 'contre' },
      { promise: /augmenter/i, action: /diminuer|réduire|baisser/i },
      { promise: /diminuer|réduire/i, action: /augmenter|hausser/i },
      { promise: /créer|instaurer/i, action: /supprimer|abolir/i },
      { promise: /supprimer|abolir/i, action: /créer|instaurer/i }
    ]

    return contradictionPairs.some(pair => {
      if (typeof pair.action === 'boolean') {
        return pair.promise.test(promise) && pair.action
      }
      return pair.promise.test(promise) && pair.action.test(action)
    })
  }

  /**
   * Match a single promise to a list of actions
   */
  async matchPromiseToActions(
    promiseId: string,
    promiseText: string,
    promiseCategory: string,
    actions: Array<{
      id: string
      description: string
      category: string
      votePosition?: string
      billTitle?: string
    }>
  ): Promise<Match[]> {
    const matches: Match[] = []

    // Filter actions by category first (performance optimization)
    const relevantActions = actions.filter(
      a => a.category === promiseCategory || promiseCategory === 'other'
    )

    for (const action of relevantActions) {
      // Compute similarity (uses Hugging Face or falls back to Jaccard)
      const similarity = await this.calculateSimilarity(
        promiseText,
        `${action.description} ${action.billTitle || ''}`
      )

      // Only consider matches above threshold
      if (similarity < 0.3) continue

      // Determine match type
      const isContradiction = this.isContradiction(
        promiseText,
        action.description,
        action.votePosition
      )

      let matchType: Match['matchType']
      let confidence = similarity

      if (isContradiction) {
        matchType = 'contradictory'
        confidence *= 1.2 // Boost confidence for contradictions
      } else if (similarity > 0.7) {
        matchType = 'kept'
      } else if (similarity > 0.5) {
        matchType = 'partial'
      } else {
        matchType = 'kept' // Default to kept for medium matches
        confidence *= 0.8
      }

      // Generate explanation
      const explanation = this.generateExplanation(
        promiseText,
        action,
        matchType,
        similarity
      )

      matches.push({
        promiseId,
        actionId: action.id,
        similarity,
        matchType,
        confidence: Math.min(confidence, 1.0),
        explanation
      })
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Generate human-readable explanation for match
   */
  private generateExplanation(
    promiseText: string,
    action: {
      description: string
      votePosition?: string
      billTitle?: string
    },
    matchType: Match['matchType'],
    similarity: number
  ): string {
    const confidencePercent = Math.round(similarity * 100)

    const templates = {
      kept: `Le parlementaire a ${action.votePosition ? `voté ${action.votePosition}` : 'agi'} sur "${action.billTitle || action.description}", ce qui correspond à sa promesse (similarité: ${confidencePercent}%).`,
      broken: `Le parlementaire n'a pas tenu sa promesse. Action trouvée: "${action.description}" (similarité: ${confidencePercent}%).`,
      partial: `Le parlementaire a partiellement tenu sa promesse via "${action.billTitle || action.description}" (similarité: ${confidencePercent}%).`,
      contradictory: `Le parlementaire a ${action.votePosition ? `voté ${action.votePosition}` : 'agi'} sur "${action.billTitle || action.description}", ce qui CONTREDIT sa promesse initiale (similarité: ${confidencePercent}%).`
    }

    return templates[matchType]
  }

  /**
   * Batch match multiple promises to actions
   */
  async batchMatch(
    promises: Array<{
      id: string
      text: string
      category: string
    }>,
    actions: Array<{
      id: string
      description: string
      category: string
      votePosition?: string
      billTitle?: string
    }>
  ): Promise<Match[]> {
    const allMatches: Match[] = []

    for (const promise of promises) {
      const matches = await this.matchPromiseToActions(
        promise.id,
        promise.text,
        promise.category,
        actions
      )

      allMatches.push(...matches)
    }

    return allMatches
  }

  /**
   * Filter matches by confidence threshold
   */
  filterByConfidence(
    matches: Match[],
    minConfidence: number = 0.6
  ): {
    highConfidence: Match[] // >= 0.85 - auto-match
    mediumConfidence: Match[] // 0.6-0.84 - manual review
    lowConfidence: Match[] // < 0.6 - ignore
  } {
    return {
      highConfidence: matches.filter(m => m.confidence >= 0.85),
      mediumConfidence: matches.filter(
        m => m.confidence >= minConfidence && m.confidence < 0.85
      ),
      lowConfidence: matches.filter(m => m.confidence < minConfidence)
    }
  }
}

// Export singleton
export const semanticMatcher = new SemanticMatcher()

/**
 * Environment Variables Required:
 * - HUGGINGFACE_API_KEY: Optional. If not set, falls back to Jaccard similarity
 *
 * Usage Stats:
 * - Free tier: 30,000 requests/month
 * - Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
 * - Embedding dimensions: 384
 *
 * For higher volume production use, consider:
 * - Python microservice with local sentence-transformers deployment
 * - Hugging Face Inference Endpoints (paid, dedicated instance)
 */
