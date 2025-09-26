/**
 * Manual News Refresh API Route
 * Admin-triggered news collection with cache bypass
 */

import { NextRequest, NextResponse } from 'next/server'
import worldNewsClient from '@/lib/news/worldNewsClient'
import cacheManager from '@/lib/news/cacheManager'
import articleProcessor from '@/lib/news/articleProcessor'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin users
    // For now, we'll allow any authenticated user

    const body = await request.json().catch(() => ({}))
    const {
      topic = null,
      sources = null,
      clearCache = false,
      limit = 30
    } = body

    console.log('🔄 Manual refresh triggered')

    // Create job tracking
    const { data: job, error: jobError } = await supabase
      .from('news_collection_jobs')
      .insert({
        job_type: 'refresh',
        status: 'running'
      })
      .select('id')
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }

    const jobId = job.id

    // Check API limits with slightly more lenient check for manual refresh
    const canRefresh = await worldNewsClient.checkDailyLimit()
    if (!canRefresh) {
      await updateJobStatus(jobId, 'failed', 'Daily API limit reached')
      return NextResponse.json(
        { error: 'Daily API limit reached' },
        { status: 429 }
      )
    }

    // Clear cache if requested
    if (clearCache) {
      console.log('🗑️ Clearing expired cache entries')
      const cleared = await cacheManager.cleanExpiredCache()
      console.log(`Cleared ${cleared} cache entries`)
    }

    // Prepare search parameters for refresh
    let searchParams

    if (topic) {
      // Specific topic search
      searchParams = {
        language: 'fr',
        text: `${topic} AND (politique OR gouvernement)`,
        'source-countries': 'fr',
        sort: 'publish-time',
        'sort-direction': 'DESC',
        number: Math.min(limit, 25)
      }
    } else if (sources) {
      // Specific sources
      searchParams = {
        language: 'fr',
        text: 'politique OR gouvernement OR élections',
        sources: Array.isArray(sources) ? sources.join(',') : sources,
        sort: 'publish-time',
        'sort-direction': 'DESC',
        number: Math.min(limit, 25)
      }
    } else {
      // Latest general political news
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      searchParams = {
        language: 'fr',
        text: 'politique OR gouvernement OR macron OR assemblée OR sénat',
        'source-countries': 'fr',
        'earliest-publish-date': oneDayAgo.toISOString().split('T')[0],
        sort: 'publish-time',
        'sort-direction': 'DESC',
        number: Math.min(limit, 30)
      }
    }

    // Force fresh API call (bypass cache)
    console.log('🌐 Making fresh API call (cache bypassed)')
    const apiResponse = await worldNewsClient.searchFrenchPolitics(searchParams)

    // Update cache with fresh data
    const ttl = cacheManager.getTTLForSearchType(searchParams)
    await cacheManager.setCached(searchParams, apiResponse, ttl)

    // Process articles
    console.log(`📰 Processing ${apiResponse.articles?.length || 0} articles`)
    const processingResults = await articleProcessor.processArticles(apiResponse, jobId)

    // Update job status
    await updateJobStatus(jobId, 'completed', null, {
      articles_collected: apiResponse.articles?.length || 0,
      articles_new: processingResults.saved,
      articles_updated: 0,
      api_calls_made: 1
    })

    // Get fresh stats
    const stats = await articleProcessor.getArticleStats()

    return NextResponse.json({
      success: true,
      jobId,
      refreshType: topic ? 'topic' : sources ? 'sources' : 'general',
      results: {
        collected: apiResponse.articles?.length || 0,
        saved: processingResults.saved,
        duplicates: processingResults.duplicates,
        invalid: processingResults.invalid,
        errors: processingResults.errors.slice(0, 5) // Limit error details
      },
      stats: {
        totalArticles: stats?.totalArticles || 0,
        todayArticles: stats?.todayArticles || 0,
        averageRelevance: stats?.averageRelevance || 0
      },
      available: apiResponse.available || 0,
      searchParams: {
        text: searchParams.text,
        sources: searchParams.sources || 'All French sources',
        limit: searchParams.number
      }
    })

  } catch (error: any) {
    console.error('Manual refresh error:', error)

    return NextResponse.json(
      {
        error: error?.message?.includes('API limit')
          ? 'API limit reached'
          : 'Refresh failed. Please try again.'
      },
      { status: error?.message?.includes('API limit') ? 429 : 500 }
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