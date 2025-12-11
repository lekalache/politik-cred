/**
 * Core Value Profile Calculator
 *
 * Calculates the "Political DNA" of politicians by analyzing:
 * 1. Value metrics per category (promises kept/broken/partial)
 * 2. Authenticity scores (consistency across multiple sources)
 * 3. Greenwashing detection (rhetoric vs. action discrepancies)
 * 4. Priority shifts over time
 */

import { supabase, supabaseAdmin } from '@/lib/supabase'
import type {
  ValueCategory,
  ValueMetrics,
  GreenwashingFlag,
  PriorityShift,
  CoreValueProfileInsert,
  PromiseCategory
} from '@/lib/supabase'

// Minimum promises needed for reliable calculations
const MIN_PROMISES_FOR_CALCULATION = 3
const MIN_SOURCES_FOR_AUTHENTICITY = 2

// Category weights for authenticity (higher = more important for political identity)
const CATEGORY_WEIGHTS: Record<ValueCategory, number> = {
  economy: 1.2,
  environment: 1.3,
  social_justice: 1.1,
  security: 1.0,
  immigration: 1.2,
  health: 1.0,
  education: 1.0,
  foreign_policy: 0.9,
  other: 0.5
}

// Map PromiseCategory to ValueCategory
const CATEGORY_MAPPING: Record<PromiseCategory, ValueCategory> = {
  economic: 'economy',
  environmental: 'environment',
  social: 'social_justice',
  security: 'security',
  immigration: 'immigration',
  healthcare: 'health',
  education: 'education',
  foreign_policy: 'foreign_policy',
  justice: 'social_justice',
  other: 'other'
}

export interface ProfileCalculationResult {
  success: boolean
  politicianId: string
  profileId?: string
  valueMetrics: Record<ValueCategory, ValueMetrics>
  authenticityScore: number | null
  greenwashingFlags: GreenwashingFlag[]
  priorityShifts: PriorityShift[]
  dataQualityScore: number
  errors: string[]
}

export interface PromiseData {
  id: string
  category: PromiseCategory
  verification_status: string
  promise_date: string
  source_count?: number
  sources_agree?: boolean
}

export interface SourceData {
  promise_id: string
  source_type: string
  status_claimed: string
  confidence: number
}

export class ValueProfileCalculator {
  private db = supabaseAdmin || supabase

  /**
   * Calculate value profile for a single politician
   */
  async calculateProfile(politicianId: string): Promise<ProfileCalculationResult> {
    const errors: string[] = []

    try {
      console.log(`[ValueProfile] Calculating profile for politician: ${politicianId}`)

      // 1. Fetch all promises with their sources
      const { data: promises, error: promisesError } = await this.db
        .from('political_promises')
        .select(`
          id,
          category,
          verification_status,
          promise_date,
          authenticity_flags
        `)
        .eq('politician_id', politicianId)

      if (promisesError) throw promisesError

      if (!promises || promises.length < MIN_PROMISES_FOR_CALCULATION) {
        return {
          success: false,
          politicianId,
          valueMetrics: this.getEmptyMetrics(),
          authenticityScore: null,
          greenwashingFlags: [],
          priorityShifts: [],
          dataQualityScore: 0,
          errors: [`Insufficient data: ${promises?.length || 0} promises (need ${MIN_PROMISES_FOR_CALCULATION})`]
        }
      }

      // 2. Fetch promise sources
      const promiseIds = promises.map(p => p.id)
      const { data: sources, error: sourcesError } = await this.db
        .from('promise_sources')
        .select('promise_id, source_type, status_claimed, confidence')
        .in('promise_id', promiseIds)
        .eq('is_active', true)

      if (sourcesError) {
        console.error('[ValueProfile] Error fetching sources:', sourcesError)
      }

      // 3. Fetch promise verifications
      const { data: verifications, error: verificationsError } = await this.db
        .from('promise_verifications')
        .select('promise_id, match_type, match_confidence')
        .in('promise_id', promiseIds)
        .eq('is_disputed', false)

      if (verificationsError) {
        console.error('[ValueProfile] Error fetching verifications:', verificationsError)
      }

      // 4. Calculate value metrics per category
      const valueMetrics = this.calculateValueMetrics(
        promises as PromiseData[],
        verifications || []
      )

      // 5. Calculate authenticity score
      const authenticityScore = this.calculateAuthenticityScore(
        promises as PromiseData[],
        sources || []
      )

      // 6. Detect greenwashing
      const greenwashingFlags = this.detectGreenwashing(
        promises as PromiseData[],
        verifications || [],
        valueMetrics
      )

      // 7. Detect priority shifts
      const priorityShifts = this.detectPriorityShifts(
        promises as PromiseData[]
      )

      // 8. Calculate data quality score
      const dataQualityScore = this.calculateDataQuality(
        promises?.length || 0,
        sources?.length || 0,
        verifications?.length || 0
      )

      // 9. Store profile in database
      const profile: CoreValueProfileInsert = {
        politician_id: politicianId,
        value_metrics: valueMetrics,
        authenticity_score: authenticityScore,
        greenwashing_flags: greenwashingFlags,
        priority_shifts: priorityShifts,
        behavioral_patterns: this.extractBehavioralPatterns(valueMetrics, greenwashingFlags),
        data_quality_score: dataQualityScore,
        calculated_at: new Date().toISOString()
      }

      const { data: savedProfile, error: saveError } = await this.db
        .from('core_value_profiles')
        .upsert(profile, { onConflict: 'politician_id' })
        .select()
        .single()

      if (saveError) {
        errors.push(`Failed to save profile: ${saveError.message}`)
      }

      console.log(`[ValueProfile] Profile calculated: authenticity=${authenticityScore}, flags=${greenwashingFlags.length}`)

      return {
        success: true,
        politicianId,
        profileId: savedProfile?.id,
        valueMetrics,
        authenticityScore,
        greenwashingFlags,
        priorityShifts,
        dataQualityScore,
        errors
      }
    } catch (error) {
      console.error('[ValueProfile] Calculation error:', error)
      return {
        success: false,
        politicianId,
        valueMetrics: this.getEmptyMetrics(),
        authenticityScore: null,
        greenwashingFlags: [],
        priorityShifts: [],
        dataQualityScore: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Calculate value metrics for each category
   */
  private calculateValueMetrics(
    promises: PromiseData[],
    verifications: { promise_id: string; match_type: string; match_confidence: number }[]
  ): Record<ValueCategory, ValueMetrics> {
    const metrics: Record<ValueCategory, ValueMetrics> = this.getEmptyMetrics()
    const verificationMap = new Map(verifications.map(v => [v.promise_id, v]))

    // Count promises per category
    for (const promise of promises) {
      const valueCategory = CATEGORY_MAPPING[promise.category] || 'other'
      metrics[valueCategory].promise_count++

      const verification = verificationMap.get(promise.id)
      if (verification) {
        switch (verification.match_type) {
          case 'kept':
            metrics[valueCategory].kept_count++
            break
          case 'broken':
            metrics[valueCategory].broken_count++
            break
          case 'partial':
            metrics[valueCategory].partial_count++
            break
        }
      }
    }

    // Calculate derived metrics
    const totalPromises = promises.length
    const categories = Object.entries(metrics).filter(([_, m]) => m.promise_count > 0)

    // Sort by promise count and assign priority rank
    categories
      .sort(([, a], [, b]) => b.promise_count - a.promise_count)
      .forEach(([category, _], index) => {
        const m = metrics[category as ValueCategory]
        const verified = m.kept_count + m.broken_count + m.partial_count

        // Consistency score: (kept + partial*0.5) / verified
        m.consistency_score = verified > 0
          ? Math.round(((m.kept_count + m.partial_count * 0.5) / verified) * 100)
          : 0

        // Attention score: percentage of total promises in this category
        m.attention_score = Math.round((m.promise_count / totalPromises) * 100)

        // Priority rank
        m.priority_rank = index + 1
      })

    return metrics
  }

  /**
   * Calculate authenticity score based on source agreement
   */
  private calculateAuthenticityScore(
    promises: PromiseData[],
    sources: SourceData[]
  ): number | null {
    // Group sources by promise
    const sourcesByPromise = new Map<string, SourceData[]>()
    for (const source of sources) {
      const existing = sourcesByPromise.get(source.promise_id) || []
      existing.push(source)
      sourcesByPromise.set(source.promise_id, existing)
    }

    // Count promises with multiple sources that agree
    let promisesWithMultipleSources = 0
    let promisesWithAgreement = 0
    let totalAgreementScore = 0

    for (const promise of promises) {
      const promiseSources = sourcesByPromise.get(promise.id) || []

      if (promiseSources.length >= MIN_SOURCES_FOR_AUTHENTICITY) {
        promisesWithMultipleSources++

        // Check if sources agree on status
        const statuses = promiseSources.map(s => s.status_claimed).filter(Boolean)
        const uniqueStatuses = new Set(statuses)

        if (uniqueStatuses.size === 1 && statuses.length >= MIN_SOURCES_FOR_AUTHENTICITY) {
          // Full agreement
          promisesWithAgreement++
          totalAgreementScore += 1.0
        } else if (uniqueStatuses.size === 2 && statuses.length >= 2) {
          // Partial agreement (e.g., kept vs partial)
          const mainStatus = statuses.sort((a, b) =>
            statuses.filter(s => s === b).length - statuses.filter(s => s === a).length
          )[0]
          const agreementRatio = statuses.filter(s => s === mainStatus).length / statuses.length
          totalAgreementScore += agreementRatio
        }
      }
    }

    // If not enough multi-source promises, return null
    if (promisesWithMultipleSources < 3) {
      return null
    }

    // Calculate authenticity score (0-100)
    const authenticityScore = Math.round(
      (totalAgreementScore / promisesWithMultipleSources) * 100
    )

    return Math.min(100, Math.max(0, authenticityScore))
  }

  /**
   * Detect greenwashing patterns
   */
  private detectGreenwashing(
    promises: PromiseData[],
    verifications: { promise_id: string; match_type: string }[],
    metrics: Record<ValueCategory, ValueMetrics>
  ): GreenwashingFlag[] {
    const flags: GreenwashingFlag[] = []
    const verificationMap = new Map(verifications.map(v => [v.promise_id, v]))

    // Pattern 1: High promise volume but low follow-through in specific categories
    for (const [category, metric] of Object.entries(metrics)) {
      if (metric.promise_count >= 5 && metric.consistency_score < 30) {
        flags.push({
          category: category as ValueCategory,
          type: 'greenwashing',
          severity: metric.consistency_score < 15 ? 'high' : 'medium',
          description: `${metric.promise_count} promesses dans ${this.getCategoryLabel(category as ValueCategory)} mais seulement ${metric.consistency_score}% de cohérence`,
          detected_at: new Date().toISOString()
        })
      }
    }

    // Pattern 2: Priority mismatch (talks a lot about X but breaks most X promises)
    const topCategory = Object.entries(metrics)
      .filter(([_, m]) => m.promise_count > 0)
      .sort(([, a], [, b]) => b.attention_score - a.attention_score)[0]

    if (topCategory) {
      const [category, metric] = topCategory
      if (metric.attention_score > 25 && metric.consistency_score < 40) {
        flags.push({
          category: category as ValueCategory,
          type: 'priority_mismatch',
          severity: 'high',
          description: `${this.getCategoryLabel(category as ValueCategory)} représente ${metric.attention_score}% du discours mais ${metric.broken_count} promesses non tenues`,
          detected_at: new Date().toISOString()
        })
      }
    }

    // Pattern 3: Environmental greenwashing specifically
    const envMetric = metrics.environment
    if (envMetric.promise_count >= 3 && envMetric.consistency_score < 40) {
      // Check if there's a pattern of environmental promises being broken
      const envPromises = promises.filter(p =>
        CATEGORY_MAPPING[p.category] === 'environment'
      )
      const envBroken = envPromises.filter(p => {
        const v = verificationMap.get(p.id)
        return v?.match_type === 'broken'
      })

      if (envBroken.length >= 2) {
        // Check if not already flagged
        if (!flags.some(f => f.category === 'environment' && f.type === 'greenwashing')) {
          flags.push({
            category: 'environment',
            type: 'greenwashing',
            severity: envBroken.length >= 3 ? 'high' : 'medium',
            description: `Greenwashing détecté: ${envBroken.length} promesses environnementales non tenues sur ${envMetric.promise_count}`,
            detected_at: new Date().toISOString()
          })
        }
      }
    }

    return flags
  }

  /**
   * Detect priority shifts over time
   */
  private detectPriorityShifts(promises: PromiseData[]): PriorityShift[] {
    const shifts: PriorityShift[] = []

    // Sort promises by date
    const sortedPromises = [...promises].sort((a, b) =>
      new Date(a.promise_date).getTime() - new Date(b.promise_date).getTime()
    )

    if (sortedPromises.length < 10) {
      return [] // Not enough data for trend detection
    }

    // Split into two periods
    const midpoint = Math.floor(sortedPromises.length / 2)
    const earlyPromises = sortedPromises.slice(0, midpoint)
    const latePromises = sortedPromises.slice(midpoint)

    // Calculate category distribution for each period
    const earlyDist = this.getCategoryDistribution(earlyPromises)
    const lateDist = this.getCategoryDistribution(latePromises)

    // Find significant shifts (>15% change)
    for (const [category, earlyPct] of Object.entries(earlyDist)) {
      const latePct = lateDist[category] || 0
      const shift = latePct - earlyPct

      if (Math.abs(shift) > 15) {
        // Find the category that gained/lost the opposite amount
        const oppositeCategory = Object.entries(lateDist)
          .filter(([c]) => c !== category)
          .sort((a, b) => {
            const aShift = (a[1] || 0) - (earlyDist[a[0]] || 0)
            const bShift = (b[1] || 0) - (earlyDist[b[0]] || 0)
            return shift > 0 ? aShift - bShift : bShift - aShift
          })[0]

        if (oppositeCategory) {
          shifts.push({
            from_category: shift > 0 ? oppositeCategory[0] as ValueCategory : category as ValueCategory,
            to_category: shift > 0 ? category as ValueCategory : oppositeCategory[0] as ValueCategory,
            shift_date: latePromises[0]?.promise_date || new Date().toISOString(),
            magnitude: Math.abs(shift),
            reason: `Changement de priorité: ${Math.abs(shift)}% de variation`
          })
        }
      }
    }

    return shifts.slice(0, 3) // Limit to top 3 shifts
  }

  /**
   * Get category distribution as percentages
   */
  private getCategoryDistribution(promises: PromiseData[]): Record<string, number> {
    const counts: Record<string, number> = {}
    const total = promises.length

    for (const promise of promises) {
      const category = CATEGORY_MAPPING[promise.category] || 'other'
      counts[category] = (counts[category] || 0) + 1
    }

    return Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 100)])
    )
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(
    promiseCount: number,
    sourceCount: number,
    verificationCount: number
  ): number {
    // Quality factors (each contributes 0-0.33)
    const promiseScore = Math.min(promiseCount / 20, 1) * 0.33 // 20+ promises = full score
    const sourceScore = Math.min(sourceCount / promiseCount / 2, 1) * 0.33 // 2+ sources per promise = full
    const verificationScore = Math.min(verificationCount / promiseCount, 1) * 0.34 // All verified = full

    return Math.round((promiseScore + sourceScore + verificationScore) * 100) / 100
  }

  /**
   * Extract behavioral patterns from metrics
   */
  private extractBehavioralPatterns(
    metrics: Record<ValueCategory, ValueMetrics>,
    flags: GreenwashingFlag[]
  ): string[] {
    const patterns: string[] = []

    // Find top priority
    const topCategories = Object.entries(metrics)
      .filter(([_, m]) => m.promise_count > 0)
      .sort(([, a], [, b]) => b.promise_count - a.promise_count)
      .slice(0, 3)

    if (topCategories.length > 0) {
      patterns.push(`Priorité principale: ${this.getCategoryLabel(topCategories[0][0] as ValueCategory)}`)
    }

    // Find strongest category (highest consistency)
    const strongestCategory = Object.entries(metrics)
      .filter(([_, m]) => m.promise_count >= 3)
      .sort(([, a], [, b]) => b.consistency_score - a.consistency_score)[0]

    if (strongestCategory && strongestCategory[1].consistency_score >= 70) {
      patterns.push(`Fort sur: ${this.getCategoryLabel(strongestCategory[0] as ValueCategory)} (${strongestCategory[1].consistency_score}%)`)
    }

    // Find weakest category
    const weakestCategory = Object.entries(metrics)
      .filter(([_, m]) => m.promise_count >= 3)
      .sort(([, a], [, b]) => a.consistency_score - b.consistency_score)[0]

    if (weakestCategory && weakestCategory[1].consistency_score <= 40) {
      patterns.push(`Faible sur: ${this.getCategoryLabel(weakestCategory[0] as ValueCategory)} (${weakestCategory[1].consistency_score}%)`)
    }

    // Add greenwashing pattern if detected
    if (flags.some(f => f.type === 'greenwashing' && f.severity === 'high')) {
      patterns.push('Tendance au greenwashing détectée')
    }

    return patterns
  }

  /**
   * Get French label for category
   */
  private getCategoryLabel(category: ValueCategory): string {
    const labels: Record<ValueCategory, string> = {
      economy: 'Économie',
      environment: 'Environnement',
      social_justice: 'Justice sociale',
      security: 'Sécurité',
      immigration: 'Immigration',
      health: 'Santé',
      education: 'Éducation',
      foreign_policy: 'Politique étrangère',
      other: 'Autre'
    }
    return labels[category] || category
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): Record<ValueCategory, ValueMetrics> {
    const emptyMetric: ValueMetrics = {
      promise_count: 0,
      kept_count: 0,
      broken_count: 0,
      partial_count: 0,
      consistency_score: 0,
      attention_score: 0,
      priority_rank: 0
    }

    return {
      economy: { ...emptyMetric },
      environment: { ...emptyMetric },
      social_justice: { ...emptyMetric },
      security: { ...emptyMetric },
      immigration: { ...emptyMetric },
      health: { ...emptyMetric },
      education: { ...emptyMetric },
      foreign_policy: { ...emptyMetric },
      other: { ...emptyMetric }
    }
  }

  /**
   * Calculate profiles for all politicians
   */
  async calculateAllProfiles(): Promise<{
    success: boolean
    processed: number
    succeeded: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let succeeded = 0
    let failed = 0

    try {
      // Get all politicians with promises
      const { data: politicians, error } = await this.db
        .from('politicians')
        .select('id, name')
        .eq('is_active', true)

      if (error) throw error

      console.log(`[ValueProfile] Calculating profiles for ${politicians?.length || 0} politicians`)

      for (const politician of politicians || []) {
        const result = await this.calculateProfile(politician.id)
        processed++

        if (result.success) {
          succeeded++
        } else {
          failed++
          if (result.errors.length > 0) {
            errors.push(`${politician.name}: ${result.errors.join(', ')}`)
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[ValueProfile] Completed: ${succeeded} succeeded, ${failed} failed`)

      return {
        success: failed === 0,
        processed,
        succeeded,
        failed,
        errors
      }
    } catch (error) {
      return {
        success: false,
        processed,
        succeeded,
        failed,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

// Export singleton
export const valueProfileCalculator = new ValueProfileCalculator()
