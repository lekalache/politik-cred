/**
 * News Statistics API Route
 * Provides comprehensive statistics for monitoring and admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import worldNewsClient from '@/lib/news/worldNewsClient'
import cacheManager from '@/lib/news/cacheManager'
import articleProcessor from '@/lib/news/articleProcessor'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    const detailed = url.searchParams.get('detailed') === 'true'

    console.log(`📊 Getting news statistics for ${days} days`)

    // Get article statistics
    const articleStats = await articleProcessor.getArticleStats()

    // Get API usage statistics
    const usageStats = await worldNewsClient.getUsageStats()

    // Get cache statistics
    const cacheStats = await cacheManager.getCacheStats()

    // Get recent collection jobs
    const { data: recentJobs } = await supabase
      .from('news_collection_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(detailed ? 20 : 10)

    // Get daily article counts for the specified period
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    const { data: dailyStats } = await supabase
      .from('articles')
      .select('created_at')
      .gte('created_at', daysAgo.toISOString())

    // Process daily counts
    const dailyCounts: { [key: string]: number } = {}
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      dailyCounts[dateKey] = 0
    }

    if (dailyStats) {
      dailyStats.forEach(article => {
        const dateKey = article.created_at.split('T')[0]
        if (dailyCounts.hasOwnProperty(dateKey)) {
          dailyCounts[dateKey]++
        }
      })
    }

    // Get source distribution if detailed
    let sourceStats = null
    if (detailed) {
      const { data: sources } = await supabase
        .from('articles')
        .select('source')
        .not('source', 'is', null)

      if (sources) {
        const sourceCount: { [key: string]: number } = {}
        sources.forEach(article => {
          const source = article.source
          sourceCount[source] = (sourceCount[source] || 0) + 1
        })

        sourceStats = Object.entries(sourceCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([source, count]) => ({ source, count }))
      }
    }

    // Get keyword distribution if detailed
    let keywordStats = null
    if (detailed) {
      const { data: articles } = await supabase
        .from('articles')
        .select('keywords')
        .not('keywords', 'is', null)
        .limit(1000)

      if (articles) {
        const keywordCount: { [key: string]: number } = {}
        articles.forEach(article => {
          if (article.keywords && Array.isArray(article.keywords)) {
            article.keywords.forEach(keyword => {
              keywordCount[keyword] = (keywordCount[keyword] || 0) + 1
            })
          }
        })

        keywordStats = Object.entries(keywordCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20)
          .map(([keyword, count]) => ({ keyword, count }))
      }
    }

    // Calculate success rate from recent jobs
    const successfulJobs = recentJobs?.filter(job => job.status === 'completed').length || 0
    const totalJobs = recentJobs?.length || 0
    const successRate = totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 100) : 0

    // Get current API usage for today
    const today = new Date().toISOString().split('T')[0]
    const todayUsage = usageStats.find((stat: any) => stat.date === today)

    const response: any = {
      success: true,
      timestamp: new Date().toISOString(),
      period: `${days} days`,
      overview: {
        totalArticles: articleStats?.totalArticles || 0,
        todayArticles: articleStats?.todayArticles || 0,
        averageRelevance: articleStats?.averageRelevance || 0,
        sourcesCount: articleStats?.sourcesCount || 0
      },
      apiUsage: {
        todayRequests: todayUsage?.total_requests || 0,
        weeklyStats: usageStats.slice(0, 7),
        dailyLimit: parseInt(process.env.DAILY_API_LIMIT || '100'),
        monthlyLimit: parseInt(process.env.MONTHLY_API_LIMIT || '1000')
      },
      cache: cacheStats ? {
        totalEntries: cacheStats.totalEntries,
        activeEntries: cacheStats.activeEntries,
        hitRate: cacheStats.hitRate,
        estimatedSizeKB: cacheStats.estimatedSizeKB
      } : null,
      jobs: {
        recent: recentJobs?.slice(0, 5).map(job => ({
          id: job.id,
          type: job.job_type,
          status: job.status,
          articlesCollected: job.articles_collected || 0,
          articlesNew: job.articles_new || 0,
          duration: job.duration_seconds,
          startedAt: job.started_at,
          error: job.error_message
        })) || [],
        successRate,
        totalJobs
      },
      trends: {
        dailyCounts: Object.entries(dailyCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }))
      }
    }

    // Add detailed stats if requested
    if (detailed) {
      response.detailed = {
        sources: sourceStats,
        keywords: keywordStats,
        allJobs: recentJobs
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error getting news statistics:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clean up operations
    const url = new URL(request.url)
    const operation = url.searchParams.get('operation')

    let result = { success: true, message: '' }

    switch (operation) {
      case 'cache':
        const cleared = await cacheManager.cleanExpiredCache()
        result.message = `Cleared ${cleared} expired cache entries`
        break

      case 'old-articles':
        const days = parseInt(url.searchParams.get('days') || '30')
        const deleted = await articleProcessor.cleanupOldArticles(days)
        result.message = `Deleted ${deleted} articles older than ${days} days`
        break

      case 'failed-jobs':
        const { data: deletedJobs } = await supabase
          .from('news_collection_jobs')
          .delete()
          .eq('status', 'failed')
          .select('id')

        result.message = `Deleted ${deletedJobs?.length || 0} failed job records`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid cleanup operation' },
          { status: 400 }
        )
    }

    console.log(`🧹 Cleanup operation: ${result.message}`)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { error: 'Cleanup operation failed' },
      { status: 500 }
    )
  }
}