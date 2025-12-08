/**
 * Public API: Single Politician
 * GET /api/v1/public/politicians/[id] - Get single politician by ID
 *
 * Requires API key with 'read:politicians' scope
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
 * GET /api/v1/public/politicians/[id]
 * Get single politician with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const middleware = composeApiKeyMiddleware(['read:politicians'])

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

      // Fetch politician
      const { data: politician, error } = await supabase
        .from('politicians')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !politician) {
        return NextResponse.json(
          {
            error: 'Politician not found',
            code: 'NOT_FOUND',
            message: `No politician found with ID: ${id}`
          },
          { status: 404 }
        )
      }

      // Return response
      return NextResponse.json({
        success: true,
        data: politician,
        meta: {
          api_version: 'v1',
          request_id: crypto.randomUUID()
        }
      })
    } catch (error) {
      console.error('Error fetching politician:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch politician',
          code: 'FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
