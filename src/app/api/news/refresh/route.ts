/**
 * Manual News Refresh API Route
 * Admin-triggered news collection with cache bypass
 */

import { NextRequest, NextResponse } from 'next/server'
import worldNewsClient from '@/lib/news/worldNewsClient'
import cacheManager from '@/lib/news/cacheManager'
import articleProcessor from '@/lib/news/articleProcessor'
import { supabase } from '@/lib/supabase'

// Helper function to verify admin authentication
async function verifyAdminAuth(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { isAdmin: false, error: 'No authorization token provided' }
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return { isAdmin: false, error: 'Invalid authorization format' }
    }

    // Try to parse the token as user data (from localStorage)
    let userData
    try {
      userData = JSON.parse(decodeURIComponent(token))
    } catch {
      return { isAdmin: false, error: 'Invalid token format' }
    }

    if (!userData?.id || !userData?.role) {
      return { isAdmin: false, error: 'Invalid user data in token' }
    }

    // Verify user exists and has admin role
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, is_verified')
      .eq('id', userData.id)
      .single()

    if (error || !user) {
      return { isAdmin: false, error: 'User not found' }
    }

    if (user.role !== 'admin') {
      return { isAdmin: false, error: 'Admin access required' }
    }

    if (!user.is_verified) {
      return { isAdmin: false, error: 'Account not verified' }
    }

    return { isAdmin: true, userId: user.id }
  } catch (error) {
    return { isAdmin: false, error: 'Authentication error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await verifyAdminAuth(request)
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      topic = null,
      sources = null,
      clearCache = false,
      limit = 30
    } = body

    console.log('🔄 Manual refresh triggered')

    // Create job tracking - we'll create a simple job ID for now
    const jobId = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`🆔 Created job ID: ${jobId}`)

    // Check API limits with slightly more lenient check for manual refresh
    const canRefresh = await worldNewsClient.checkDailyLimit()
    if (!canRefresh) {
      console.log(`❌ Job ${jobId} failed: Daily API limit reached`)
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

    // Log job completion
    console.log(`✅ Job ${jobId} completed successfully`)
    console.log(`📊 Results: ${apiResponse.articles?.length || 0} collected, ${processingResults.saved} saved`)

    // Get fresh stats
    const stats = await articleProcessor.getArticleStats()

    return NextResponse.json({
      success: true,
      id: 'success',
      jobId,
      refreshType: topic ? 'topic' : sources ? 'sources' : 'general',
      results: {
        collected: apiResponse.articles?.length || 0,
        saved: processingResults.saved,
        duplicates: processingResults.duplicates,
        invalid: processingResults.invalid,
        errors: processingResults.errors?.slice(0, 5) || [] // Limit error details
      },
      stats: {
        totalArticles: stats?.totalArticles || 0,
        todayArticles: stats?.todayArticles || 0,
        averageRelevance: stats?.averageRelevance || 0,
        sourcesCount: stats?.sourcesCount || 0
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

