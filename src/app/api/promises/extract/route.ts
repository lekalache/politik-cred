/**
 * API Route: Promise Extraction
 * POST /api/promises/extract
 *
 * Extracts promises from text and stores them in database
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { promiseClassifier } from '@/lib/promise-extraction/promise-classifier'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  PromiseExtractionSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'
import { validateURL, getURLUpdateData } from '@/lib/validation/url-validator'

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.moderate, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(PromiseExtractionSchema, body)

        if (!validation.success) {
          return NextResponse.json(
            formatValidationErrors(validation.errors),
            { status: 400 }
          )
        }

        const { politicianId, text, sourceUrl, sourceType, date } = validation.data

        // STEP 1: Validate source URL before processing
        console.log(`Validating source URL: ${sourceUrl}`)
        const urlValidation = await validateURL(sourceUrl)

        if (!urlValidation.isAccessible) {
          return NextResponse.json(
            {
              error: 'Source URL is not accessible',
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

        // Use redirect URL if available (permanent redirect)
        const effectiveUrl = urlValidation.redirectUrl || sourceUrl

        console.log(
          `URL validation: ${urlValidation.status} (HTTP ${urlValidation.httpStatus}, ${urlValidation.responseTime}ms)`
        )

        // STEP 2: Extract promises from text
        const promises = promiseClassifier.extractPromises(text, effectiveUrl)

        console.log(
          `Extracted ${promises.length} promises from ${effectiveUrl} by ${authContext.user.email}`
        )

        // STEP 3: Get URL health data for storage
        const urlHealthData = await getURLUpdateData(urlValidation, 0)

        // STEP 4: Store promises in database with URL health tracking
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
                source_url: effectiveUrl, // Use effective URL (after redirect)
                source_type: sourceType,
                extraction_method: 'ai_extracted',
                confidence_score: promise.confidence,
                verification_status: 'pending',
                is_actionable: promise.isActionable,
                // URL health tracking fields
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

        return NextResponse.json({
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
          message: `Successfully extracted and stored ${storedPromises.length} promises from verified source`
        })
      } catch (error) {
        console.error('Promise extraction error:', error)

        return NextResponse.json(
          {
            error: 'Promise extraction failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

// GET endpoint to view extracted promises for a politician
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

    const { data: promises, error } = await supabase
      .from('political_promises')
      .select('*')
      .eq('politician_id', politicianId)
      .order('promise_date', { ascending: false })

    if (error) throw error

    // Group by verification status
    const summary = {
      total: promises?.length || 0,
      pending: promises?.filter(p => p.verification_status === 'pending').length || 0,
      verified: promises?.filter(p => p.verification_status === 'verified').length || 0,
      actionable: promises?.filter(p => p.is_actionable).length || 0
    }

    return NextResponse.json({
      success: true,
      summary,
      promises
    })
  } catch (error) {
    console.error('Error fetching promises:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch promises',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
