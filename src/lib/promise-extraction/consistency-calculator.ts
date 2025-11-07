/**
 * Consistency Score Calculator
 * Computes objective scores based on promise-action matching
 *
 * Scores are pure mathematics - no subjective judgments
 */

import { supabase } from '@/lib/supabase'

export interface ConsistencyMetrics {
  politicianId: string
  overallScore: number // 0-100
  promisesKept: number
  promisesBroken: number
  promisesPartial: number
  promisesPending: number
  totalPromises: number
  attendanceRate: number | null
  sessionsAttended: number
  sessionsScheduled: number
  legislativeActivityScore: number | null
  billsSponsored: number
  amendmentsProposed: number
  debatesParticipated: number
  questionsAsked: number
  dataQualityScore: number // 0-1, how complete is the data
  lastCalculatedAt: Date
}

export class ConsistencyCalculator {
  /**
   * Calculate overall consistency score for a politician
   */
  async calculateConsistencyScore(
    politicianId: string
  ): Promise<ConsistencyMetrics> {
    // Get all verified promise matches
    const { data: verifications } = await supabase
      .from('promise_verifications')
      .select('match_type, match_confidence')
      .eq('verified_at', 'IS NOT NULL')
      .eq('is_disputed', false)
      .in('promise_id', [
        supabase
          .from('political_promises')
          .select('id')
          .eq('politician_id', politicianId)
      ])

    if (!verifications || verifications.length === 0) {
      return this.getEmptyMetrics(politicianId)
    }

    // Count promises by outcome
    const kept = verifications.filter(v => v.match_type === 'kept').length
    const broken = verifications.filter(v => v.match_type === 'broken').length
    const partial = verifications.filter(v => v.match_type === 'partial').length
    const pending = verifications.filter(v => v.match_type === 'pending').length

    const total = kept + broken + partial + pending

    // Calculate score: kept=100%, partial=50%, broken=0%
    const score =
      total > 0
        ? ((kept * 100 + partial * 50) / total) * (total / (total + pending))
        : 0

    // Get attendance data
    const attendance = await this.calculateAttendance(politicianId)

    // Get legislative activity
    const activity = await this.calculateLegislativeActivity(politicianId)

    // Calculate data quality score
    const dataQuality = this.assessDataQuality(
      total,
      attendance.total,
      activity.total
    )

    return {
      politicianId,
      overallScore: Math.round(score * 100) / 100,
      promisesKept: kept,
      promisesBroken: broken,
      promisesPartial: partial,
      promisesPending: pending,
      totalPromises: total,
      attendanceRate: attendance.rate,
      sessionsAttended: attendance.attended,
      sessionsScheduled: attendance.total,
      legislativeActivityScore: activity.score,
      billsSponsored: activity.bills,
      amendmentsProposed: activity.amendments,
      debatesParticipated: activity.debates,
      questionsAsked: activity.questions,
      dataQualityScore: dataQuality,
      lastCalculatedAt: new Date()
    }
  }

  /**
   * Calculate attendance rate from voting records
   */
  private async calculateAttendance(
    politicianId: string
  ): Promise<{ attended: number; total: number; rate: number | null }> {
    const { data: votes } = await supabase
      .from('parliamentary_actions')
      .select('vote_position')
      .eq('politician_id', politicianId)
      .eq('action_type', 'vote')

    if (!votes || votes.length === 0) {
      return { attended: 0, total: 0, rate: null }
    }

    const total = votes.length
    const attended = votes.filter(v => v.vote_position !== 'absent').length

    return {
      attended,
      total,
      rate: Math.round((attended / total) * 100 * 100) / 100
    }
  }

  /**
   * Calculate legislative activity score
   */
  private async calculateLegislativeActivity(
    politicianId: string
  ): Promise<{
    score: number | null
    bills: number
    amendments: number
    debates: number
    questions: number
    total: number
  }> {
    const { data: actions } = await supabase
      .from('parliamentary_actions')
      .select('action_type')
      .eq('politician_id', politicianId)

    if (!actions || actions.length === 0) {
      return {
        score: null,
        bills: 0,
        amendments: 0,
        debates: 0,
        questions: 0,
        total: 0
      }
    }

    const bills = actions.filter(a => a.action_type === 'bill_sponsor').length
    const amendments = actions.filter(a => a.action_type === 'amendment').length
    const debates = actions.filter(a => a.action_type === 'debate').length
    const questions = actions.filter(a => a.action_type === 'question').length

    const total = bills + amendments + debates + questions

    // Score: weighted by activity type
    // Bills = 10 points, Amendments = 5 points, Debates = 2 points, Questions = 1 point
    const rawScore = bills * 10 + amendments * 5 + debates * 2 + questions * 1

    // Normalize to 0-100 scale (assume max 50 bills = 100 score)
    const score = Math.min((rawScore / 500) * 100, 100)

    return {
      score: Math.round(score * 100) / 100,
      bills,
      amendments,
      debates,
      questions,
      total
    }
  }

  /**
   * Assess data quality score
   */
  private assessDataQuality(
    promiseCount: number,
    voteCount: number,
    activityCount: number
  ): number {
    // Minimum thresholds for good data quality
    const minPromises = 5
    const minVotes = 50
    const minActivity = 10

    const promiseScore = Math.min(promiseCount / minPromises, 1)
    const voteScore = Math.min(voteCount / minVotes, 1)
    const activityScore = Math.min(activityCount / minActivity, 1)

    // Weighted average: promises matter most
    return (
      Math.round(
        (promiseScore * 0.5 + voteScore * 0.3 + activityScore * 0.2) * 100
      ) / 100
    )
  }

  /**
   * Get empty metrics for politicians with no data
   */
  private getEmptyMetrics(politicianId: string): ConsistencyMetrics {
    return {
      politicianId,
      overallScore: 0,
      promisesKept: 0,
      promisesBroken: 0,
      promisesPartial: 0,
      promisesPending: 0,
      totalPromises: 0,
      attendanceRate: null,
      sessionsAttended: 0,
      sessionsScheduled: 0,
      legislativeActivityScore: null,
      billsSponsored: 0,
      amendmentsProposed: 0,
      debatesParticipated: 0,
      questionsAsked: 0,
      dataQualityScore: 0,
      lastCalculatedAt: new Date()
    }
  }

  /**
   * Store calculated metrics in database
   */
  async storeConsistencyScore(metrics: ConsistencyMetrics): Promise<void> {
    await supabase.from('consistency_scores').upsert(
      {
        politician_id: metrics.politicianId,
        overall_score: metrics.overallScore,
        promises_kept: metrics.promisesKept,
        promises_broken: metrics.promisesBroken,
        promises_partial: metrics.promisesPartial,
        promises_pending: metrics.promisesPending,
        attendance_rate: metrics.attendanceRate,
        sessions_attended: metrics.sessionsAttended,
        sessions_scheduled: metrics.sessionsScheduled,
        legislative_activity_score: metrics.legislativeActivityScore,
        bills_sponsored: metrics.billsSponsored,
        amendments_proposed: metrics.amendmentsProposed,
        debates_participated: metrics.debatesParticipated,
        questions_asked: metrics.questionsAsked,
        data_quality_score: metrics.dataQualityScore,
        last_calculated_at: metrics.lastCalculatedAt.toISOString()
      },
      {
        onConflict: 'politician_id'
      }
    )
  }

  /**
   * Batch calculate scores for multiple politicians
   */
  async batchCalculate(politicianIds: string[]): Promise<ConsistencyMetrics[]> {
    const metrics: ConsistencyMetrics[] = []

    for (const id of politicianIds) {
      try {
        const score = await this.calculateConsistencyScore(id)
        await this.storeConsistencyScore(score)
        metrics.push(score)
      } catch (error) {
        console.error(`Failed to calculate score for ${id}:`, error)
      }
    }

    return metrics
  }

  /**
   * Calculate scores for all politicians with promises
   */
  async calculateAllScores(): Promise<{
    updated: number
    failed: number
    duration: number
  }> {
    const startTime = Date.now()

    // Get all politicians with promises
    const { data: promises } = await supabase
      .from('political_promises')
      .select('politician_id')

    if (!promises || promises.length === 0) {
      return { updated: 0, failed: 0, duration: 0 }
    }

    // Get unique politician IDs
    const politicianIds = [...new Set(promises.map((p: { politician_id: string }) => p.politician_id))]

    let updated = 0
    let failed = 0

    for (const id of politicianIds) {
      try {
        const metrics = await this.calculateConsistencyScore(id)
        await this.storeConsistencyScore(metrics)
        updated++
      } catch (error) {
        console.error(`Failed to calculate score for ${id}:`, error)
        failed++
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    return { updated, failed, duration }
  }
}

// Export singleton
export const consistencyCalculator = new ConsistencyCalculator()
