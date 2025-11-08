/**
 * Promise Classification System
 * Identifies and categorizes political promises from text
 *
 * Uses keyword matching and pattern recognition (no expensive API calls)
 * Can be enhanced with local ML models later
 */

export interface PromiseCandidate {
  text: string
  confidence: number // 0.0-1.0
  isActionable: boolean
  category: PromiseCategory
  keywords: string[]
  source: string
}

export type PromiseCategory =
  | 'economic'
  | 'social'
  | 'environmental'
  | 'security'
  | 'healthcare'
  | 'education'
  | 'justice'
  | 'immigration'
  | 'foreign_policy'
  | 'other'

export class PromiseClassifier {
  /**
   * Identify if text contains a political promise
   */
  isPromise(text: string): { isPromise: boolean; confidence: number } {
    const normalizedText = text.toLowerCase()

    // Strong promise indicators
    const strongIndicators = [
      'je m\'engage',
      'nous nous engageons',
      'je promets',
      'nous promettons',
      'nous allons',
      'je vais',
      'nous ferons',
      'je ferai',
      'objectif',
      'nous proposons',
      'je propose'
    ]

    // Medium promise indicators
    const mediumIndicators = [
      'il faut',
      'nous devons',
      'je veux',
      'nous voulons',
      'mon projet',
      'notre projet',
      'ma proposition',
      'notre proposition'
    ]

    // Anti-patterns (not promises)
    const nonPromisePatterns = [
      'si',
      'peut-être',
      'éventuellement',
      'envisager',
      'réfléchir',
      'étudier',
      'j\'aimerais',
      'ce serait bien'
    ]

    // Check for anti-patterns first
    const hasAntiPattern = nonPromisePatterns.some(pattern =>
      normalizedText.includes(pattern)
    )

    if (hasAntiPattern) {
      return { isPromise: false, confidence: 0.2 }
    }

    // Check for strong indicators
    const strongMatches = strongIndicators.filter(indicator =>
      normalizedText.includes(indicator)
    )

    if (strongMatches.length > 0) {
      return { isPromise: true, confidence: 0.9 }
    }

    // Check for medium indicators
    const mediumMatches = mediumIndicators.filter(indicator =>
      normalizedText.includes(indicator)
    )

    if (mediumMatches.length > 0) {
      return { isPromise: true, confidence: 0.6 }
    }

    return { isPromise: false, confidence: 0.3 }
  }

  /**
   * Check if promise is actionable (can be verified through parliamentary actions)
   */
  isActionable(text: string): boolean {
    const normalizedText = text.toLowerCase()

    const actionablePatterns = [
      /voter\s+(pour|contre)/i,
      /proposer\s+une\s+loi/i,
      /déposer\s+un\s+(projet|amendement)/i,
      /augmenter|diminuer|supprimer/i,
      /créer|mettre en place|instaurer/i,
      /réduire|baisser|hausser/i,
      /interdire|autoriser|légaliser/i,
      /\d+\s*(milliards?|millions?|euros?)/i, // Specific numbers
      /d'ici\s+\d{4}/i // Specific dates
    ]

    return actionablePatterns.some(pattern => pattern.test(normalizedText))
  }

  /**
   * Categorize promise into policy domain
   */
  categorize(text: string): PromiseCategory {
    const normalizedText = text.toLowerCase()

    const categories: Record<PromiseCategory, string[]> = {
      economic: [
        'économie',
        'emploi',
        'fiscalité',
        'entreprise',
        'impôt',
        'croissance',
        'pib',
        'chômage',
        'salaire',
        'pouvoir d\'achat',
        'inflation',
        'budget',
        'dette'
      ],
      social: [
        'famille',
        'retraite',
        'protection sociale',
        'logement',
        'pauvreté',
        'rsa',
        'allocations',
        'aide sociale',
        'solidarité'
      ],
      environmental: [
        'climat',
        'écologie',
        'environnement',
        'transition énergétique',
        'pollution',
        'biodiversité',
        'renouvelable',
        'carbone',
        'émissions',
        'green',
        'nucléaire'
      ],
      security: [
        'sécurité',
        'police',
        'gendarmerie',
        'criminalité',
        'délinquance',
        'terrorisme',
        'défense',
        'armée',
        'militaire'
      ],
      healthcare: [
        'santé',
        'hôpital',
        'médecin',
        'soins',
        'assurance maladie',
        'sécurité sociale',
        'épidémie',
        'vaccin',
        'médicament'
      ],
      education: [
        'éducation',
        'école',
        'université',
        'enseignement',
        'professeur',
        'étudiant',
        'formation',
        'recherche',
        'campus'
      ],
      justice: [
        'justice',
        'tribunal',
        'juge',
        'prison',
        'condamnation',
        'procès',
        'droit',
        'loi',
        'peine'
      ],
      immigration: [
        'immigration',
        'migrant',
        'réfugié',
        'asile',
        'frontière',
        'naturalisation',
        'intégration',
        'étranger'
      ],
      foreign_policy: [
        'international',
        'europe',
        'union européenne',
        'diplomatie',
        'pays étranger',
        'otan',
        'onu',
        'guerre',
        'conflit'
      ],
      other: []
    }

    // Count keyword matches per category
    const scores: Record<string, number> = {}

    for (const [category, keywords] of Object.entries(categories)) {
      scores[category] = keywords.filter(keyword =>
        normalizedText.includes(keyword)
      ).length
    }

    // Find category with highest score
    const sortedCategories = Object.entries(scores).sort(
      ([, a], [, b]) => b - a
    )

    const topCategory = sortedCategories[0]

    if (topCategory[1] === 0) {
      return 'other'
    }

    return topCategory[0] as PromiseCategory
  }

  /**
   * Extract keywords from promise text
   */
  extractKeywords(text: string): string[] {
    const normalizedText = text.toLowerCase()

    // Remove common words
    const stopWords = new Set([
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'de',
      'du',
      'et',
      'ou',
      'mais',
      'donc',
      'car',
      'pour',
      'dans',
      'sur',
      'avec',
      'sans',
      'nous',
      'je',
      'il',
      'elle',
      'ils',
      'elles',
      'à',
      'au',
      'aux',
      'ce',
      'cette',
      'ces',
      'son',
      'sa',
      'ses',
      'leur',
      'leurs'
    ])

    // Split into words
    const words = normalizedText
      .replace(/[^\wÀ-ÿ\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))

    // Count word frequency
    const frequency: Record<string, number> = {}
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1
    })

    // Return top 10 keywords
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * Main extraction method
   */
  extractPromises(text: string, source: string): PromiseCandidate[] {
    // Split text into sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20) // Ignore very short sentences

    const promises: PromiseCandidate[] = []

    for (const sentence of sentences) {
      const { isPromise: containsPromise, confidence } = this.isPromise(sentence)

      if (containsPromise && confidence > 0.5) {
        promises.push({
          text: sentence,
          confidence,
          isActionable: this.isActionable(sentence),
          category: this.categorize(sentence),
          keywords: this.extractKeywords(sentence),
          source
        })
      }
    }

    return promises
  }
}

// Export singleton instance
export const promiseClassifier = new PromiseClassifier()
