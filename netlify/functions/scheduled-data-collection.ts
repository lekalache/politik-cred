/**
 * Netlify Scheduled Function
 * Runs daily at 6:00 AM Paris time
 * Triggers the daily audit pipeline
 */

import { schedule } from '@netlify/functions'

const CRON_SECRET = process.env.CRON_SECRET_TOKEN || 'change-me-in-production'

export const handler = schedule('0 6 * * *', async (event) => {
  const siteUrl = process.env.URL || 'http://localhost:3000'

  console.log('🚀 Starting scheduled data collection...')
  console.log('Time:', new Date().toISOString())

  try {
    // Call the cron API endpoint
    const response = await fetch(`${siteUrl}/api/cron/daily-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'PolitikCred-Cron/1.0'
      },
      body: JSON.stringify({
        triggeredBy: 'netlify-scheduled-function',
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Cron job failed:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Cron job failed',
          details: error
        })
      }
    }

    const result = await response.json()
    console.log('✅ Cron job completed successfully')
    console.log('Result:', result)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Daily audit completed',
        result
      })
    }
  } catch (error) {
    console.error('💥 Cron job error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
})
