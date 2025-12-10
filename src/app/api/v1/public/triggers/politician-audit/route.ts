/**
 * Public API: Politician Audit Trigger
 * POST /api/v1/public/triggers/politician-audit - Trigger comprehensive politician audit
 *
 * This endpoint orchestrates a complete audit workflow:
 * 1. Collects recent news/facts about the politician from the web
 * 2. Extracts political promises from those sources
 * 3. Matches promises to parliamentary actions (semantic matching)
 * 4. Calculates consistency scores
 * 5. Returns a comprehensive audit report
 *
 * Requires API key with 'trigger:data_collection' scope
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { composeApiKeyMiddleware } from '@/lib/middleware/api-key-rate-limit'
import { promiseClassifier } from '@/lib/promise-extraction/promise-classifier'
import { semanticMatcher } from '@/lib/promise-extraction/semantic-matcher'
import { consistencyCalculator } from '@/lib/promise-extraction/consistency-calculator'
import { validateURL, getURLUpdateData } from '@/lib/validation/url-validator'
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
const PoliticianAuditSchema = z.object({
  politicianId: z.string().uuid('Invalid politician ID format'),
  includeNewsSearch: z.boolean().optional().default(true),
  newsSearchQuery: z.string().optional(),
  timeframe: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
  minConfidence: z.number().min(0).max(1).optional().default(0.6),
  generateReport: z.boolean().optional().default(true)
})

/**
 * Search for recent news about the politician
 */
async function searchRecentNews(
  politicianName: string,
  customQuery?: string,
  timeframe: string = 'month'
): Promise<Array<{ title: string; content: string; url: string; publishedAt: string }>> {
  try {
    // Calculate date range
    const now = new Date()
    const fromDate = new Date(now)

    switch (timeframe) {
      case 'week':
        fromDate.setDate(now.getDate() - 7)
        break
      case 'month':
        fromDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        fromDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        fromDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        fromDate.setMonth(now.getMonth() - 1)
    }

    // Query existing news from database
    const query = customQuery || politicianName

    const { data: articles, error } = await supabase
      .from('articles')
      .select('title, content, url, published_at')
      .gte('published_at', fromDate.toISOString())
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return articles?.map(a => ({
      title: a.title,
      content: a.content || '',
      url: a.url,
      publishedAt: a.published_at
    })) || []
  } catch (error) {
    console.error('Error searching news:', error)
    return []
  }
}

/**
 * Extract promises from news articles
 */
async function extractPromisesFromNews(
  politicianId: string,
  articles: Array<{ title: string; content: string; url: string; publishedAt: string }>
): Promise<{ extracted: number; stored: number; promises: any[] }> {
  let totalExtracted = 0
  let totalStored = 0
  const allPromises: any[] = []

  for (const article of articles) {
    try {
      // Combine title and content for analysis
      const text = `${article.title}\n\n${article.content}`

      // Extract promises
      const promises = promiseClassifier.extractPromises(text, article.url)
      totalExtracted += promises.length

      if (promises.length === 0) continue

      // Validate URL
      const urlValidation = await validateURL(article.url)
      const effectiveUrl = urlValidation.redirectUrl || article.url
      const urlHealthData = await getURLUpdateData(urlValidation, 0)

      // Store promises
      for (const promise of promises) {
        try {
          const { data, error } = await supabase
            .from('political_promises')
            .insert({
              politician_id: politicianId,
              promise_text: promise.text,
              promise_date: article.publishedAt,
              category: promise.category,
              source_url: effectiveUrl,
              source_type: 'news_article',
              extraction_method: 'ai_extracted',
              confidence_score: promise.confidence,
              verification_status: 'pending',
              is_actionable: promise.isActionable,
              context: article.title,
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

          if (!error && data) {
            totalStored++
            allPromises.push(data)
          }
        } catch (err) {
          console.error('Error storing promise:', err)
        }
      }
    } catch (err) {
      console.error('Error processing article:', err)
    }
  }

  return { extracted: totalExtracted, stored: totalStored, promises: allPromises }
}

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
 * Generate audit report
 */
async function generateAuditReport(politicianId: string) {
  try {
    // Get politician info
    const { data: politician } = await supabase
      .from('politicians')
      .select('name, party, position')
      .eq('id', politicianId)
      .single()

    // Get consistency scores
    const { data: scores } = await supabase
      .from('consistency_scores')
      .select('*')
      .eq('politician_id', politicianId)
      .single()

    // Get promises breakdown
    const { data: promises } = await supabase
      .from('political_promises')
      .select('category, verification_status, is_actionable')
      .eq('politician_id', politicianId)

    // Get recent verifications
    const { data: recentVerifications } = await supabase
      .from('promise_verifications')
      .select(`
        match_type,
        match_confidence,
        verified_at,
        political_promises!inner(promise_text, promise_date)
      `)
      .eq('political_promises.politician_id', politicianId)
      .order('verified_at', { ascending: false })
      .limit(10)

    return {
      politician: politician || {},
      scores: scores || {},
      promisesSummary: {
        total: promises?.length || 0,
        byCategory: promises?.reduce((acc: any, p: any) => {
          acc[p.category] = (acc[p.category] || 0) + 1
          return acc
        }, {}),
        byStatus: promises?.reduce((acc: any, p: any) => {
          acc[p.verification_status] = (acc[p.verification_status] || 0) + 1
          return acc
        }, {}),
        actionable: promises?.filter((p: any) => p.is_actionable).length || 0
      },
      recentVerifications: recentVerifications || []
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return null
  }
}

/**
 * POST /api/v1/public/triggers/politician-audit
 * Trigger comprehensive politician audit
 */
export async function POST(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

  return middleware(request, async (req, context) => {
    const startTime = Date.now()

    try {
      // Parse and validate request
      const body = await req.json()
      const validation = PoliticianAuditSchema.safeParse(body)

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

      const {
        politicianId,
        includeNewsSearch,
        newsSearchQuery,
        timeframe,
        minConfidence,
        generateReport
      } = validation.data

      console.log(
        `Politician audit triggered for ${politicianId} by API key: ${context.keyName}`
      )

      // Get politician info
      const { data: politician, error: politicianError } = await supabase
        .from('politicians')
        .select('name, party, position')
        .eq('id', politicianId)
        .single()

      if (politicianError || !politician) {
        return NextResponse.json(
          { error: 'Politician not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      const auditResults: any = {
        politicianId,
        politicianName: politician.name,
        timeframe,
        steps: {}
      }

      // Step 1: Search recent news (if enabled)
      if (includeNewsSearch) {
        console.log(`Searching news for ${politician.name}...`)
        const articles = await searchRecentNews(
          politician.name,
          newsSearchQuery,
          timeframe
        )
        auditResults.steps.newsSearch = {
          articlesFound: articles.length,
          timeRange: timeframe
        }

        // Step 2: Extract promises from news
        if (articles.length > 0) {
          console.log(`Extracting promises from ${articles.length} articles...`)
          const extraction = await extractPromisesFromNews(politicianId, articles)
          auditResults.steps.promiseExtraction = extraction
        } else {
          auditResults.steps.promiseExtraction = {
            extracted: 0,
            stored: 0,
            message: 'No recent news articles found'
          }
        }
      }

      // Step 3: Match promises to actions
      console.log('Matching promises to parliamentary actions...')
      const matching = await matchPromisesToActions(politicianId, minConfidence)
      auditResults.steps.semanticMatching = matching

      // Step 4: Calculate consistency scores
      console.log('Calculating consistency scores...')
      const metrics = await consistencyCalculator.calculateConsistencyScore(politicianId)
      auditResults.steps.scoreCalculation = {
        overallScore: metrics.overallScore,
        aiScore: Math.round(metrics.overallScore), // Explicitly expose as aiScore
        promisesKept: metrics.promisesKept,
        promisesBroken: metrics.promisesBroken,
        promisesPartial: metrics.promisesPartial,
        totalPromises: metrics.totalPromises
      }

      // Step 5: Generate comprehensive report (if requested)
      if (generateReport) {
        console.log('Generating audit report...')
        const report = await generateAuditReport(politicianId)
        auditResults.report = report
      }

      const duration = Date.now() - startTime

      return NextResponse.json({
        success: true,
        audit: auditResults,
        meta: {
          api_version: 'v1',
          request_id: crypto.randomUUID(),
          api_key: context.keyName,
          duration_ms: duration,
          triggered_at: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Politician audit error:', error)
      // Log full error details for debugging
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
      }

      return NextResponse.json(
        {
          error: 'Audit failed',
          code: 'AUDIT_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/v1/public/triggers/politician-audit
 * Get information about the audit workflow
 */
export async function GET(request: NextRequest) {
  const middleware = composeApiKeyMiddleware(['trigger:data_collection'])

  return middleware(request, async (req, context) => {
    return NextResponse.json({
      success: true,
      data: {
        description: 'Comprehensive politician audit workflow',
        workflow: [
          {
            step: 1,
            name: 'News Search',
            description: 'Search for recent news/facts about the politician',
            optional: true
          },
          {
            step: 2,
            name: 'Promise Extraction',
            description: 'Extract political promises from news articles using AI',
            aiPowered: true
          },
          {
            step: 3,
            name: 'Semantic Matching',
            description: 'Match promises to parliamentary actions using semantic analysis',
            aiPowered: true,
            accuracy: '71% similarity detection'
          },
          {
            step: 4,
            name: 'Score Calculation',
            description: 'Calculate consistency scores based on promise outcomes',
            formula: '(kept × 100 + partial × 50) / total'
          },
          {
            step: 5,
            name: 'Report Generation',
            description: 'Generate comprehensive audit report with insights',
            optional: true
          }
        ],
        parameters: {
          politicianId: {
            required: true,
            type: 'uuid',
            description: 'ID of the politician to audit'
          },
          includeNewsSearch: {
            required: false,
            type: 'boolean',
            default: true,
            description: 'Whether to search for recent news'
          },
          newsSearchQuery: {
            required: false,
            type: 'string',
            description: 'Custom search query (defaults to politician name)'
          },
          timeframe: {
            required: false,
            type: 'enum',
            options: ['week', 'month', 'quarter', 'year', 'all'],
            default: 'month',
            description: 'Timeframe for news search'
          },
          minConfidence: {
            required: false,
            type: 'number',
            default: 0.6,
            min: 0,
            max: 1,
            description: 'Minimum confidence for promise-action matches'
          },
          generateReport: {
            required: false,
            type: 'boolean',
            default: true,
            description: 'Whether to generate a comprehensive report'
          }
        },
        estimatedDuration: '30-60 seconds',
        rateLimit: '1 per 5 minutes'
      },
      meta: {
        api_version: 'v1',
        request_id: crypto.randomUUID()
      }
    })
  })
}
