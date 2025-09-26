/**
 * Main News Collection API Route
 * Collects French political news with intelligent caching and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import worldNewsClient from '@/lib/news/worldNewsClient'
import cacheManager from '@/lib/news/cacheManager'
import articleProcessor from '@/lib/news/articleProcessor'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  let jobId: string | null = null

  try {
    // Create job tracking entry
    const { data: job, error: jobError } = await supabase
      .from('news_collection_jobs')
      .insert({
        job_type: 'manual',
        status: 'running'
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return NextResponse.json(
        { error: 'Failed to initialize job tracking' },
        { status: 500 }
      )
    }

    jobId = job.id

    // Parse request parameters
    const body = await request.json().catch(() => ({}))
    const {
      forceRefresh = false,
      limit = 25,
      searchText = null,
      source = null
    } = body

    console.log(`🚀 Starting news collection job ${jobId}`)

    // Check API limits
    const canCollect = await worldNewsClient.checkDailyLimit()
    if (!canCollect) {
      if (jobId) {
        await updateJobStatus(jobId, 'failed', 'Daily API limit reached')
      }
      return NextResponse.json(
        { error: 'Daily API limit reached. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    // Prepare search parameters
    const searchParams: any = {
      language: 'fr',
      text: searchText || 'politique OR gouvernement OR élections OR parlement',
      'source-countries': 'fr',
      sort: 'publish-time',
      'sort-direction': 'DESC',
      number: Math.min(limit, 50) // Cap at 50 for free tier
    }

    if (source) {
      searchParams.sources = source
    }

    let apiResponse
    let fromCache = false

    // Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await cacheManager.getCached(searchParams)
      if (cached) {
        apiResponse = cached.data
        fromCache = true
        console.log(`📦 Using cached results (${cached.cacheAge}ms old)`)
      }
    }

    // Make API call if no cache or forced refresh
    if (!apiResponse) {
      console.log('🌐 Making API call to World News API')
      const response = await worldNewsClient.searchFrenchPolitics(searchParams)
      apiResponse = response

      // Cache the response
      const ttl = cacheManager.getTTLForSearchType(searchParams)
      await cacheManager.setCached(searchParams, apiResponse, ttl)
    }

    // Process articles
    console.log(`📰 Processing ${apiResponse.articles?.length || 0} articles`)
    const processingResults = await articleProcessor.processArticles(apiResponse)

    // Update job status
    if (jobId) {
      await updateJobStatus(jobId, 'completed', null, {
        articles_collected: apiResponse.articles?.length || 0,
        articles_new: processingResults.saved,
        articles_updated: 0,
        api_calls_made: fromCache ? 0 : 1
      })
    }

    // Get updated stats
    const stats = await articleProcessor.getArticleStats()
    const usageStats = await worldNewsClient.getUsageStats()

    return NextResponse.json({
      success: true,
      jobId,
      fromCache,
      results: {
        collected: apiResponse.articles?.length || 0,
        saved: processingResults.saved,
        duplicates: processingResults.duplicates,
        invalid: processingResults.invalid,
        errors: processingResults.errors
      },
      stats: {
        totalArticles: stats?.totalArticles || 0,
        todayArticles: stats?.todayArticles || 0,
        averageRelevance: stats?.averageRelevance || 0
      },
      usage: usageStats.slice(0, 7), // Last 7 days
      available: apiResponse.available || 0
    })

  } catch (error: any) {
    console.error('News collection error:', error)

    if (jobId) {
      await updateJobStatus(jobId, 'failed', error?.message || 'Unknown error')
    }

    // Handle specific error types
    if (error?.message?.includes('Daily API limit')) {
      return NextResponse.json(
        { error: 'Daily API limit reached' },
        { status: 429 }
      )
    }

    if (error?.message?.includes('API request failed')) {
      return NextResponse.json(
        { error: 'External API error. Please try again later.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to collect news. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get collection stats for dashboard
    const stats = await articleProcessor.getArticleStats()
    const usageStats = await worldNewsClient.getUsageStats()
    const cacheStats = await cacheManager.getCacheStats()

    // Get recent jobs
    const { data: recentJobs } = await supabase
      .from('news_collection_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        articles: stats,
        usage: usageStats.slice(0, 7),
        cache: cacheStats,
        recentJobs: recentJobs || []
      }
    })

  } catch (error) {
    console.error('Error getting collection stats:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
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
    console.error('Error updating job status:', error)
  }
}