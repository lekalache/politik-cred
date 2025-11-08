/**
 * API Route: Trigger Data Collection
 * POST /api/data-collection/collect
 *
 * Triggers data collection from French government sources
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { dataCollectionOrchestrator } from '@/lib/scrapers/data-collection-orchestrator'
import { supabase } from '@/lib/supabase'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  DataCollectionSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.dataCollection, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(DataCollectionSchema, body)

        if (!validation.success) {
          return NextResponse.json(
            formatValidationErrors(validation.errors),
            { status: 400 }
          )
        }

        const { type, limit } = validation.data

        console.log(`Starting ${type} data collection by ${authContext.user.email}`)

        let result

        switch (type) {
          case 'deputies':
            result = await dataCollectionOrchestrator.collectDeputiesData()
            break

          case 'full':
            result = await dataCollectionOrchestrator.runFullCollection()
            break

          case 'incremental':
            result = await dataCollectionOrchestrator.collectDeputiesVotes(limit)
            break

          case 'senators':
            // Not yet implemented
            return NextResponse.json(
              { error: 'Senator data collection not yet implemented' },
              { status: 501 }
            )

          default:
            return NextResponse.json(
              { error: `Unknown collection type: ${type}` },
              { status: 400 }
            )
        }

        return NextResponse.json({
          success: true,
          type,
          result,
          message: `Data collection completed successfully`
        })
      } catch (error) {
        console.error('Data collection error:', error)

        return NextResponse.json(
          {
            error: 'Data collection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

// GET endpoint to check collection status
export async function GET(request: NextRequest) {
  try {
    // Get recent collection jobs
    const { data: jobs, error } = await supabase
      .from('data_collection_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20)

    if (error) throw error

    // Calculate summary stats
    const summary = {
      total_jobs: jobs?.length || 0,
      completed: jobs?.filter(j => j.status === 'completed').length || 0,
      failed: jobs?.filter(j => j.status === 'failed').length || 0,
      running: jobs?.filter(j => j.status === 'running').length || 0,
      last_collection: jobs?.[0]?.started_at || null,
      total_records_collected: jobs?.reduce((sum, j) => sum + (j.records_collected || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      summary,
      recent_jobs: jobs
    })
  } catch (error) {
    console.error('Error fetching collection status:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch collection status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
