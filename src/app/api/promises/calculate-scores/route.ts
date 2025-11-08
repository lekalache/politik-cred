/**
 * API Route: Calculate Consistency Scores
 * POST /api/promises/calculate-scores
 *
 * Calculates and stores consistency scores for politicians
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { consistencyCalculator } from '@/lib/promise-extraction/consistency-calculator'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  ScoreCalculationSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.strict, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(ScoreCalculationSchema, body)

        if (!validation.success) {
          return NextResponse.json(
            formatValidationErrors(validation.errors),
            { status: 400 }
          )
        }

        const { politicianId, all } = validation.data

        if (all) {
          // Calculate for all politicians
          console.log(`Calculating scores for all politicians by ${authContext.user.email}`)

          const result = await consistencyCalculator.calculateAllScores()

          return NextResponse.json({
            success: true,
            message: `Score calculation completed`,
            updated: result.updated,
            failed: result.failed,
            duration: result.duration
          })
        } else {
          // Calculate for specific politician
          console.log(`Calculating score for politician ${politicianId} by ${authContext.user.email}`)

          const metrics = await consistencyCalculator.calculateConsistencyScore(
            politicianId!
          )

          await consistencyCalculator.storeConsistencyScore(metrics)

          return NextResponse.json({
            success: true,
            message: 'Score calculated successfully',
            metrics
          })
        }
      } catch (error) {
        console.error('Score calculation error:', error)

        return NextResponse.json(
          {
            error: 'Score calculation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

// GET endpoint to view consistency scores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const politicianId = searchParams.get('politicianId')
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')

    let query = supabase
      .from('consistency_scores')
      .select(
        `
        *,
        politician:politicians(id, name, party, position)
      `
      )
      .order('overall_score', { ascending: false })

    if (politicianId) {
      query = query.eq('politician_id', politicianId)
    }

    if (minScore) {
      query = query.gte('overall_score', parseFloat(minScore))
    }

    if (maxScore) {
      query = query.lte('overall_score', parseFloat(maxScore))
    }

    const { data: scores, error } = await query

    if (error) throw error

    // Calculate summary statistics
    const summary = scores
      ? {
          total: scores.length,
          averageScore:
            scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length,
          highestScore: Math.max(...scores.map(s => s.overall_score)),
          lowestScore: Math.min(...scores.map(s => s.overall_score)),
          withGoodData: scores.filter(s => s.data_quality_score >= 0.7).length
        }
      : null

    return NextResponse.json({
      success: true,
      summary,
      scores
    })
  } catch (error) {
    console.error('Error fetching scores:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
