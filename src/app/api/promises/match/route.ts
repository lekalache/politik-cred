/**
 * API Route: Promise-Action Matching
 * POST /api/promises/match
 *
 * Matches promises to parliamentary actions using semantic similarity
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { semanticMatcher } from '@/lib/promise-extraction/semantic-matcher'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  PromiseMatchingSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.strict, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(PromiseMatchingSchema, body)

        if (!validation.success) {
          return NextResponse.json(
            formatValidationErrors(validation.errors),
            { status: 400 }
          )
        }

        const { politicianId, promiseId, minConfidence, all } = validation.data

        if (all) {
          console.log(`Starting bulk matching for all politicians by ${authContext.user.email}`)

          // Get all politicians
          const { data: politicians, error: polError } = await supabase
            .from('politicians')
            .select('id, name')

          if (polError) throw polError

          if (!politicians || politicians.length === 0) {
            return NextResponse.json({
              success: true,
              message: 'No politicians found',
              matched: 0
            })
          }

          let totalMatched = 0
          let totalAutoMatched = 0
          let totalQueued = 0

          // Process each politician sequentially to avoid overwhelming the system
          for (const politician of politicians) {
            try {
              // Reuse the matching logic for each politician
              // Note: In a real production system, this should probably be a background job queue
              // For now, we'll do it in the request but with a timeout risk if there are many politicians

              // Get promises
              const { data: promises } = await supabase
                .from('political_promises')
                .select('id, promise_text, category')
                .eq('politician_id', politician.id)
                .eq('is_actionable', true)
                .eq('verification_status', 'pending')

              if (!promises || promises.length === 0) continue

              // Get actions
              const { data: actions } = await supabase
                .from('parliamentary_actions')
                .select('id, description, category, vote_position, bill_title')
                .eq('politician_id', politician.id)

              if (!actions || actions.length === 0) continue

              // Match
              const allMatches = await semanticMatcher.batchMatch(
                promises.map(p => ({
                  id: p.id,
                  text: p.promise_text,
                  category: p.category
                })),
                actions.map(a => ({
                  id: a.id,
                  description: a.description,
                  category: a.category || 'other',
                  votePosition: a.vote_position,
                  billTitle: a.bill_title
                }))
              )

              const { highConfidence, mediumConfidence } =
                semanticMatcher.filterByConfidence(allMatches, minConfidence)

              // Store high confidence
              for (const match of highConfidence) {
                await supabase.from('promise_verifications').insert({
                  promise_id: match.promiseId,
                  action_id: match.actionId,
                  match_type: match.matchType,
                  match_confidence: match.confidence,
                  verification_method: 'semantic_match',
                  evidence_urls: [],
                  explanation: match.explanation,
                  verified_at: new Date().toISOString()
                })
                totalAutoMatched++
              }

              // Store medium confidence
              for (const match of mediumConfidence) {
                await supabase.from('promise_verifications').insert({
                  promise_id: match.promiseId,
                  action_id: match.actionId,
                  match_type: match.matchType,
                  match_confidence: match.confidence,
                  verification_method: 'semantic_match',
                  evidence_urls: [],
                  explanation: match.explanation,
                  verified_at: null
                })
                totalQueued++
              }

              totalMatched += (highConfidence.length + mediumConfidence.length)

            } catch (err) {
              console.error(`Error matching for politician ${politician.name}:`, err)
              // Continue to next politician
            }
          }

          return NextResponse.json({
            success: true,
            message: `Bulk matching completed`,
            matched: totalMatched,
            autoMatched: totalAutoMatched,
            queuedForReview: totalQueued
          })

        } else {
          // Single politician matching (existing logic)
          // Get promises to match
          let promisesQuery = supabase
            .from('political_promises')
            .select('id, promise_text, category')
            .eq('politician_id', politicianId)
            .eq('is_actionable', true)
            .eq('verification_status', 'pending')

          if (promiseId) {
            promisesQuery = promisesQuery.eq('id', promiseId)
          }

          const { data: promises, error: promiseError } = await promisesQuery

          if (promiseError) throw promiseError

          if (!promises || promises.length === 0) {
            return NextResponse.json({
              success: true,
              message: 'No pending actionable promises found',
              matched: 0
            })
          }

          // Get parliamentary actions for this politician
          const { data: actions, error: actionError } = await supabase
            .from('parliamentary_actions')
            .select('id, description, category, vote_position, bill_title')
            .eq('politician_id', politicianId)

          if (actionError) throw actionError

          if (!actions || actions.length === 0) {
            return NextResponse.json({
              success: true,
              message: 'No parliamentary actions found for matching',
              matched: 0
            })
          }

          // Perform matching
          console.log(
            `Matching ${promises.length} promises against ${actions.length} actions for politician ${politicianId} by ${authContext.user.email}`
          )

          const allMatches = await semanticMatcher.batchMatch(
            promises.map(p => ({
              id: p.id,
              text: p.promise_text,
              category: p.category
            })),
            actions.map(a => ({
              id: a.id,
              description: a.description,
              category: a.category || 'other',
              votePosition: a.vote_position,
              billTitle: a.bill_title
            }))
          )

          // Filter by confidence
          const { highConfidence, mediumConfidence } =
            semanticMatcher.filterByConfidence(allMatches, minConfidence)

          console.log(
            `Found ${highConfidence.length} high-confidence matches, ${mediumConfidence.length} medium-confidence matches`
          )

          // Store high-confidence matches automatically
          let autoMatched = 0
          for (const match of highConfidence) {
            try {
              await supabase.from('promise_verifications').insert({
                promise_id: match.promiseId,
                action_id: match.actionId,
                match_type: match.matchType,
                match_confidence: match.confidence,
                verification_method: 'semantic_match',
                evidence_urls: [],
                explanation: match.explanation,
                verified_at: new Date().toISOString()
              })

              autoMatched++
            } catch (error) {
              console.error('Error storing match:', error)
            }
          }

          // Store medium-confidence matches for manual review
          let queuedForReview = 0
          for (const match of mediumConfidence) {
            try {
              await supabase.from('promise_verifications').insert({
                promise_id: match.promiseId,
                action_id: match.actionId,
                match_type: match.matchType,
                match_confidence: match.confidence,
                verification_method: 'semantic_match',
                evidence_urls: [],
                explanation: match.explanation,
                verified_at: null // Not verified yet - needs manual review
              })

              queuedForReview++
            } catch (error) {
              console.error('Error storing match for review:', error)
            }
          }

          return NextResponse.json({
            success: true,
            matched: autoMatched + queuedForReview,
            autoMatched,
            queuedForReview,
            summary: {
              promisesProcessed: promises.length,
              actionsChecked: actions.length,
              highConfidenceMatches: highConfidence.length,
              mediumConfidenceMatches: mediumConfidence.length
            }
          })
        }
      } catch (error) {
        console.error('Promise matching error:', error)

        return NextResponse.json(
          {
            error: 'Promise matching failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

// GET endpoint to view matches for review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const politicianId = searchParams.get('politicianId')
    const needsReview = searchParams.get('needsReview') === 'true'

    let query = supabase
      .from('promise_verifications')
      .select(
        `
        id,
        match_type,
        match_confidence,
        explanation,
        verified_at,
        promise:political_promises(id, promise_text, category),
        action:parliamentary_actions(id, description, vote_position, bill_title)
      `
      )
      .order('match_confidence', { ascending: false })

    if (politicianId) {
      query = query.in('promise_id', [
        supabase
          .from('political_promises')
          .select('id')
          .eq('politician_id', politicianId)
      ])
    }

    if (needsReview) {
      query = query.is('verified_at', null)
    }

    const { data: matches, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      matches
    })
  } catch (error) {
    console.error('Error fetching matches:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
