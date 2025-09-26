/**
 * Article Processor with Deduplication and Content Processing
 * Handles article validation, deduplication, and database operations
 */

import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import worldNewsClient from './worldNewsClient'

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

interface ProcessingResults {
  processed: number
  saved: number
  duplicates: number
  invalid: number
  errors: string[]
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

interface ApiResponse {
  articles?: any[]
}

class ArticleProcessor {
  private duplicateThreshold: number
  private minTitleLength: number
  private maxTitleLength: number
  private maxContentLength: number
  constructor() {
    this.duplicateThreshold = 0.85 // Similarity threshold for duplicates
    this.minTitleLength = 10
    this.maxTitleLength = 500
    this.maxContentLength = 50000
  }

  /**
   * Process and save articles from API response
   */
  async processArticles(apiResponse: ApiResponse, jobId: string | null = null): Promise<ProcessingResults> {
    const articles = apiResponse.articles || []

    if (articles.length === 0) {
      return {
        processed: 0,
        saved: 0,
        duplicates: 0,
        invalid: 0,
        errors: []
      }
    }

    const results: ProcessingResults = {
      processed: 0,
      saved: 0,
      duplicates: 0,
      invalid: 0,
      errors: []
    }

    console.log(`Processing ${articles.length} articles...`)

    for (const rawArticle of articles) {
      try {
        results.processed++

        // Validate and clean article data
        const cleanArticle = worldNewsClient.validateArticle(rawArticle)
        if (!cleanArticle) {
          console.log(`Article failed worldNewsClient validation:`, {
            title: rawArticle.title?.substring(0, 50),
            url: rawArticle.url,
            publish_date: rawArticle.publish_date
          })
          results.invalid++
          continue
        }

        // Additional validation
        if (!this.isValidArticle(cleanArticle)) {
          console.log(`Article failed isValidArticle check:`, {
            title: cleanArticle.title?.substring(0, 50),
            url: cleanArticle.url,
            published_at: cleanArticle.published_at,
            relevance_score: cleanArticle.relevance_score
          })
          results.invalid++
          continue
        }

        // Check for duplicates
        const isDuplicate = await this.checkForDuplicate(cleanArticle)
        if (isDuplicate) {
          results.duplicates++
          continue
        }

        // Save to database
        const saved = await this.saveArticle(cleanArticle)
        if (saved) {
          results.saved++
        } else {
          results.errors.push(`Failed to save: ${cleanArticle.title}`)
        }

      } catch (error) {
        results.errors.push(`Error processing article: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error('Article processing error:', error)
      }
    }

    console.log(`Processing complete: ${results.saved} saved, ${results.duplicates} duplicates, ${results.invalid} invalid`)
    return results
  }

  /**
   * Validate article meets our quality standards
   */
  isValidArticle(article: CleanArticle): boolean {
    // Title validation
    if (!article.title ||
        article.title.length < this.minTitleLength ||
        article.title.length > this.maxTitleLength) {
      console.log(`Article rejected for title validation: ${article.title?.substring(0, 50)}...`)
      return false
    }

    // URL validation
    if (!article.url || !this.isValidUrl(article.url)) {
      console.log(`Article rejected for URL validation: ${article.url}`)
      return false
    }

    // Content length check
    if (article.content && article.content.length > this.maxContentLength) {
      article.content = article.content.substring(0, this.maxContentLength) + '...'
    }

    // Published date validation
    if (article.published_at) {
      const pubDate = new Date(article.published_at)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      // Reject articles older than a week or from the future
      if (pubDate < oneWeekAgo || pubDate > new Date()) {
        console.log(`Article rejected for date validation: ${pubDate.toISOString()} (${article.title?.substring(0, 50)}...)`)
        return false
      }
    }

    // Political relevance check - lowered threshold for more articles
    if (article.relevance_score < 20) {
      console.log(`Article rejected for low relevance (${article.relevance_score}): ${article.title?.substring(0, 50)}...`)
      return false
    }

    return true
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(string: string): boolean {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Check for duplicate articles using multiple strategies
   */
  async checkForDuplicate(article: CleanArticle): Promise<boolean> {
    try {
      const serviceClient = getServiceClient()
      // Strategy 1: Exact URL match
      const { data: urlMatch } = await serviceClient
        .from('articles')
        .select('id')
        .eq('url', article.url)
        .single()

      if (urlMatch) {
        return true
      }

      // Strategy 2: External ID match (if available)
      if (article.external_id) {
        const { data: idMatch } = await serviceClient
          .from('articles')
          .select('id')
          .eq('external_id', article.external_id)
          .single()

        if (idMatch) {
          return true
        }
      }

      // Strategy 3: Title similarity check for recent articles
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: recentArticles } = await serviceClient
        .from('articles')
        .select('title')
        .gte('created_at', oneDayAgo)

      if (recentArticles && recentArticles.length > 0) {
        for (const existing of recentArticles) {
          const similarity = this.calculateTitleSimilarity(article.title, existing.title)
          if (similarity > this.duplicateThreshold) {
            return true
          }
        }
      }

      return false
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return false // Assume not duplicate if check fails
    }
  }

  /**
   * Calculate similarity between two titles using Levenshtein distance
   */
  calculateTitleSimilarity(title1: string, title2: string): number {
    const clean1 = this.cleanTitle(title1)
    const clean2 = this.cleanTitle(title2)

    if (clean1 === clean2) return 1.0

    const distance = this.levenshteinDistance(clean1, clean2)
    const maxLength = Math.max(clean1.length, clean2.length)

    return maxLength > 0 ? 1 - (distance / maxLength) : 0
  }

  /**
   * Clean title for comparison
   */
  cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Save article to Supabase
   */
  async saveArticle(article: CleanArticle): Promise<string | false> {
    try {
      const serviceClient = getServiceClient()
      const { data, error } = await serviceClient
        .from('articles')
        .insert(article)
        .select('id')
        .single()

      if (error) {
        // Handle unique constraint violations gracefully
        if (error.code === '23505') { // Unique constraint violation
          console.log(`Duplicate article skipped: ${article.title.substring(0, 50)}...`)
          return false
        }
        throw error
      }

      console.log(`Saved article: ${article.title.substring(0, 50)}...`)
      return data.id
    } catch (error) {
      console.error('Error saving article:', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  /**
   * Update existing articles with new data
   */
  async updateArticle(articleId: string, updates: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)

      return !error
    } catch (error) {
      console.error('Error updating article:', error)
      return false
    }
  }

  /**
   * Get articles that need updating (old articles that might have new content)
   */
  async getArticlesForUpdate(hours: number = 24): Promise<any[]> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('articles')
        .select('id, external_id, url, title, updated_at')
        .lt('updated_at', cutoff)
        .is('content', null) // Articles without content
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting articles for update:', error)
      return []
    }
  }

  /**
   * Clean up old articles to manage storage
   */
  async cleanupOldArticles(daysOld: number = 30): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('articles')
        .delete()
        .lt('published_at', cutoff)
        .select('id')

      if (error) throw error

      const deletedCount = data?.length || 0
      console.log(`Cleaned up ${deletedCount} old articles`)
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up old articles:', error)
      return 0
    }
  }

  /**
   * Get article statistics
   */
  async getArticleStats() {
    try {
      const { data: totalCount } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })

      const { data: todayCount } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0])

      const { data: sourceStats } = await supabase
        .from('articles')
        .select('source', { count: 'exact' })
        .not('source', 'is', null)

      const { data: avgRelevance } = await supabase
        .from('articles')
        .select('relevance_score')

      const averageRelevance = avgRelevance && avgRelevance.length > 0
        ? avgRelevance.reduce((sum, article) => sum + (article.relevance_score || 0), 0) / avgRelevance.length
        : 0

      return {
        totalArticles: totalCount?.length || 0,
        todayArticles: todayCount?.length || 0,
        averageRelevance: Math.round(averageRelevance * 100) / 100,
        sourcesCount: sourceStats?.length || 0
      }
    } catch (error) {
      console.error('Error getting article stats:', error)
      return null
    }
  }
}

// Create and export singleton instance
const articleProcessor = new ArticleProcessor()
export default articleProcessor