/**
 * Public API: Match Promises Trigger
 * POST /api/v1/public/triggers/match-promises - Trigger semantic matching for a politician's promises
 *
 * Requires API key with 'trigger:data_collection' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import { semanticMatcher } from '@/lib/promise-extraction/semantic-matcher'
import crypto from 'crypto'
import { z } from 'zod'

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
 * Request schema
 */
const MatchPromisesSchema = z.object({
    politicianId: z.string().uuid('Invalid politician ID format'),
    minConfidence: z.number().min(0).max(1).optional().default(0.6)
})

/**
 * Match promises to parliamentary actions
 */
async function matchPromisesToActions(
    politicianId: string,
    minConfidence: number
): Promise<{ matched: number; autoVerified: number; needsReview: number }> {
    try {
        // Get all unverified promises for this politician
        const { data: promises, error: promisesError } = await supabase
            .from('political_promises')
            .select('id, promise_text, category')
            .eq('politician_id', politicianId)
            .eq('verification_status', 'pending')
            .eq('is_actionable', true)

        if (promisesError || !promises || promises.length === 0) {
            return { matched: 0, autoVerified: 0, needsReview: 0 }
        }

        // Get all parliamentary actions for this politician
        const { data: actions, error: actionsError } = await supabase
            .from('parliamentary_actions')
            .select('id, description, category, vote_position, bill_title')
            .eq('politician_id', politicianId)

        if (actionsError || !actions) {
            return { matched: 0, autoVerified: 0, needsReview: 0 }
        }

        let totalMatched = 0
        let autoVerified = 0
        let needsReview = 0

        // Match each promise to actions
        for (const promise of promises) {
            const matches = await semanticMatcher.matchPromiseToActions(
                promise.id,
                promise.promise_text,
                promise.category,
                actions
            )

            for (const match of matches) {
                if (match.confidence < minConfidence) continue

                totalMatched++

                // Store verification
                const { error: verifyError } = await supabase
                    .from('promise_verifications')
                    .insert({
                        promise_id: promise.id,
                        action_id: match.actionId,
                        match_type: match.matchType,
                        match_confidence: match.confidence,
                        verification_method: 'semantic_match',
                        verified_at: match.confidence >= 0.85 ? new Date().toISOString() : null,
                        explanation: match.explanation
                    })

                if (!verifyError) {
                    if (match.confidence >= 0.85) {
                        autoVerified++
                    } else {
                        needsReview++
                    }
                }
            }
        }

        return { matched: totalMatched, autoVerified, needsReview }
    } catch (error) {
        console.error('Error matching promises:', error)
        return { matched: 0, autoVerified: 0, needsReview: 0 }
    }
}

/**
 * POST /api/v1/public/triggers/match-promises
 * Trigger semantic matching
 */
export async function POST(request: NextRequest) {
    const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

    return middleware(request, async (req, context) => {
        try {
            // Parse and validate request
            const body = await req.json()
            const validation = MatchPromisesSchema.safeParse(body)

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

            const { politicianId, minConfidence } = validation.data

            console.log(
                `Promise matching triggered for ${politicianId} by API key: ${context.keyName}`
            )

            // Execute matching
            const result = await matchPromisesToActions(politicianId, minConfidence)

            return NextResponse.json({
                success: true,
                data: result,
                message: `Matched ${result.matched} promises (${result.autoVerified} auto-verified)`,
                meta: {
                    api_version: 'v1',
                    request_id: crypto.randomUUID(),
                    api_key: context.keyName,
                    triggered_at: new Date().toISOString()
                }
            })
        } catch (error) {
            console.error('Matching error:', error)
            return NextResponse.json(
                {
                    error: 'Matching failed',
                    code: 'MATCHING_ERROR',
                    details: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            )
        }
    })
}
