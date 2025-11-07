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

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'moderator'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    // Get collection type from request body
    const body = await request.json()
    const { type = 'full', limit } = body

    console.log(`Starting ${type} data collection...`)

    let result

    switch (type) {
      case 'deputies':
        result = await dataCollectionOrchestrator.collectDeputiesData()
        break

      case 'votes':
        result = await dataCollectionOrchestrator.collectDeputiesVotes(limit)
        break

      case 'activity':
        result = await dataCollectionOrchestrator.collectDeputiesActivity(limit)
        break

      case 'full':
        result = await dataCollectionOrchestrator.runFullCollection()
        break

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
