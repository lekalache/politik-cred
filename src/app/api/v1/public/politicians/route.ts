/**
 * Public API: Politicians
 * GET /api/v1/public/politicians - List politicians with pagination and filtering
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
 * GET /api/v1/public/politicians
 * List politicians with pagination, filtering, and sorting
 */
export async function GET(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['read:politicians'])

  return middleware(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url)

      // Pagination
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

      // Filters
      const party = searchParams.get('party')
      const position = searchParams.get('position')
      const isActive = searchParams.get('is_active')
      const search = searchParams.get('search')
      const sortBy = searchParams.get('sortBy') || 'name'
      const sortOrder = searchParams.get('sortOrder') || 'asc'

      // Build query
      let query = supabase
        .from('politicians')
        .select('*', { count: 'exact' })

      // Apply filters
      if (party) {
        query = query.eq('party', party)
      }

      if (position) {
        query = query.eq('position', position)
      }

      if (isActive !== null && isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true')
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        )
      }

      // Apply sorting
      const validSortFields = [
        'name',
        'party',
        'position',
        'credibility_score',
        'created_at'
      ]
      if (validSortFields.includes(sortBy)) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      // Execute query
      const { data, error, count } = await query

      if (error) throw error

      // Return standardized response
      return NextResponse.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
          has_next: to < (count || 0) - 1,
          has_prev: page > 1
        },
        filters: {
          party,
          position,
          is_active: isActive,
          search,
          sortBy,
          sortOrder
        },
        meta: {
          api_version: 'v1',
          request_id: crypto.randomUUID()
        }
      })
    } catch (error) {
      console.error('Error fetching politicians:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch politicians',
          code: 'FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
