/**
 * Public API: Calculate Scores Trigger
 * POST /api/v1/public/triggers/calculate-scores - Trigger consistency score calculation
 *
 * Requires API key with 'trigger:data_collection' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import { consistencyCalculator } from '@/lib/promise-extraction/consistency-calculator'
import crypto from 'crypto'
import { z } from 'zod'

/**
 * Request schema
 */
const CalculateScoresSchema = z.object({
    politicianId: z.string().uuid('Invalid politician ID format')
})

/**
 * POST /api/v1/public/triggers/calculate-scores
 * Trigger score calculation
 */
export async function POST(request: NextRequest) {
    const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

    return middleware(request, async (req, context) => {
        try {
            // Parse and validate request
            const body = await req.json()
            const validation = CalculateScoresSchema.safeParse(body)

            if (!validation.success) {
                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        details: validation.error.issues.map(i => ({
                            field: i.path.join('.'),
                            message: i.message
                        }))
                    },
                    { status: 400 }
                )
            }

            const { politicianId } = validation.data

            console.log(
                `Score calculation triggered for ${politicianId} by API key: ${context.keyName}`
            )

            // Execute calculation
            const metrics = await consistencyCalculator.calculateConsistencyScore(politicianId)
            await consistencyCalculator.storeConsistencyScore(metrics)

            return NextResponse.json({
                success: true,
                data: metrics,
                message: `Consistency score calculated: ${metrics.overallScore}/100`,
                meta: {
                    api_version: 'v1',
                    request_id: crypto.randomUUID(),
                    api_key: context.keyName,
                    triggered_at: new Date().toISOString()
                }
            })
        } catch (error) {
            console.error('Calculation error:', error)
            return NextResponse.json(
                {
                    error: 'Calculation failed',
                    code: 'CALCULATION_ERROR',
                    details: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            )
        }
    })
}
