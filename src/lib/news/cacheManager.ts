/**
 * Cache Manager for News API Responses
 * Optimized for Supabase free tier and minimal API calls
 */

import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create a service client for admin operations
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  // Fallback to regular client
  return supabase
}

class CacheManager {
  private defaultTTL: number
  private maxCacheSize: number

  constructor() {
    this.defaultTTL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds
    this.maxCacheSize = 1000 // Maximum cache entries to prevent storage bloat
  }

  /**
   * Generate consistent cache key from search parameters
   */
  generateCacheKey(searchParams: any): string {
    // Sort parameters for consistency
    const sortedParams = Object.keys(searchParams)
      .sort()
      .reduce((result: any, key) => {
        result[key] = searchParams[key]
        return result
      }, {})

    const paramString = JSON.stringify(sortedParams)
    return crypto.createHash('md5').update(paramString).digest('hex')
  }

  /**
   * Get cached results if available and not expired
   */
  async getCached(searchParams: any): Promise<any> {
    try {
      const cacheKey = this.generateCacheKey(searchParams)
      const serviceClient = getServiceClient()

      const { data, error } = await serviceClient
        .from('news_cache')
        .select('response_data, article_count, created_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) {
        // Cache miss - not an error
        return null
      }

      // Update hit count
      await this.incrementHitCount(cacheKey)

      console.log(`Cache HIT for key: ${cacheKey.substring(0, 8)}... (${data.article_count} articles)`)
      return {
        data: data.response_data,
        cached: true,
        cacheAge: new Date().getTime() - new Date(data.created_at).getTime()
      }
    } catch (error) {
      console.error('Error retrieving from cache:', error)
      return null
    }
  }

  /**
   * Store API response in cache
   */
  async setCached(searchParams: any, responseData: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(searchParams)
      const expiresAt = new Date(Date.now() + ttl).toISOString()
      const articleCount = responseData.articles?.length || 0

      // Clean old cache before adding new entries
      await this.cleanExpiredCache()

      const serviceClient = getServiceClient()
      const { error } = await serviceClient
        .from('news_cache')
        .upsert({
          cache_key: cacheKey,
          search_params: searchParams,
          response_data: responseData,
          article_count: articleCount,
          expires_at: expiresAt,
          hit_count: 0
        })

      if (error) {
        console.error('Error storing cache:', error)
        return false
      }

      console.log(`Cache SET for key: ${cacheKey.substring(0, 8)}... (${articleCount} articles, TTL: ${ttl/1000/60}min)`)
      return true
    } catch (error) {
      console.error('Error setting cache:', error)
      return false
    }
  }

  /**
   * Increment hit count for cache analytics
   */
  async incrementHitCount(cacheKey: string): Promise<void> {
    try {
      await supabase.rpc('increment', {
        table_name: 'news_cache',
        row_id: cacheKey,
        column_name: 'hit_count'
      })
    } catch (error) {
      // Non-critical error, don't fail the request
      console.warn('Could not increment hit count:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Clean expired cache entries to manage storage
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const { data } = await supabase.rpc('clean_expired_cache')

      if (data > 0) {
        console.log(`Cleaned ${data} expired cache entries`)
      }

      // Also clean old entries if we're approaching cache size limit
      await this.enforceMaxCacheSize()

      return data
    } catch (error) {
      console.error('Error cleaning expired cache:', error)
      return 0
    }
  }

  /**
   * Enforce maximum cache size to stay within storage limits
   */
  async enforceMaxCacheSize(): Promise<void> {
    try {
      const { data: cacheCount, error } = await supabase
        .from('news_cache')
        .select('id', { count: 'exact', head: true })

      if (error || !cacheCount || cacheCount.length < this.maxCacheSize) {
        return
      }

      // Remove oldest entries beyond the limit
      const entriesToRemove = cacheCount.length - this.maxCacheSize + 10 // Remove a few extra

      const { data: oldEntries } = await supabase
        .from('news_cache')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(entriesToRemove)

      if (oldEntries && oldEntries.length > 0) {
        const idsToDelete = oldEntries.map(entry => entry.id)

        const { error: deleteError } = await supabase
          .from('news_cache')
          .delete()
          .in('id', idsToDelete)

        if (!deleteError) {
          console.log(`Removed ${oldEntries.length} old cache entries to enforce size limit`)
        }
      }
    } catch (error) {
      console.error('Error enforcing cache size limit:', error)
    }
  }

  /**
   * Invalidate cache for specific search parameters
   */
  async invalidateCache(searchParams: any): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(searchParams)

      const { error } = await supabase
        .from('news_cache')
        .delete()
        .eq('cache_key', cacheKey)

      if (!error) {
        console.log(`Cache invalidated for key: ${cacheKey.substring(0, 8)}...`)
      }

      return !error
    } catch (error) {
      console.error('Error invalidating cache:', error)
      return false
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<any> {
    try {
      // Get cache counts and hit rates
      const { data: stats } = await supabase
        .from('news_cache')
        .select('hit_count, article_count, created_at, expires_at')

      if (!stats) return null

      const now = new Date()
      const totalEntries = stats.length
      const expiredEntries = stats.filter(entry => new Date(entry.expires_at) < now).length
      const activeEntries = totalEntries - expiredEntries
      const totalHits = stats.reduce((sum, entry) => sum + (entry.hit_count || 0), 0)
      const totalArticles = stats.reduce((sum, entry) => sum + (entry.article_count || 0), 0)
      const averageHits = totalEntries > 0 ? totalHits / totalEntries : 0

      // Calculate storage usage estimate
      const estimatedSizeKB = Math.round((totalArticles * 2) + (totalEntries * 0.5)) // Rough estimate

      return {
        totalEntries,
        activeEntries,
        expiredEntries,
        totalHits,
        totalArticles,
        averageHits: Math.round(averageHits * 100) / 100,
        estimatedSizeKB,
        hitRate: totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) : 0
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return null
    }
  }

  /**
   * Check if cache needs refresh based on age and hit count
   */
  shouldRefreshCache(cacheAge: number, hitCount: number): boolean {
    const maxAge = 12 * 60 * 60 * 1000 // 12 hours
    const minHitsForLongCache = 5

    // Refresh if cache is old and not frequently accessed
    if (cacheAge > maxAge && hitCount < minHitsForLongCache) {
      return true
    }

    // Refresh if cache is very old regardless of hits
    if (cacheAge > 24 * 60 * 60 * 1000) { // 24 hours
      return true
    }

    return false
  }

  /**
   * Smart cache with different TTLs based on search type
   */
  getTTLForSearchType(searchParams: any): number {
    // Latest news - shorter cache (2 hours)
    if (searchParams.text?.includes('latest') || searchParams.sort === 'publish-time') {
      return 2 * 60 * 60 * 1000
    }

    // Specific topics or searches - longer cache (8 hours)
    if (searchParams.text && !searchParams.text.includes('politique')) {
      return 8 * 60 * 60 * 1000
    }

    // General political news - medium cache (6 hours)
    return this.defaultTTL
  }

  /**
   * Preload popular search combinations
   */
  async preloadPopularSearches(): Promise<void> {
    const popularSearches = [
      { text: 'macron', language: 'fr', number: 10 },
      { text: 'gouvernement', language: 'fr', number: 15 },
      { text: 'assemblée nationale', language: 'fr', number: 10 },
      { text: 'élections', language: 'fr', number: 10 }
    ]

    console.log('Preloading popular searches...')

    for (const search of popularSearches) {
      const cached = await this.getCached(search)
      if (!cached) {
        // These would be filled by actual API calls in the main collection process
        console.log(`Would preload search: ${search.text}`)
      }
    }
  }
}

// Create and export singleton instance
const cacheManager = new CacheManager()
export default cacheManager