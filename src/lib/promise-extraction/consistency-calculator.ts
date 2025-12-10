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

    // Total only counts verified promises (kept + broken + partial)
    // Pending promises don't affect the score
    const total = kept + broken + partial

    // Calculate score: kept=100%, partial=50%, broken=0%
    // Formula: (kept * 100 + partial * 50) / total
    const score =
      total > 0
        ? (kept * 100 + partial * 50) / total
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
    // 1. Store detailed metrics in consistency_scores table
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

    // 2. Update summary score in politicians table
    await supabase
      .from('politicians')
      .update({
        ai_score: Math.round(metrics.overallScore),
        ai_last_audited_at: metrics.lastCalculatedAt.toISOString()
      })
      .eq('id', metrics.politicianId)
  }

  /**
   * Batch calculate scores for multiple politicians
   * Optimized to fetch all data in 3 queries instead of N*4 queries
   */
  async batchCalculate(politicianIds: string[]): Promise<ConsistencyMetrics[]> {
    // Fetch all data in batch queries

    // 1. Get all promises for these politicians
    const { data: allPromises } = await supabase
      .from('political_promises')
      .select('id, politician_id')
      .in('politician_id', politicianIds)

    if (!allPromises || allPromises.length === 0) {
      return politicianIds.map(id => this.getEmptyMetrics(id))
    }

    const promiseIds = allPromises.map(p => p.id)

    // 2. Get all verifications for these promises
    const { data: allVerifications } = await supabase
      .from('promise_verifications')
      .select('promise_id, match_type, match_confidence')
      .in('promise_id', promiseIds)
      .eq('is_disputed', false)
      .not('verified_at', 'is', null)

    // 3. Get all actions for these politicians
    const { data: allActions } = await supabase
      .from('parliamentary_actions')
      .select('politician_id, action_type, vote_position')
      .in('politician_id', politicianIds)

    // Build lookup maps
    const promiseToPolitician = new Map(
      allPromises.map(p => [p.id, p.politician_id])
    )

    // Group verifications by politician
    const verificationsByPolitician = new Map<string, typeof allVerifications>()
    if (allVerifications) {
      for (const v of allVerifications) {
        const politicianId = promiseToPolitician.get(v.promise_id)
        if (politicianId) {
          if (!verificationsByPolitician.has(politicianId)) {
            verificationsByPolitician.set(politicianId, [])
          }
          verificationsByPolitician.get(politicianId)!.push(v)
        }
      }
    }

    // Group actions by politician
    const actionsByPolitician = new Map<string, typeof allActions>()
    if (allActions) {
      for (const action of allActions) {
        if (!actionsByPolitician.has(action.politician_id)) {
          actionsByPolitician.set(action.politician_id, [])
        }
        actionsByPolitician.get(action.politician_id)!.push(action)
      }
    }

    // Calculate metrics for each politician
    const metrics: ConsistencyMetrics[] = []
    const metricsToStore: any[] = []

    for (const politicianId of politicianIds) {
      try {
        const verifications = verificationsByPolitician.get(politicianId) || []
        const actions = actionsByPolitician.get(politicianId) || []

        if (verifications.length === 0) {
          const emptyMetric = this.getEmptyMetrics(politicianId)
          metrics.push(emptyMetric)
          continue
        }

        // Count promises by outcome
        const kept = verifications.filter(v => v.match_type === 'kept').length
        const broken = verifications.filter(v => v.match_type === 'broken').length
        const partial = verifications.filter(v => v.match_type === 'partial').length
        const pending = verifications.filter(v => v.match_type === 'pending').length
        const total = kept + broken + partial

        // Calculate score
        const score = total > 0 ? (kept * 100 + partial * 50) / total : 0

        // Calculate attendance
        const votes = actions.filter(a => a.action_type === 'vote')
        const attended = votes.filter(v => v.vote_position !== 'absent').length
        const attendanceRate = votes.length > 0
          ? Math.round((attended / votes.length) * 100 * 100) / 100
          : null

        // Calculate legislative activity
        const bills = actions.filter(a => a.action_type === 'bill_sponsor').length
        const amendments = actions.filter(a => a.action_type === 'amendment').length
        const debates = actions.filter(a => a.action_type === 'debate').length
        const questions = actions.filter(a => a.action_type === 'question').length
        const activityTotal = bills + amendments + debates + questions
        const rawScore = bills * 10 + amendments * 5 + debates * 2 + questions * 1
        const activityScore = activityTotal > 0
          ? Math.min((rawScore / 500) * 100, 100)
          : 0

        // Calculate data quality
        const dataQuality = this.assessDataQuality(total, votes.length, activityTotal)

        const metric: ConsistencyMetrics = {
          politicianId,
          overallScore: Math.round(score * 100) / 100,
          promisesKept: kept,
          promisesBroken: broken,
          promisesPartial: partial,
          promisesPending: pending,
          totalPromises: total,
          attendanceRate,
          sessionsAttended: attended,
          sessionsScheduled: votes.length,
          legislativeActivityScore: activityScore > 0
            ? Math.round(activityScore * 100) / 100
            : null,
          billsSponsored: bills,
          amendmentsProposed: amendments,
          debatesParticipated: debates,
          questionsAsked: questions,
          dataQualityScore: dataQuality,
          lastCalculatedAt: new Date()
        }

        metrics.push(metric)
        metricsToStore.push({
          politician_id: metric.politicianId,
          overall_score: metric.overallScore,
          promises_kept: metric.promisesKept,
          promises_broken: metric.promisesBroken,
          promises_partial: metric.promisesPartial,
          promises_pending: metric.promisesPending,
          attendance_rate: metric.attendanceRate,
          sessions_attended: metric.sessionsAttended,
          sessions_scheduled: metric.sessionsScheduled,
          legislative_activity_score: metric.legislativeActivityScore,
          bills_sponsored: metric.billsSponsored,
          amendments_proposed: metric.amendmentsProposed,
          debates_participated: metric.debatesParticipated,
          questions_asked: metric.questionsAsked,
          data_quality_score: metric.dataQualityScore,
          last_calculated_at: metric.lastCalculatedAt.toISOString()
        })
      } catch (error) {
        console.error(`Failed to calculate score for ${politicianId}:`, error)
      }
    }

    // Batch upsert all metrics in one query
    if (metricsToStore.length > 0) {
      await supabase
        .from('consistency_scores')
        .upsert(metricsToStore, { onConflict: 'politician_id' })

      // Update politicians table (one by one for now as bulk update is complex without RPC)
      // This is acceptable as batch size is usually small (e.g. 10-20)
      for (const metric of metrics) {
        await supabase
          .from('politicians')
          .update({
            ai_score: Math.round(metric.overallScore),
            ai_last_audited_at: metric.lastCalculatedAt.toISOString()
          })
          .eq('id', metric.politicianId)
      }
    }

    return metrics
  }

  /**
   * Calculate scores for all politicians with promises
   * Optimized batch operation to eliminate N+1 queries
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

    console.log(`Calculating scores for ${politicianIds.length} politicians using batch operation...`)

    // Use optimized batch calculation
    const results = await this.batchCalculate(politicianIds)

    const duration = Math.round((Date.now() - startTime) / 1000)

    return {
      updated: results.length,
      failed: politicianIds.length - results.length,
      duration
    }
  }
}

// Export singleton
export const consistencyCalculator = new ConsistencyCalculator()
