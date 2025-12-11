/**
 * Daily Audit Cron Endpoint
 * Orchestrates the full data collection and scoring pipeline
 *
 * Protected by secret token to prevent unauthorized access
 * Expected to run daily at 6:00 AM Paris time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET_TOKEN || 'change-me-in-production'
const ENABLE_CRON = process.env.ENABLE_CRON === 'true'

// Initialize Supabase client
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

interface JobResult {
  step: string
  status: 'success' | 'error' | 'skipped'
  duration?: number
  details?: any
  error?: string
}

/**
 * Verify the cron secret token
 */
function verifyCronToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return false
  }

  const token = authHeader.replace('Bearer ', '')
  return token === CRON_SECRET
}

/**
 * Log audit activity to database
 */
async function logAuditActivity(
  activity: string,
  status: 'started' | 'completed' | 'failed',
  details?: any
) {
  try {
    await supabase.from('audit_logs').insert({
      activity,
      status,
      details,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log audit activity:', error)
  }
}

/**
 * Step 1: Collect parliamentary data
 */
async function collectParliamentaryData(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    console.log('📊 Step 1: Collecting parliamentary data...')

    const response = await fetch(`${process.env.URL || 'http://localhost:3000'}/api/data-collection/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Data collection failed: ${response.statusText}`)
    }

    const result = await response.json()
    const duration = Date.now() - startTime

    return {
      step: 'collect-data',
      status: 'success',
      duration,
      details: result
    }
  } catch (error) {
    return {
      step: 'collect-data',
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Step 2: Match promises to actions
 */
async function matchPromisesToActions(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    console.log('🔗 Step 2: Matching promises to actions...')

    const response = await fetch(`${process.env.URL || 'http://localhost:3000'}/api/promises/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Promise matching failed: ${response.statusText}`)
    }

    const result = await response.json()
    const duration = Date.now() - startTime

    return {
      step: 'match-promises',
      status: 'success',
      duration,
      details: result
    }
  } catch (error) {
    return {
      step: 'match-promises',
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Step 3: Calculate consistency scores
 */
async function calculateScores(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    console.log('🧮 Step 3: Calculating consistency scores...')

    const response = await fetch(`${process.env.URL || 'http://localhost:3000'}/api/promises/calculate-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Score calculation failed: ${response.statusText}`)
    }

    const result = await response.json()
    const duration = Date.now() - startTime

    return {
      step: 'calculate-scores',
      status: 'success',
      duration,
      details: result
    }
  } catch (error) {
    return {
      step: 'calculate-scores',
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Step 4: Generate and send report
 */
async function generateReport(results: JobResult[]): Promise<JobResult> {
  const startTime = Date.now()

  try {
    console.log('📧 Step 4: Generating report...')

    // Get summary statistics
    const { data: politicians } = await supabase
      .from('politicians')
      .select('id, name, ai_score')
      .not('ai_score', 'is', null)
      .order('ai_score', { ascending: false })

    const { data: verifications } = await supabase
      .from('promise_verifications')
      .select('id, created_at')

    const report = {
      date: new Date().toISOString(),
      politicians_with_scores: politicians?.length || 0,
      total_verifications: verifications?.length || 0,
      pipeline_results: [...results],
      top_politicians: politicians?.slice(0, 5).map(p => ({
        name: p.name,
        score: p.ai_score
      }))
    }

    // Log to database
    await logAuditActivity('daily-audit-completed', 'completed', report)

    const duration = Date.now() - startTime

    return {
      step: 'generate-report',
      status: 'success',
      duration,
      details: report
    }
  } catch (error) {
    return {
      step: 'generate-report',
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * POST /api/cron/daily-audit
 * Main cron endpoint that orchestrates the daily audit pipeline
 */
export async function POST(request: NextRequest) {
  console.log('🔐 Verifying cron authorization...')

  // Check if cron is enabled
  if (!ENABLE_CRON) {
    console.log('⚠️  Cron is disabled via ENABLE_CRON env var')
    return NextResponse.json(
      {
        error: 'Cron jobs are disabled',
        message: 'Set ENABLE_CRON=true to enable automated data collection'
      },
      { status: 503 }
    )
  }

  // Verify authorization
  if (!verifyCronToken(request)) {
    console.log('❌ Unauthorized cron request')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('✅ Authorization verified')

  // Log start of audit
  await logAuditActivity('daily-audit', 'started')

  const startTime = Date.now()
  const results: JobResult[] = []

  try {
    // Step 1: Collect parliamentary data
    const collectResult = await collectParliamentaryData()
    results.push(collectResult)

    // Continue even if step 1 fails (might have partial data)
    if (collectResult.status === 'error') {
      console.warn('⚠️  Data collection had errors, continuing with available data')
    }

    // Step 2: Match promises to actions
    const matchResult = await matchPromisesToActions()
    results.push(matchResult)

    // Step 3: Calculate scores
    const scoreResult = await calculateScores()
    results.push(scoreResult)

    // Step 4: Generate report
    const reportResult = await generateReport(results)
    results.push(reportResult)

    // Calculate total duration
    const totalDuration = Date.now() - startTime

    // Check if any step failed
    const hasErrors = results.some(r => r.status === 'error')
    const status = hasErrors ? 'completed-with-errors' : 'completed'

    console.log(`✅ Daily audit ${status}`)
    console.log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`)

    // Log completion
    await logAuditActivity('daily-audit', hasErrors ? 'failed' : 'completed', {
      duration: totalDuration,
      results
    })

    return NextResponse.json({
      success: !hasErrors,
      message: `Daily audit ${status}`,
      duration: totalDuration,
      results
    })

  } catch (error) {
    console.error('💥 Daily audit failed:', error)

    await logAuditActivity('daily-audit', 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Daily audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        results
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/daily-audit
 * Return information about cron status
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get recent audit logs
  const { data: recentAudits } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('activity', 'daily-audit')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    enabled: ENABLE_CRON,
    schedule: '0 6 * * * (Daily at 6:00 AM Paris time)',
    last_run: recentAudits?.[0]?.created_at || null,
    recent_audits: recentAudits || []
  })
}
