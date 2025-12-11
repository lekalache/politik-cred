/**
 * API Route: Full Analysis Pipeline
 * POST /api/admin/full-analysis
 *
 * Triggers the complete data analysis pipeline for all politicians
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dataCollectionOrchestrator } from '@/lib/scrapers/data-collection-orchestrator'

// Initialize admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface AnalysisStats {
  politicians: { total: number; processed: number }
  parliamentaryActions: { collected: number; errors: number }
  promises: { vigie: number; news: number }
  matching: { total: number; matched: number }
  scores: { calculated: number; errors: number }
  profiles: { generated: number; withFlags: number; errors: number }
  duration: number
}

// Streaming response helper
function createStreamResponse() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream({
    start(c) {
      controller = c
    }
  })

  const send = (data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const close = () => {
    controller.close()
  }

  return { stream, send, close }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse options from request
    const body = await request.json().catch(() => ({}))
    const options = {
      limit: body.limit || 0,
      skipParliament: body.skipParliament || false,
      skipVigie: body.skipVigie || true, // Skip by default (requires scraper)
      skipNews: body.skipNews || false,
      skipMatching: body.skipMatching || false,
      skipScores: body.skipScores || false,
      skipProfiles: body.skipProfiles || false,
    }

    const stats: AnalysisStats = {
      politicians: { total: 0, processed: 0 },
      parliamentaryActions: { collected: 0, errors: 0 },
      promises: { vigie: 0, news: 0 },
      matching: { total: 0, matched: 0 },
      scores: { calculated: 0, errors: 0 },
      profiles: { generated: 0, withFlags: 0, errors: 0 },
      duration: 0
    }

    // ========================================================================
    // PHASE 1: Get Politicians
    // ========================================================================
    const { data: politicians, count } = await supabase
      .from('politicians')
      .select('id, name, external_id', { count: 'exact' })
      .eq('is_active', true)

    if (!politicians || politicians.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No politicians found in database',
        stats
      }, { status: 400 })
    }

    const politicianIds = options.limit
      ? politicians.slice(0, options.limit).map(p => p.id)
      : politicians.map(p => p.id)

    stats.politicians.total = count || politicians.length
    stats.politicians.processed = politicianIds.length

    // ========================================================================
    // PHASE 2: Parliamentary Actions - ACTUAL DATA COLLECTION
    // ========================================================================
    if (!options.skipParliament) {
      console.log('🔄 Starting data collection from official sources...')

      try {
        // Run the full data collection pipeline
        const collectionResult = await dataCollectionOrchestrator.runFullCollection({
          skipVigie: true, // Skip Vigie for now (optional source)
          limit: options.limit || undefined
        })

        // Calculate total actions collected
        const totalActions =
          (collectionResult.deputies?.votes || 0) +
          (collectionResult.deputies?.questions || 0) +
          (collectionResult.deputies?.amendments || 0) +
          (collectionResult.senators?.votes || 0) +
          (collectionResult.senators?.questions || 0) +
          (collectionResult.senators?.amendments || 0) +
          (collectionResult.opendata?.votes || 0)

        const totalErrors =
          (collectionResult.deputies?.errors || 0) +
          (collectionResult.senators?.errors || 0) +
          (collectionResult.opendata?.errors || 0) +
          (collectionResult.rne?.errors || 0)

        stats.parliamentaryActions.collected = totalActions
        stats.parliamentaryActions.errors = totalErrors

        // Also update politicians count from RNE
        if (collectionResult.rne) {
          stats.politicians.total = collectionResult.rne.deputies + collectionResult.rne.senators
        }

        console.log(`✅ Collection complete: ${totalActions} actions, ${totalErrors} errors`)
      } catch (error) {
        console.error('Data collection failed:', error)
        stats.parliamentaryActions.errors = 1

        // Fall back to counting existing data
        const { count: actionsCount } = await supabase
          .from('parliamentary_actions')
          .select('*', { count: 'exact', head: true })
          .in('politician_id', politicianIds)

        stats.parliamentaryActions.collected = actionsCount || 0
      }
    }

    // ========================================================================
    // PHASE 3: Check Vigie imports
    // ========================================================================
    if (!options.skipVigie) {
      const { count: vigieCount } = await supabase
        .from('promise_sources')
        .select('*', { count: 'exact', head: true })
        .eq('source_type', 'vigie')

      stats.promises.vigie = vigieCount || 0
    }

    // ========================================================================
    // PHASE 4: Check News promises
    // ========================================================================
    if (!options.skipNews) {
      const { count: newsCount } = await supabase
        .from('political_promises')
        .select('*', { count: 'exact', head: true })
        .eq('extraction_method', 'scraped')

      stats.promises.news = newsCount || 0
    }

    // ========================================================================
    // PHASE 5: Semantic Matching
    // ========================================================================
    if (!options.skipMatching) {
      for (const politicianId of politicianIds.slice(0, 20)) {
        try {
          // Get pending promises
          const { data: promises } = await supabase
            .from('political_promises')
            .select('id, promise_text, category')
            .eq('politician_id', politicianId)
            .eq('verification_status', 'pending')
            .limit(20)

          if (!promises?.length) continue

          // Get actions for matching
          const { data: actions } = await supabase
            .from('parliamentary_actions')
            .select('id, description, action_type, category')
            .eq('politician_id', politicianId)
            .limit(50)

          if (!actions?.length) continue

          stats.matching.total += promises.length

          // Simple keyword matching
          for (const promise of promises) {
            const matchingAction = actions.find(action => {
              const promiseWords = promise.promise_text.toLowerCase().split(/\s+/)
              const actionWords = action.description.toLowerCase().split(/\s+/)
              const common = promiseWords.filter((w: string) => w.length > 4 && actionWords.includes(w))
              return common.length >= 3 || promise.category === action.category
            })

            if (matchingAction) {
              await supabase.from('promise_verifications').upsert({
                promise_id: promise.id,
                action_id: matchingAction.id,
                match_type: 'pending',
                match_confidence: 0.5,
                verification_method: 'semantic_match',
                explanation: 'Auto-matched by keyword similarity',
              }, { onConflict: 'promise_id,action_id' })

              stats.matching.matched++
            }
          }
        } catch (error) {
          // Continue on error
        }
      }
    }

    // ========================================================================
    // PHASE 6: Calculate Consistency Scores
    // ========================================================================
    if (!options.skipScores) {
      for (const politicianId of politicianIds) {
        try {
          // Get verified promise counts using a different approach
          const { data: verifications } = await supabase
            .from('promise_verifications')
            .select('match_type, promise_id')

          if (!verifications?.length) continue

          // Get promises for this politician
          const { data: politicianPromises } = await supabase
            .from('political_promises')
            .select('id')
            .eq('politician_id', politicianId)

          if (!politicianPromises?.length) continue

          const promiseIds = politicianPromises.map(p => p.id)
          const relevantVerifications = verifications.filter(v => promiseIds.includes(v.promise_id))

          if (!relevantVerifications.length) continue

          const counts = {
            kept: relevantVerifications.filter(v => v.match_type === 'kept').length,
            broken: relevantVerifications.filter(v => v.match_type === 'broken').length,
            partial: relevantVerifications.filter(v => v.match_type === 'partial').length,
            pending: relevantVerifications.filter(v => v.match_type === 'pending').length,
          }

          const total = counts.kept + counts.broken + counts.partial
          if (total === 0) continue

          const score = Math.round(((counts.kept + counts.partial * 0.5) / total) * 100)

          await supabase.from('consistency_scores').upsert({
            politician_id: politicianId,
            overall_score: score,
            promises_kept: counts.kept,
            promises_broken: counts.broken,
            promises_partial: counts.partial,
            promises_pending: counts.pending,
            total_promises: total,
            last_calculated_at: new Date().toISOString(),
          }, { onConflict: 'politician_id' })

          stats.scores.calculated++
        } catch (error) {
          stats.scores.errors++
        }
      }
    }

    // ========================================================================
    // PHASE 7: Generate Value Profiles
    // ========================================================================
    if (!options.skipProfiles) {
      for (const politicianId of politicianIds) {
        try {
          // Get promises grouped by category
          const { data: promises } = await supabase
            .from('political_promises')
            .select('id, category, verification_status')
            .eq('politician_id', politicianId)

          if (!promises || promises.length < 3) continue

          // Calculate value metrics per category
          const categories = ['economic', 'social', 'environmental', 'security', 'healthcare', 'education', 'justice', 'immigration', 'foreign_policy', 'other']
          const valueMetrics: Record<string, any> = {}

          for (const cat of categories) {
            const catPromises = promises.filter(p => p.category === cat)
            valueMetrics[cat] = {
              promise_count: catPromises.length,
              kept_count: 0,
              broken_count: 0,
              partial_count: 0,
              consistency_score: 0,
              attention_score: Math.round((catPromises.length / promises.length) * 100),
              priority_rank: 0
            }
          }

          // Detect greenwashing
          const greenwashingFlags: any[] = []
          const envMetrics = valueMetrics['environmental']
          if (envMetrics.promise_count >= 3 && envMetrics.consistency_score < 40) {
            greenwashingFlags.push({
              category: 'environment',
              type: 'greenwashing',
              severity: 'medium',
              description: 'Beaucoup de promesses environnementales mais faible suivi',
              detected_at: new Date().toISOString()
            })
          }

          // Calculate authenticity score
          const { count: sourceCount } = await supabase
            .from('promise_sources')
            .select('*', { count: 'exact', head: true })
            .in('promise_id', promises.map(p => p.id))

          const authenticityScore = sourceCount && sourceCount > promises.length
            ? Math.min(90, 50 + (sourceCount / promises.length) * 20)
            : 50

          await supabase.from('core_value_profiles').upsert({
            politician_id: politicianId,
            value_metrics: valueMetrics,
            authenticity_score: Math.round(authenticityScore),
            greenwashing_flags: greenwashingFlags,
            priority_shifts: [],
            behavioral_patterns: [],
            data_quality_score: Math.min(1, promises.length / 20),
            calculated_at: new Date().toISOString(),
          }, { onConflict: 'politician_id' })

          stats.profiles.generated++
          if (greenwashingFlags.length > 0) stats.profiles.withFlags++
        } catch (error) {
          stats.profiles.errors++
        }
      }
    }

    stats.duration = Math.round((Date.now() - startTime) / 1000)

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      stats
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Math.round((Date.now() - startTime) / 1000)
    }, { status: 500 })
  }
}

// GET: Check analysis status
export async function GET() {
  try {
    // Get counts for dashboard
    const [
      { count: politiciansCount },
      { count: promisesCount },
      { count: actionsCount },
      { count: scoresCount },
      { count: profilesCount }
    ] = await Promise.all([
      supabase.from('politicians').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('political_promises').select('*', { count: 'exact', head: true }),
      supabase.from('parliamentary_actions').select('*', { count: 'exact', head: true }),
      supabase.from('consistency_scores').select('*', { count: 'exact', head: true }),
      supabase.from('core_value_profiles').select('*', { count: 'exact', head: true })
    ])

    return NextResponse.json({
      politicians: politiciansCount || 0,
      promises: promisesCount || 0,
      actions: actionsCount || 0,
      scores: scoresCount || 0,
      profiles: profilesCount || 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
