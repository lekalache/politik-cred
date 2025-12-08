/**
 * Public API: Promises
 * GET /api/v1/public/promises - List promises with pagination and filtering
 * POST /api/v1/public/promises - Extract and submit promises
 *
 * Requires API key with 'read:promises' or 'write:promises' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import {
  PromiseExtractionSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'
import { promiseClassifier } from '@/lib/promise-extraction/promise-classifier'
import { validateURL, getURLUpdateData } from '@/lib/validation/url-validator'
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
 * GET /api/v1/public/promises
 * List promises with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['read:promises'])

  return middleware(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url)

      // Pagination
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

      // Filters
      const politicianId = searchParams.get('politicianId')
      const category = searchParams.get('category')
      const verificationStatus = searchParams.get('verificationStatus')
      const isActionable = searchParams.get('isActionable')
      const search = searchParams.get('search')
      const sortBy = searchParams.get('sortBy') || 'promise_date'
      const sortOrder = searchParams.get('sortOrder') || 'desc'

      // Build query
      let query = supabase
        .from('political_promises')
        .select('*', { count: 'exact' })

      // Apply filters
      if (politicianId) {
        query = query.eq('politician_id', politicianId)
      }

      if (category) {
        query = query.eq('category', category)
      }

      if (verificationStatus) {
        query = query.eq('verification_status', verificationStatus)
      }

      if (isActionable !== null && isActionable !== undefined) {
        query = query.eq('is_actionable', isActionable === 'true')
      }

      if (search) {
        query = query.ilike('promise_text', `%${search}%`)
      }

      // Apply sorting
      const validSortFields = ['promise_date', 'confidence_score', 'created_at', 'category']
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
          politicianId,
          category,
          verificationStatus,
          isActionable,
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
      console.error('Error fetching promises:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch promises',
          code: 'FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/v1/public/promises
 * Extract and submit political promises
 */
export async function POST(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['write:promises'])

  return middleware(request, async (req, context) => {
    try {
      // Parse and validate request body
      const body = await req.json()
      const validation = await validateRequest(PromiseExtractionSchema, body)

      if (!validation.success) {
        return NextResponse.json(formatValidationErrors(validation.errors), {
          status: 400
        })
      }

      const { politicianId, text, sourceUrl, sourceType, date } = validation.data

      // Validate source URL
      console.log(`Validating source URL: ${sourceUrl}`)
      const urlValidation = await validateURL(sourceUrl)

      if (!urlValidation.isAccessible) {
        return NextResponse.json(
          {
            error: 'Source URL is not accessible',
            code: 'URL_NOT_ACCESSIBLE',
            details: urlValidation.errorMessage,
            status: urlValidation.status,
            httpStatus: urlValidation.httpStatus,
            archiveUrl: urlValidation.archiveUrl,
            suggestion: urlValidation.archiveUrl
              ? 'An archived version is available. Use the archive URL instead.'
              : 'Please provide a valid, accessible source URL.'
          },
          { status: 400 }
        )
      }

      // Use redirect URL if available
      const effectiveUrl = urlValidation.redirectUrl || sourceUrl

      // Extract promises from text
      const promises = promiseClassifier.extractPromises(text, effectiveUrl)

      console.log(
        `Extracted ${promises.length} promises from ${effectiveUrl} via API key: ${context.keyName}`
      )

      // Get URL health data
      const urlHealthData = await getURLUpdateData(urlValidation, 0)

      // Store promises in database
      const storedPromises = []

      for (const promise of promises) {
        try {
          const { data, error } = await supabase
            .from('political_promises')
            .insert({
              politician_id: politicianId,
              promise_text: promise.text,
              promise_date: date || new Date().toISOString(),
              category: promise.category,
              source_url: effectiveUrl,
              source_type: sourceType,
              extraction_method: 'ai_extracted',
              confidence_score: promise.confidence,
              verification_status: 'pending',
              is_actionable: promise.isActionable,
              // URL health tracking
              source_url_status: urlHealthData.source_url_status,
              source_url_http_status: urlHealthData.source_url_http_status,
              source_url_last_checked: urlHealthData.source_url_last_checked,
              source_url_redirect_url: urlHealthData.source_url_redirect_url,
              source_url_archive_url: urlHealthData.source_url_archive_url,
              source_url_error_message: urlHealthData.source_url_error_message,
              url_check_attempts: urlHealthData.url_check_attempts
            })
            .select()
            .single()

          if (error) {
            console.error('Error storing promise:', error)
            continue
          }

          storedPromises.push(data)
        } catch (error) {
          console.error('Error storing promise:', error)
        }
      }

      return NextResponse.json(
        {
          success: true,
          extracted: promises.length,
          stored: storedPromises.length,
          promises: storedPromises,
          urlValidation: {
            status: urlValidation.status,
            httpStatus: urlValidation.httpStatus,
            responseTime: urlValidation.responseTime,
            effectiveUrl: effectiveUrl,
            archiveUrl: urlValidation.archiveUrl
          },
          message: `Successfully extracted and stored ${storedPromises.length} promises from verified source`,
          meta: {
            api_version: 'v1',
            request_id: crypto.randomUUID(),
            api_key: context.keyName
          }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Promise extraction error:', error)
      return NextResponse.json(
        {
          error: 'Promise extraction failed',
          code: 'EXTRACTION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
