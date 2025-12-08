/**
 * Public API: Politician Consistency Scores
 * GET /api/v1/public/politicians/[id]/scores - Get consistency scores for politician
 *
 * Requires API key with 'read:scores' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import crypto from 'crypto'

// Use service role for public API operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/v1/public/politicians/[id]/scores
 * Get consistency scores and metrics for a politician
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const middleware = composeApiKeyMiddleware(['read:scores'])

  return middleware(request, async (req, context) => {
    try {
      // Validate ID format
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return NextResponse.json(
          {
            error: 'Invalid politician ID format',
            code: 'INVALID_ID',
            message: 'Politician ID must be a valid UUID'
          },
          { status: 400 }
        )
      }

      // Fetch consistency scores
      const { data: scores, error } = await supabase
        .from('consistency_scores')
        .select('*')
        .eq('politician_id', id)
        .single()

      if (error || !scores) {
        return NextResponse.json(
          {
            error: 'Scores not found',
            code: 'NOT_FOUND',
            message: `No consistency scores found for politician ID: ${id}`,
            suggestion: 'Scores may not have been calculated yet. Try triggering score calculation via POST /api/v1/public/triggers/scores'
          },
          { status: 404 }
        )
      }

      // Return response
      return NextResponse.json({
        success: true,
        data: scores,
        meta: {
          api_version: 'v1',
          request_id: crypto.randomUUID(),
          last_calculated: scores.last_calculated_at
        }
      })
    } catch (error) {
      console.error('Error fetching scores:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch scores',
          code: 'FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
