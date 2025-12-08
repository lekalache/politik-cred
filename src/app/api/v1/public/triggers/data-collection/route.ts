/**
 * Public API: Data Collection Trigger
 * POST /api/v1/public/triggers/data-collection - Trigger parliamentary data collection
 *
 * Requires API key with 'trigger:data_collection' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import {
  DataCollectionSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'
import { DataCollectionOrchestrator } from '@/lib/scrapers/data-collection-orchestrator'
import crypto from 'crypto'

/**
 * POST /api/v1/public/triggers/data-collection
 * Trigger parliamentary data collection from Assemblée Nationale
 */
export async function POST(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

  return middleware(request, async (req, context) => {
    try {
      // Parse and validate request body
      const body = await req.json()
      const validation = await validateRequest(DataCollectionSchema, body)

      if (!validation.success) {
        return NextResponse.json(formatValidationErrors(validation.errors), {
          status: 400
        })
      }

      const { type, limit, forceRefresh } = validation.data

      console.log(
        `Data collection triggered by API key: ${context.keyName} (type: ${type}, limit: ${limit || 'all'})`
      )

      // Initialize orchestrator
      const orchestrator = new DataCollectionOrchestrator()

      // Execute collection based on type
      let result

      switch (type) {
        case 'full':
          result = await orchestrator.runFullCollection(limit)
          break

        case 'deputies':
          result = await orchestrator.collectDeputiesData(forceRefresh)
          break

        case 'incremental':
          result = await orchestrator.runIncrementalUpdate(limit || 50)
          break

        case 'senators':
          return NextResponse.json(
            {
              error: 'Senator data collection not yet implemented',
              code: 'NOT_IMPLEMENTED',
              message: 'Senator data collection is planned but not currently available'
            },
            { status: 501 }
          )

        default:
          return NextResponse.json(
            {
              error: 'Invalid collection type',
              code: 'INVALID_TYPE',
              message: `Collection type must be one of: full, deputies, incremental, senators`
            },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        type,
        result,
        message: `Data collection completed successfully`,
        meta: {
          api_version: 'v1',
          request_id: crypto.randomUUID(),
          api_key: context.keyName,
          triggered_at: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Data collection error:', error)
      return NextResponse.json(
        {
          error: 'Data collection failed',
          code: 'COLLECTION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/v1/public/triggers/data-collection
 * Get information about available data collection types
 */
export async function GET(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

  return middleware(request, async (req, context) => {
    return NextResponse.json({
      success: true,
      data: {
        availableTypes: [
          {
            type: 'full',
            description: 'Full data collection (deputies + votes + activity)',
            estimatedDuration: '5-10 minutes',
            rateLimit: '1 per 5 minutes'
          },
          {
            type: 'deputies',
            description: 'Collect only deputy profiles',
            estimatedDuration: '1-2 minutes',
            rateLimit: '1 per 5 minutes'
          },
          {
            type: 'incremental',
            description: 'Incremental update (limited number of records)',
            estimatedDuration: '30-60 seconds',
            rateLimit: '1 per 5 minutes'
          },
          {
            type: 'senators',
            description: 'Collect senator data (not yet implemented)',
            status: 'coming_soon'
          }
        ],
        parameters: {
          type: {
            required: false,
            default: 'incremental',
            options: ['full', 'deputies', 'incremental', 'senators']
          },
          limit: {
            required: false,
            description: 'Limit number of records to process',
            min: 1,
            max: 1000
          },
          forceRefresh: {
            required: false,
            default: false,
            description: 'Force refresh even if data is recent'
          }
        }
      },
      meta: {
        api_version: 'v1',
        request_id: crypto.randomUUID()
      }
    })
  })
}
