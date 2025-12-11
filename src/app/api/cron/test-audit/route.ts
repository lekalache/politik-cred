/**
 * Manual Test Endpoint for Daily Audit
 * Allows testing the cron pipeline without waiting for scheduled execution
 *
 * POST /api/cron/test-audit
 * Authorization: Bearer <CRON_SECRET_TOKEN>
 */

import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET_TOKEN || 'change-me-in-production'

export async function POST(request: NextRequest) {
  console.log('🧪 Manual test of daily audit triggered')

  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (token !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Temporarily enable cron for testing
  const originalEnableCron = process.env.ENABLE_CRON
  process.env.ENABLE_CRON = 'true'

  // Get the site URL
  const siteUrl = process.env.URL || request.nextUrl.origin

  console.log('Calling daily audit endpoint:', `${siteUrl}/api/cron/daily-audit`)
  console.log('⚠️  Temporarily enabled ENABLE_CRON for testing')

  try {
    // Call the actual cron endpoint
    const response = await fetch(`${siteUrl}/api/cron/daily-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'PolitikCred-Manual-Test/1.0'
      },
      body: JSON.stringify({
        triggeredBy: 'manual-test',
        timestamp: new Date().toISOString()
      })
    })

    const result = await response.json()

    // Restore original ENABLE_CRON value
    if (originalEnableCron) {
      process.env.ENABLE_CRON = originalEnableCron
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      message: 'Manual test completed',
      result
    })
  } catch (error) {
    console.error('Test failed:', error)

    // Restore original ENABLE_CRON value on error
    if (originalEnableCron) {
      process.env.ENABLE_CRON = originalEnableCron
    }

    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
