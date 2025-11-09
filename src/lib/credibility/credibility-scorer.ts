/**
 * Credibility Scoring System
 *
 * Calculates and tracks credibility score changes based on promise verification.
 *
 * LEGAL NOTE: This system tracks ACTIONS, not character.
 * - We say: "a déclaré X mais a fait Y" (stated X but did Y)
 * - We DON'T say: "est un menteur" (is a liar)
 *
 * Score changes are based on verifiable facts:
 * - Promise text vs actual parliamentary actions
 * - Multiple verification sources increase confidence
 * - All changes are tracked with full audit trail
 */

import { createClient } from '@supabase/supabase-js'

export type VerificationStatus = 'kept' | 'broken' | 'partial' | 'in_progress' | 'pending'
export type VerificationSource =
  | 'ai_assisted'
  | 'vigie_community'
  | 'manual_review'
  | 'parliamentary_match'
  | 'user_contributed'
export type ChangeReason =
  | 'promise_kept'
  | 'promise_broken'
  | 'promise_partial'
  | 'statement_verified'
  | 'statement_contradicted'
  | 'manual_adjustment'
  | 'initial_score'
export type PromiseImportance = 'critical' | 'high' | 'medium' | 'low'

interface CredibilityChangeInput {
  politicianId: string
  promiseId?: string
  verificationStatus: VerificationStatus
  verificationSources: VerificationSource[]
  verificationConfidence?: number
  promiseImportance?: PromiseImportance
  promiseText?: string
  evidenceUrl?: string
  createdBy?: string
}

interface CredibilityChange {
  previousScore: number
  newScore: number
  scoreChange: number
  changeReason: ChangeReason
  description: string
}

export class CredibilityScorer {
  /**
   * Calculate credibility score change based on promise verification
   */
  static calculateScoreChange(
    verificationStatus: VerificationStatus,
    verificationSources: VerificationSource[],
    verificationConfidence: number = 0.8,
    promiseImportance: PromiseImportance = 'medium'
  ): number {
    // Base score change
    const baseChange = this.getBaseChange(verificationStatus)

    // Sources tracked for transparency only (don't affect score magnitude)
    // A broken promise is -5 points regardless of verification source count

    // Confidence multiplier (0-1)
    const confidenceMultiplier = Math.max(0, Math.min(1, verificationConfidence))

    // Importance multiplier
    const importanceMultiplier = this.getImportanceMultiplier(promiseImportance)

    // Calculate final change (no source multiplier)
    const finalChange = baseChange * confidenceMultiplier * importanceMultiplier

    // Round to 2 decimal places
    return Math.round(finalChange * 100) / 100
  }

  /**
   * Base score change based on verification status
   */
  private static getBaseChange(status: VerificationStatus): number {
    switch (status) {
      case 'kept':
        return 3.0  // Promise kept: +3 points
      case 'broken':
        return -5.0  // Promise broken: -5 points (more impact than keeping)
      case 'partial':
        return 1.0  // Partial fulfillment: +1 point
      case 'in_progress':
        return 0.5  // In progress: +0.5 point (small positive)
      case 'pending':
        return 0.0  // No change yet
      default:
        return 0.0
    }
  }

  /**
   * Multiplier based on promise importance
   */
  private static getImportanceMultiplier(importance: PromiseImportance): number {
    switch (importance) {
      case 'critical':
        return 1.5
      case 'high':
        return 1.25
      case 'medium':
        return 1.0
      case 'low':
        return 0.75
      default:
        return 1.0
    }
  }

  /**
   * Generate legally careful description
   * States FACTS, not character judgments
   */
  static generateDescription(
    verificationStatus: VerificationStatus,
    promiseText?: string,
    verificationSources: VerificationSource[] = []
  ): string {
    const sourceText = this.formatSources(verificationSources)

    switch (verificationStatus) {
      case 'kept':
        return `Promesse tenue${promiseText ? ` : "${this.truncate(promiseText)}"` : ''}. ${sourceText}`

      case 'broken':
        // IMPORTANT: Don't say "a menti" (lied), say "n'a pas tenu sa promesse" (didn't keep promise)
        return `Promesse non tenue${promiseText ? ` : "${this.truncate(promiseText)}"` : ''}. ${sourceText}`

      case 'partial':
        return `Promesse partiellement tenue${promiseText ? ` : "${this.truncate(promiseText)}"` : ''}. ${sourceText}`

      case 'in_progress':
        return `Promesse en cours de réalisation${promiseText ? ` : "${this.truncate(promiseText)}"` : ''}. ${sourceText}`

      default:
        return `Promesse en attente de vérification${promiseText ? ` : "${this.truncate(promiseText)}"` : ''}.`
    }
  }

  /**
   * Format verification sources for display
   */
  private static formatSources(sources: VerificationSource[]): string {
    if (sources.length === 0) return 'Vérification en cours.'

    const sourceNames: Record<VerificationSource, string> = {
      ai_assisted: 'IA',
      vigie_community: 'Vigie du mensonge',
      manual_review: 'Revue manuelle',
      parliamentary_match: 'Données parlementaires',
      user_contributed: 'Contribution utilisateur'
    }

    const formatted = sources.map(s => sourceNames[s]).filter(Boolean)

    if (formatted.length === 0) return ''
    if (formatted.length === 1) return `Vérifié par ${formatted[0]}.`
    if (formatted.length === 2) return `Vérifié par ${formatted[0]} et ${formatted[1]}.`

    const last = formatted.pop()
    return `Vérifié par ${formatted.join(', ')} et ${last}.`
  }

  /**
   * Truncate long text for descriptions
   */
  private static truncate(text: string, maxLength: number = 80): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * Determine change reason from verification status
   */
  static getChangeReason(status: VerificationStatus): ChangeReason {
    switch (status) {
      case 'kept':
        return 'promise_kept'
      case 'broken':
        return 'promise_broken'
      case 'partial':
        return 'promise_partial'
      default:
        return 'promise_broken' // Default for safety
    }
  }

  /**
   * Update politician credibility in database
   */
  static async updateCredibility(
    input: CredibilityChangeInput
  ): Promise<CredibilityChange | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get current politician credibility
    const { data: politician, error: politicianError } = await supabase
      .from('politicians')
      .select('credibility_score')
      .eq('id', input.politicianId)
      .single()

    if (politicianError || !politician) {
      console.error('Failed to fetch politician:', politicianError)
      return null
    }

    // Calculate score change
    const scoreChange = this.calculateScoreChange(
      input.verificationStatus,
      input.verificationSources,
      input.verificationConfidence,
      input.promiseImportance
    )

    // Generate description
    const description = this.generateDescription(
      input.verificationStatus,
      input.promiseText,
      input.verificationSources
    )

    // Determine change reason
    const changeReason = this.getChangeReason(input.verificationStatus)

    // Call database function to update credibility
    const { error: updateError } = await supabase.rpc('update_politician_credibility', {
      p_politician_id: input.politicianId,
      p_promise_id: input.promiseId || null,
      p_score_change: scoreChange,
      p_change_reason: changeReason,
      p_description: description,
      p_verification_sources: input.verificationSources,
      p_verification_confidence: input.verificationConfidence || null,
      p_evidence_url: input.evidenceUrl || null,
      p_created_by: input.createdBy || null
    })

    if (updateError) {
      console.error('Failed to update credibility:', updateError)
      return null
    }

    // Calculate new score (capped at 0-200)
    const previousScore = politician.credibility_score
    const newScore = Math.max(0, Math.min(200, previousScore + scoreChange))

    return {
      previousScore,
      newScore,
      scoreChange,
      changeReason,
      description
    }
  }

  /**
   * Get credibility history for a politician
   */
  static async getHistory(politicianId: string, limit: number = 10) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('credibility_history')
      .select(`
        *,
        political_promises (
          promise_text,
          source_url
        )
      `)
      .eq('politician_id', politicianId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch credibility history:', error)
      return []
    }

    return data
  }
}
