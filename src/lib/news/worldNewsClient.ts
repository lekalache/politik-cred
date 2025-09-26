/**
 * World News API Client with Rate Limiting and Error Handling
 * Optimized for free tier usage and caching
 */

import { supabase } from '@/lib/supabase'

interface RawArticle {
  id?: string | number
  title?: string
  text?: string
  summary?: string
  url?: string
  source?: string
  author?: string
  publish_date?: string
  image?: string
}

interface CleanArticle {
  external_id?: string | null
  title: string
  content?: string | null
  summary?: string | null
  url: string
  source?: string | null
  author?: string | null
  published_at?: string | null
  image_url?: string | null
  language: string
  category: string
  keywords: string[]
  sentiment: string
  relevance_score: number
}

class WorldNewsClient {
  private apiKey: string | undefined
  private baseUrl: string
  private dailyLimit: number
  private monthlyLimit: number

  constructor() {
    this.apiKey = process.env.WORLD_NEWS_API_KEY
    this.baseUrl = 'https://api.worldnewsapi.com'
    this.dailyLimit = parseInt(process.env.DAILY_API_LIMIT || '100')
    this.monthlyLimit = parseInt(process.env.MONTHLY_API_LIMIT || '1000')
  }

  /**
   * Check if we can make an API call within daily limits
   */
  async checkDailyLimit(): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('check_daily_api_limit', {
        service_name: 'worldnews',
        daily_limit: this.dailyLimit
      })

      return data
    } catch (error) {
      console.error('Error checking daily limit:', error)
      return false // Fail safe - don't make API call if unsure
    }
  }

  /**
   * Track API usage in database
   */
  async trackApiUsage(endpoint: string, responseStatus: number = 200): Promise<void> {
    try {
      await supabase.from('api_usage_log').upsert({
        service: 'worldnews',
        endpoint,
        requests_count: 1,
        response_status: responseStatus,
        date: new Date().toISOString().split('T')[0]
      }, {
        onConflict: 'service,endpoint,date'
      })
    } catch (error) {
      console.error('Error tracking API usage:', error)
    }
  }

  /**
   * Get current API usage statistics
   */
  async getUsageStats(): Promise<any[]> {
    try {
      const { data } = await supabase.rpc('get_api_usage_stats', {
        service_name: 'worldnews'
      })

      return data || []
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return []
    }
  }

  /**
   * Make authenticated request to World News API
   */
  async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    // Check daily limits before making request
    const canMakeRequest = await this.checkDailyLimit()
    if (!canMakeRequest) {
      throw new Error('Daily API limit reached')
    }

    const url = new URL(`${this.baseUrl}${endpoint}`)

    // Add API key and default parameters
    if (!this.apiKey) {
      throw new Error('World News API key not configured')
    }
    url.searchParams.set('api-key', this.apiKey)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString())
      }
    })

    try {
      console.log(`Making API request to: ${endpoint}`)
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PolitikCred/1.0'
        }
      })

      // Track API usage regardless of success/failure
      await this.trackApiUsage(endpoint, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`API request successful: ${data.available || 'unknown'} results`)

      return data
    } catch (error) {
      console.error('World News API request failed:', error instanceof Error ? error.message : 'Unknown error')
      await this.trackApiUsage(endpoint, 500) // Track failed requests
      throw error
    }
  }

  /**
   * Search for French political news
   */
  async searchFrenchPolitics(options: any = {}): Promise<any> {
    const defaultParams = {
      language: 'fr',
      text: 'politique OR gouvernement OR élections OR parlement OR macron OR assemblée',
      'source-countries': 'fr',
      sort: 'publish-time',
      'sort-direction': 'DESC',
      number: 25, // Optimize for free tier
      offset: 0
    }

    const params = { ...defaultParams, ...options }

    try {
      const data = await this.makeRequest('/search-news', params)
      return {
        articles: data.news || [],
        available: data.available || 0,
        offset: data.offset || 0,
        number: data.number || 0
      }
    } catch (error) {
      console.error('Error searching French politics news:', error)
      throw error
    }
  }

  /**
   * Get latest French political news with smart parameters
   */
  async getLatestFrenchPolitics(limit: number = 25): Promise<any> {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    return this.searchFrenchPolitics({
      number: limit,
      'earliest-publish-date': oneDayAgo.toISOString().split('T')[0],
      'source-countries': 'fr'
    })
  }

  /**
   * Search for specific politician or topic
   */
  async searchByTopic(topic: string, limit: number = 10): Promise<any> {
    return this.searchFrenchPolitics({
      text: `${topic} AND (politique OR gouvernement)`,
      number: limit
    })
  }

  /**
   * Get news by specific French sources
   */
  async getNewsBySource(sources: string[] = [], limit: number = 25): Promise<any> {
    const sourceList = sources.length > 0 ? sources.join(',') : 'lemonde.fr,lefigaro.fr,liberation.fr'

    return this.searchFrenchPolitics({
      sources: sourceList,
      number: limit
    })
  }

  /**
   * Get top headlines for French politics
   */
  async getTopHeadlines(): Promise<any> {
    return this.makeRequest('/top-news', {
      'source-countries': 'fr',
      language: 'fr',
      number: 20
    })
  }

  /**
   * Validate and clean article data from API response
   */
  validateArticle(article: RawArticle): CleanArticle | null {
    const required = ['title', 'url', 'publish_date']
    const hasRequired = required.every(field => (article as any)[field])

    if (!hasRequired) {
      return null
    }

    return {
      external_id: article.id?.toString() || null,
      title: article.title?.trim() || '',
      content: article.text?.trim() || null,
      summary: article.summary?.trim() || null,
      url: article.url?.trim() || '',
      source: article.source?.trim() || null,
      author: article.author?.trim() || null,
      published_at: article.publish_date ? new Date(article.publish_date).toISOString() : null,
      image_url: article.image?.trim() || null,
      language: 'fr',
      category: 'politics',
      keywords: this.extractKeywords(article),
      sentiment: this.analyzeSentiment(article.title, article.summary),
      relevance_score: this.calculateRelevance(article)
    }
  }

  /**
   * Extract keywords from article
   */
  extractKeywords(article: RawArticle): string[] {
    const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase()
    const politicalKeywords = [
      'macron', 'gouvernement', 'politique', 'élection', 'député', 'sénat',
      'assemblée', 'ministre', 'président', 'république', 'parlement',
      'vote', 'loi', 'réforme', 'débat', 'opposition', 'majorité'
    ]

    return politicalKeywords.filter(keyword => text.includes(keyword))
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(title: string = '', summary: string = ''): string {
    const text = `${title} ${summary}`.toLowerCase()
    const positive = ['succès', 'victoire', 'progrès', 'amélioration', 'accord']
    const negative = ['crise', 'échec', 'problème', 'conflit', 'scandale', 'démission']

    const positiveCount = positive.filter(word => text.includes(word)).length
    const negativeCount = negative.filter(word => text.includes(word)).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * Calculate relevance score for political content
   */
  calculateRelevance(article: RawArticle): number {
    const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase()
    let score = 50 // Base score

    // High relevance keywords
    const highRelevance = ['gouvernement', 'assemblée', 'sénat', 'ministre', 'président']
    score += highRelevance.filter(word => text.includes(word)).length * 15

    // Medium relevance keywords
    const mediumRelevance = ['politique', 'élection', 'parti', 'député', 'loi']
    score += mediumRelevance.filter(word => text.includes(word)).length * 10

    // Source bonus (French political sources get higher scores)
    const politicalSources = ['lemonde.fr', 'lefigaro.fr', 'liberation.fr', 'franceinfo.fr']
    if (politicalSources.some(source => article.source?.includes(source))) {
      score += 10
    }

    return Math.min(100, Math.max(0, score))
  }
}

// Create and export singleton instance
const worldNewsClient = new WorldNewsClient()
export default worldNewsClient