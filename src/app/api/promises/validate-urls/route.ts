/**
 * API Route: URL Health Check
 * POST /api/promises/validate-urls
 *
 * Validates URLs for existing promises and updates health status
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateURL, getURLUpdateData } from '@/lib/validation/url-validator'
import { withAdminAuth } from '@/lib/middleware/auth'

interface Promise {
  id: string
  source_url: string
  url_check_attempts: number
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req) => {
    try {
      const body = await req.json()
      const { promiseIds, limit = 50 } = body

      // Fetch promises needing URL validation
      let query = supabase
        .from('political_promises')
        .select('id, source_url, url_check_attempts, source_url_status')

      if (promiseIds && Array.isArray(promiseIds)) {
        // Validate specific promises
        query = query.in('id', promiseIds)
      } else {
        // Validate unchecked or failed URLs
        query = query.or(
          'source_url_status.eq.unchecked,' +
          'source_url_status.eq.timeout,' +
          'source_url_status.eq.server_error'
        )
        query = query.limit(limit)
      }

      const { data: promises, error: fetchError } = await query

      if (fetchError) throw fetchError

      if (!promises || promises.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No promises found needing URL validation',
          validated: 0,
          results: []
        })
      }

      console.log(`Validating ${promises.length} promise URLs...`)

      const results = []

      // Validate each URL with rate limiting
      for (const promise of promises as Promise[]) {
        try {
          const validationResult = await validateURL(promise.source_url)
          const urlHealthData = await getURLUpdateData(
            validationResult,
            promise.url_check_attempts || 0
          )

          // Update promise with URL health data
          const { error: updateError } = await supabase
            .from('political_promises')
            .update(urlHealthData)
            .eq('id', promise.id)

          if (updateError) {
            console.error(`Failed to update promise ${promise.id}:`, updateError)
            results.push({
              promiseId: promise.id,
              url: promise.source_url,
              status: 'update_failed',
              error: updateError.message
            })
          } else {
            results.push({
              promiseId: promise.id,
              url: promise.source_url,
              status: validationResult.status,
              httpStatus: validationResult.httpStatus,
              isAccessible: validationResult.isAccessible,
              responseTime: validationResult.responseTime,
              archiveUrl: validationResult.archiveUrl
            })
          }

          // Rate limiting: 100ms delay between requests
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Error validating promise ${promise.id}:`, error)
          results.push({
            promiseId: promise.id,
            url: promise.source_url,
            status: 'validation_error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Generate summary
      const summary = {
        total: results.length,
        valid: results.filter(r => r.status === 'valid').length,
        redirect: results.filter(r => r.status === 'redirect').length,
        archived_only: results.filter(r => r.status === 'archived_only').length,
        client_error: results.filter(r => r.status === 'client_error').length,
        server_error: results.filter(r => r.status === 'server_error').length,
        network_error: results.filter(r => r.status === 'network_error').length,
        timeout: results.filter(r => r.status === 'timeout').length
      }

      return NextResponse.json({
        success: true,
        validated: results.length,
        summary,
        results,
        message: `Validated ${results.length} URLs. ${summary.valid} valid, ${summary.client_error + summary.server_error + summary.network_error} failed.`
      })
    } catch (error) {
      console.error('URL validation error:', error)

      return NextResponse.json(
        {
          error: 'URL validation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}

// GET endpoint to retrieve URL health statistics
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
      // Get URL health summary from database function
      const { data: summary, error } = await supabase
        .rpc('get_url_health_summary')

      if (error) throw error

      // Get total promises count
      const { count: totalPromises } = await supabase
        .from('political_promises')
        .select('*', { count: 'exact', head: true })

      // Get promises needing validation
      const { count: needsValidation } = await supabase
        .from('political_promises')
        .select('*', { count: 'exact', head: true })
        .or(
          'source_url_status.eq.unchecked,' +
          'source_url_status.eq.timeout,' +
          'source_url_status.eq.server_error'
        )

      return NextResponse.json({
        success: true,
        totalPromises: totalPromises || 0,
        needsValidation: needsValidation || 0,
        statusBreakdown: summary || [],
        recommendation:
          (needsValidation || 0) > 0
            ? `${needsValidation} URLs need validation. Run POST /api/promises/validate-urls to check them.`
            : 'All URLs are validated.'
      })
    } catch (error) {
      console.error('Error fetching URL health stats:', error)

      return NextResponse.json(
        {
          error: 'Failed to fetch URL health statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
