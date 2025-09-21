// AI Fact-Checking Integration
// This module provides AI-powered fact-checking capabilities

export interface FactCheckResult {
  result: 'true' | 'mostly_true' | 'partially_true' | 'mostly_false' | 'false' | 'unverifiable'
  confidence_score: number
  explanation: string
  sources: string[]
  analysis: {
    claim: string
    evidence_quality: number
    source_reliability: number
    political_bias: 'left' | 'center' | 'right' | 'neutral'
    content_sentiment: 'positive' | 'negative' | 'neutral'
  }
}

export interface SourceVerification {
  url: string
  domain: string
  credibility_score: number
  bias_rating: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'unknown'
  factual_reporting: 'very_high' | 'high' | 'mostly_factual' | 'mixed' | 'low' | 'very_low'
  is_reliable: boolean
  notes: string[]
}

class AIFactChecker {
  private apiKey: string | null = null

  constructor() {
    // In a real implementation, you would use a fact-checking API like:
    // - OpenAI GPT for content analysis
    // - Media Bias/Fact Check API
    // - AllSides API
    // - Custom trained models
    this.apiKey = process.env.NEXT_PUBLIC_FACT_CHECK_API_KEY || null
  }

  async checkFact(
    claim: string,
    evidence: string,
    sourceUrl?: string
  ): Promise<FactCheckResult> {
    try {
      // Simulate AI fact-checking process
      // In production, this would call actual AI services

      const analysis = await this.analyzeClaim(claim, evidence)
      const sourceVerification = sourceUrl ? await this.verifySource(sourceUrl) : null

      // Calculate confidence based on various factors
      let confidence = 0.5

      // Adjust confidence based on source reliability
      if (sourceVerification) {
        confidence += sourceVerification.credibility_score * 0.3
      }

      // Adjust confidence based on evidence quality
      confidence += analysis.evidence_quality * 0.3

      // Ensure confidence is between 0 and 1
      confidence = Math.max(0, Math.min(1, confidence))

      return {
        result: this.determineFactCheckResult(analysis),
        confidence_score: Math.round(confidence * 100) / 100,
        explanation: this.generateExplanation(analysis, sourceVerification),
        sources: this.extractSources(evidence, sourceUrl),
        analysis
      }
    } catch (error) {
      console.error('Fact-checking error:', error)
      return {
        result: 'unverifiable',
        confidence_score: 0,
        explanation: 'Impossible de vérifier cette information automatiquement.',
        sources: [],
        analysis: {
          claim,
          evidence_quality: 0,
          source_reliability: 0,
          political_bias: 'neutral',
          content_sentiment: 'neutral'
        }
      }
    }
  }

  async verifySource(url: string): Promise<SourceVerification> {
    try {
      const domain = new URL(url).hostname

      // Simulate source verification
      // In production, this would use real media bias databases
      const verification = this.getSourceCredibility(domain)

      return {
        url,
        domain,
        credibility_score: Number(verification.credibility) || 0,
        bias_rating: (verification.bias as any) || 'unknown',
        factual_reporting: (verification.factual as any) || 'mixed',
        is_reliable: Number(verification.credibility) >= 0.6,
        notes: Array.isArray(verification.notes) ? verification.notes : [String(verification.notes || '')]
      }
    } catch (error) {
      console.error('Source verification error:', error)
      return {
        url,
        domain: 'unknown',
        credibility_score: 0.5,
        bias_rating: 'unknown',
        factual_reporting: 'mixed',
        is_reliable: false,
        notes: ['Impossible de vérifier la source']
      }
    }
  }

  async analyzeContent(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral'
    bias: 'left' | 'center' | 'right' | 'neutral'
    quality: number
    keywords: string[]
    topics: string[]
  }> {
    // Simulate content analysis
    // In production, this would use NLP models

    const keywords = this.extractKeywords(content)
    const sentiment = this.analyzeSentiment(content)
    const bias = this.detectBias(content)
    const quality = this.assessQuality(content)
    const topics = this.extractTopics(content)

    return {
      sentiment,
      bias,
      quality,
      keywords,
      topics
    }
  }

  private async analyzeClaim(claim: string, evidence: string) {
    // Simulate comprehensive claim analysis
    const evidenceQuality = this.assessEvidenceQuality(evidence)
    const sourceReliability = this.assessSourceReliability(evidence)
    const politicalBias = this.detectBias(evidence)
    const contentSentiment = this.analyzeSentiment(evidence)

    return {
      claim,
      evidence_quality: evidenceQuality,
      source_reliability: sourceReliability,
      political_bias: politicalBias,
      content_sentiment: contentSentiment
    }
  }

  private determineFactCheckResult(analysis: Record<string, unknown>): FactCheckResult['result'] {
    const { evidence_quality, source_reliability } = analysis

    const overallScore = (Number(evidence_quality) + Number(source_reliability)) / 2

    if (overallScore >= 0.85) return 'true'
    if (overallScore >= 0.7) return 'mostly_true'
    if (overallScore >= 0.5) return 'partially_true'
    if (overallScore >= 0.3) return 'mostly_false'
    if (overallScore >= 0.1) return 'false'

    return 'unverifiable'
  }

  private generateExplanation(analysis: Record<string, unknown>, sourceVerification: SourceVerification | null): string {
    let explanation = `Analyse automatique de la déclaration:\n\n`

    explanation += `• Qualité des preuves: ${Math.round(Number(analysis.evidence_quality) * 100)}%\n`
    explanation += `• Fiabilité des sources: ${Math.round(Number(analysis.source_reliability) * 100)}%\n`

    if (sourceVerification) {
      explanation += `• Crédibilité du domaine: ${Math.round(sourceVerification.credibility_score * 100)}%\n`
      explanation += `• Orientation politique détectée: ${this.translateBias(sourceVerification.bias_rating)}\n`
    }

    explanation += `\nCette analyse est automatique et doit être vérifiée par des modérateurs humains.`

    return explanation
  }

  private extractSources(evidence: string, sourceUrl?: string): string[] {
    const sources: string[] = []

    if (sourceUrl) sources.push(sourceUrl)

    // Extract URLs from evidence text
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = evidence.match(urlRegex) || []
    sources.push(...urls)

    return [...new Set(sources)] // Remove duplicates
  }

  private getSourceCredibility(domain: string) {
    // Simplified source credibility database
    // In production, this would be a comprehensive database
    const knownSources: Record<string, Record<string, unknown>> = {
      'lemonde.fr': {
        credibility: 0.9,
        bias: 'center-left' as const,
        factual: 'very_high' as const,
        notes: ['Source réputée', 'Journalisme de qualité']
      },
      'lefigaro.fr': {
        credibility: 0.85,
        bias: 'center-right' as const,
        factual: 'high' as const,
        notes: ['Source établie', 'Orientation conservatrice']
      },
      'liberation.fr': {
        credibility: 0.8,
        bias: 'left' as const,
        factual: 'high' as const,
        notes: ['Orientation progressiste', 'Journalisme engagé']
      },
      'france24.com': {
        credibility: 0.9,
        bias: 'center' as const,
        factual: 'very_high' as const,
        notes: ['Service public', 'International']
      },
      'bfmtv.com': {
        credibility: 0.7,
        bias: 'center' as const,
        factual: 'mostly_factual' as const,
        notes: ['Média continu', 'Qualité variable']
      }
    }

    return knownSources[domain] || {
      credibility: 0.5,
      bias: 'unknown' as const,
      factual: 'mixed' as const,
      notes: ['Source inconnue - vérification manuelle requise']
    }
  }

  private assessEvidenceQuality(evidence: string): number {
    let quality = 0.5

    // Length bonus
    if (evidence.length > 200) quality += 0.1
    if (evidence.length > 500) quality += 0.1

    // URL presence bonus
    if (evidence.includes('http')) quality += 0.1

    // Specific details bonus
    if (/\d{4}/.test(evidence)) quality += 0.05 // Contains year
    if (/\d+%/.test(evidence)) quality += 0.05 // Contains percentage
    if (/\d+\s*(euros?|dollars?)/.test(evidence)) quality += 0.05 // Contains money

    // Multiple sources bonus
    const urlCount = (evidence.match(/https?:\/\/[^\s]+/g) || []).length
    if (urlCount > 1) quality += 0.1

    return Math.min(quality, 1)
  }

  private assessSourceReliability(evidence: string): number {
    // Simple reliability assessment based on content markers
    let reliability = 0.5

    // Professional markers
    if (evidence.includes('selon') || evidence.includes('d\'après')) reliability += 0.1
    if (evidence.includes('étude') || evidence.includes('enquête')) reliability += 0.1
    if (evidence.includes('officiel') || evidence.includes('ministère')) reliability += 0.1

    // Uncertainty markers (reduce reliability)
    if (evidence.includes('rumeur') || evidence.includes('on dit que')) reliability -= 0.2
    if (evidence.includes('peut-être') || evidence.includes('probablement')) reliability -= 0.1

    return Math.max(0, Math.min(reliability, 1))
  }

  private detectBias(content: string): 'left' | 'center' | 'right' | 'neutral' {
    // Simplified bias detection
    const leftKeywords = ['social', 'égalité', 'redistribution', 'public']
    const rightKeywords = ['entreprise', 'marché', 'privatisation', 'sécuritaire']

    const leftCount = leftKeywords.filter(word => content.toLowerCase().includes(word)).length
    const rightCount = rightKeywords.filter(word => content.toLowerCase().includes(word)).length

    if (leftCount > rightCount + 1) return 'left'
    if (rightCount > leftCount + 1) return 'right'
    if (Math.abs(leftCount - rightCount) <= 1) return 'center'

    return 'neutral'
  }

  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis
    const positiveWords = ['excellent', 'bon', 'réussi', 'efficace', 'positif']
    const negativeWords = ['mauvais', 'échec', 'problème', 'critique', 'négatif']

    const positiveCount = positiveWords.filter(word => content.toLowerCase().includes(word)).length
    const negativeCount = negativeWords.filter(word => content.toLowerCase().includes(word)).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'

    return 'neutral'
  }

  private assessQuality(content: string): number {
    let quality = 0.5

    // Length and detail
    if (content.length > 100) quality += 0.1
    if (content.length > 300) quality += 0.1

    // Structure indicators
    if (content.includes('.') && content.split('.').length > 2) quality += 0.1
    if (/[A-Z]/.test(content)) quality += 0.05

    // Factual indicators
    if (/\d/.test(content)) quality += 0.1
    if (content.includes('%')) quality += 0.05

    return Math.min(quality, 1)
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const frequency: Record<string, number> = {}
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1
    })

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction based on keywords
    const topics: string[] = []

    if (/économie|budget|fiscal|emploi/i.test(content)) topics.push('Économie')
    if (/santé|médical|hôpital/i.test(content)) topics.push('Santé')
    if (/éducation|école|université/i.test(content)) topics.push('Éducation')
    if (/sécurité|police|justice/i.test(content)) topics.push('Sécurité')
    if (/environnement|climat|écologie/i.test(content)) topics.push('Environnement')
    if (/international|europe|monde/i.test(content)) topics.push('International')

    return topics
  }

  private translateBias(bias: string): string {
    const translations: Record<string, string> = {
      'left': 'Gauche',
      'center-left': 'Centre-gauche',
      'center': 'Centre',
      'center-right': 'Centre-droit',
      'right': 'Droite',
      'unknown': 'Inconnu'
    }

    return translations[bias] || bias
  }
}

export const aiFactChecker = new AIFactChecker()