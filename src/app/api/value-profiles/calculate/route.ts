/**
 * API Route: Value Profile Calculation
 * POST /api/value-profiles/calculate
 *
 * Calculates value profiles for politicians
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import { valueProfileCalculator } from '@/lib/value-profiles/value-profile-calculator'

// POST: Calculate profiles
export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.moderate, async () => {
    return withAdminAuth(request, async (req) => {
      try {
        const body = await req.json().catch(() => ({}))
        const { politicianId, calculateAll } = body

        if (calculateAll) {
          // Calculate all profiles
          console.log('[API] Calculating all value profiles...')
          const result = await valueProfileCalculator.calculateAllProfiles()

          return NextResponse.json({
            success: result.success,
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            errors: result.errors.slice(0, 10), // Limit error output
            message: `Calculated ${result.succeeded} profiles (${result.failed} failed)`
          })
        }

        if (!politicianId) {
          return NextResponse.json(
            { error: 'Missing politicianId parameter' },
            { status: 400 }
          )
        }

        // Calculate single profile
        console.log(`[API] Calculating profile for: ${politicianId}`)
        const result = await valueProfileCalculator.calculateProfile(politicianId)

        if (!result.success) {
          return NextResponse.json(
            {
              error: 'Profile calculation failed',
              errors: result.errors
            },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          profile: {
            id: result.profileId,
            politicianId: result.politicianId,
            authenticityScore: result.authenticityScore,
            greenwashingFlags: result.greenwashingFlags.length,
            priorityShifts: result.priorityShifts.length,
            dataQualityScore: result.dataQualityScore
          },
          valueMetrics: result.valueMetrics
        })
      } catch (error) {
        console.error('[API] Value profile calculation error:', error)

        return NextResponse.json(
          {
            error: 'Profile calculation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

// GET: Get profile for a politician
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const politicianId = searchParams.get('politicianId')

    if (!politicianId) {
      return NextResponse.json(
        { error: 'Missing politicianId parameter' },
        { status: 400 }
      )
    }

    // Use supabase to fetch the profile
    const { supabase } = await import('@/lib/supabase')

    const { data: profile, error } = await supabase
      .from('core_value_profiles')
      .select('*')
      .eq('politician_id', politicianId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found', politicianId },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error) {
    console.error('[API] Value profile fetch error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
