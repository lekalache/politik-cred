/**
 * Automated News Collection Cron Job
 * Scheduled collection of French political news
 */

import { NextRequest, NextResponse } from 'next/server'
import worldNewsClient from '@/lib/news/worldNewsClient'
import cacheManager from '@/lib/news/cacheManager'
import articleProcessor from '@/lib/news/articleProcessor'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Security check - verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('🚫 Unauthorized cron job attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('⏰ Starting scheduled news collection...')

    // Create job tracking entry
    const { data: job, error: jobError } = await supabase
      .from('news_collection_jobs')
      .insert({
        job_type: 'scheduled',
        status: 'running'
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('Failed to create cron job tracking:', jobError)
      return NextResponse.json(
        { error: 'Failed to initialize job tracking' },
        { status: 500 }
      )
    }

    const jobId = job.id

    // Check API limits
    const canCollect = await worldNewsClient.checkDailyLimit()
    if (!canCollect) {
      await updateJobStatus(jobId, 'failed', 'Daily API limit reached')
      console.log('🚫 Daily API limit reached, skipping scheduled collection')
      return NextResponse.json({
        success: false,
        reason: 'Daily API limit reached',
        jobId
      })
    }

    // Clean up expired cache entries first
    const cacheCleared = await cacheManager.cleanExpiredCache()
    if (cacheCleared > 0) {
      console.log(`🗑️ Cleaned ${cacheCleared} expired cache entries`)
    }

    // Get recent political news (last 6 hours to avoid too much overlap)
    const sixHoursAgo = new Date()
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

    const searchParams = {
      language: 'fr',
      text: 'politique OR gouvernement OR macron OR assemblée OR ministre OR député',
      'source-countries': 'fr',
      'earliest-publish-date': sixHoursAgo.toISOString().split('T')[0],
      sort: 'publish-time',
      'sort-direction': 'DESC',
      number: 30 // Optimized for scheduled runs
    }

    // Check cache first (with shorter TTL for scheduled jobs)
    let apiResponse
    let fromCache = false

    const cached = await cacheManager.getCached(searchParams)
    if (cached && cached.cacheAge < 4 * 60 * 60 * 1000) { // Use cache if less than 4 hours old
      apiResponse = cached.data
      fromCache = true
      console.log(`📦 Using cached results for scheduled job`)
    }

    // Make API call if no recent cache
    if (!apiResponse) {
      console.log('🌐 Making API call for scheduled collection')
      try {
        const response = await worldNewsClient.getLatestFrenchPolitics(30)
        apiResponse = response

        // Cache with shorter TTL for scheduled collections
        await cacheManager.setCached(searchParams, apiResponse, 4 * 60 * 60 * 1000) // 4 hours
      } catch (apiError: any) {
        await updateJobStatus(jobId, 'failed', `API error: ${apiError?.message || 'Unknown API error'}`)
        throw apiError
      }
    }

    // Process collected articles
    console.log(`📰 Processing ${apiResponse.articles?.length || 0} articles from scheduled collection`)
    const processingResults = await articleProcessor.processArticles(apiResponse, jobId)

    // Additional cleanup: remove very old articles if storage is getting full
    const totalArticles = await articleProcessor.getArticleStats()
    if (totalArticles && totalArticles.totalArticles > 5000) { // Arbitrary limit for free tier
      console.log('🧹 Storage cleanup: removing articles older than 45 days')
      const cleanedUp = await articleProcessor.cleanupOldArticles(45)
      console.log(`Cleaned up ${cleanedUp} old articles`)
    }

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update job status with results
    await updateJobStatus(jobId, 'completed', null, {
      articles_collected: apiResponse.articles?.length || 0,
      articles_new: processingResults.saved,
      articles_updated: 0,
      api_calls_made: fromCache ? 0 : 1
    })

    // Log summary
    console.log(`✅ Scheduled collection completed in ${duration}s`)
    console.log(`   📊 Collected: ${apiResponse.articles?.length || 0}`)
    console.log(`   💾 Saved: ${processingResults.saved}`)
    console.log(`   🔄 Duplicates: ${processingResults.duplicates}`)
    console.log(`   ❌ Invalid: ${processingResults.invalid}`)

    // Return success response
    return NextResponse.json({
      success: true,
      jobId,
      duration,
      fromCache,
      results: {
        collected: apiResponse.articles?.length || 0,
        saved: processingResults.saved,
        duplicates: processingResults.duplicates,
        invalid: processingResults.invalid,
        errors: processingResults.errors.length
      },
      cleanup: {
        cacheCleared,
        oldArticlesRemoved: totalArticles && totalArticles.totalArticles > 5000
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.error(`❌ Scheduled collection failed after ${duration}s:`, error?.message || 'Unknown error')

    // Try to update job status if we have a jobId
    if (startTime) {
      try {
        // Get job ID from database if we couldn't create it earlier
        const { data: latestJob } = await supabase
          .from('news_collection_jobs')
          .select('id')
          .eq('job_type', 'scheduled')
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (latestJob) {
          await updateJobStatus(latestJob.id, 'failed', error?.message || 'Unknown error')
        }
      } catch (updateError) {
        console.error('Failed to update job status:', updateError)
      }
    }

    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to update job status
async function updateJobStatus(
  jobId: string,
  status: string,
  errorMessage?: string | null,
  additionalData?: object
) {
  try {
    const updateData: any = {
      status,
      completed_at: new Date().toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    if (additionalData) {
      Object.assign(updateData, additionalData)
    }

    // Calculate duration
    const { data: job } = await supabase
      .from('news_collection_jobs')
      .select('started_at')
      .eq('id', jobId)
      .single()

    if (job) {
      const duration = Math.round((new Date().getTime() - new Date(job.started_at).getTime()) / 1000)
      updateData.duration_seconds = duration
    }

    await supabase
      .from('news_collection_jobs')
      .update(updateData)
      .eq('id', jobId)

  } catch (error) {
    console.error('Error updating cron job status:', error)
  }
}