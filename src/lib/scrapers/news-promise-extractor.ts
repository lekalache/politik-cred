/**
 * News Article Promise Extractor
 *
 * Extracts political promises from your existing news articles
 * Uses the World News API data you're already collecting
 */

import { createClient } from '@supabase/supabase-js'
import { promiseClassifier } from '../promise-extraction/promise-classifier'
import { validateURL, getURLUpdateData } from '../validation/url-validator'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export interface NewsPromiseExtractionResult {
  articleId: string
  articleTitle: string
  articleUrl: string
  politicianName: string | null
  promisesFound: number
  promisesStored: number
  errors: string[]
}

/**
 * Extract promises from news articles that mention politicians
 */
export async function extractPromisesFromNews(
  options: {
    limit?: number
    sinceDate?: string
    politicianNames?: string[]
  } = {}
): Promise<NewsPromiseExtractionResult[]> {
  const supabase = getSupabaseClient()
  const { limit = 50, sinceDate, politicianNames } = options

  console.log('🗞️  Extracting promises from news articles...')

  // Step 1: Fetch news articles
  let query = supabase
    .from('articles')
    .select('id, title, description, url, content, published_at, author')
    .order('published_at', { ascending: false })

  if (sinceDate) {
    query = query.gte('published_at', sinceDate)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data: articles, error } = await query

  if (error) {
    console.error('Error fetching news articles:', error)
    throw error
  }

  if (!articles || articles.length === 0) {
    console.log('No news articles found')
    return []
  }

  console.log(`Found ${articles.length} news articles to process`)

  // Step 2: Get list of all politicians from database
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name')

  if (!politicians) {
    throw new Error('No politicians found in database')
  }

  const results: NewsPromiseExtractionResult[] = []

  // Step 3: Process each article
  for (const article of articles) {
    try {
      // Combine title, description, and content
      const fullText = [
        article.title || '',
        article.description || '',
        article.content || ''
      ].join('\n\n')

      // Find which politician is mentioned in the article
      const mentionedPolitician = politicians.find(p =>
        fullText.toLowerCase().includes(p.name.toLowerCase())
      )

      if (!mentionedPolitician) {
        // Skip articles that don't mention any politician
        continue
      }

      console.log(`\n📰 Processing: ${article.title}`)
      console.log(`   Politician: ${mentionedPolitician.name}`)
      console.log(`   URL: ${article.url}`)

      // Extract promises from the article
      const promises = promiseClassifier.extractPromises(fullText, article.url)

      if (promises.length === 0) {
        console.log(`   No promises found`)
        results.push({
          articleId: article.id,
          articleTitle: article.title || 'Untitled',
          articleUrl: article.url,
          politicianName: mentionedPolitician.name,
          promisesFound: 0,
          promisesStored: 0,
          errors: []
        })
        continue
      }

      console.log(`   Found ${promises.length} promises`)

      // Validate article URL
      const urlValidation = await validateURL(article.url)
      const effectiveUrl = urlValidation.redirectUrl || article.url
      const urlHealthData = await getURLUpdateData(urlValidation, 0)

      // Store promises in database
      let stored = 0
      const errors: string[] = []

      for (const promise of promises) {
        try {
          const { error: insertError } = await supabase
            .from('political_promises')
            .insert({
              politician_id: mentionedPolitician.id,
              promise_text: promise.text,
              promise_date: article.published_at || new Date().toISOString(),
              category: promise.category,
              source_url: effectiveUrl,
              source_type: 'social_media', // News articles are often from social media quotes
              extraction_method: 'ai_extracted',
              confidence_score: promise.confidence,
              verification_status: promise.isActionable ? 'actionable' : 'non_actionable',
              is_actionable: promise.isActionable,
              context: `From news: ${article.title}. Keywords: ${promise.keywords.join(', ')}`,
              // URL health tracking
              source_url_status: urlHealthData.source_url_status,
              source_url_http_status: urlHealthData.source_url_http_status,
              source_url_last_checked: urlHealthData.source_url_last_checked,
              source_url_redirect_url: urlHealthData.source_url_redirect_url,
              source_url_archive_url: urlHealthData.source_url_archive_url,
              source_url_error_message: urlHealthData.source_url_error_message,
              url_check_attempts: urlHealthData.url_check_attempts
            })

          if (insertError) {
            console.error(`   Error storing promise:`, insertError.message)
            errors.push(insertError.message)
            continue
          }

          stored++
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`   Error:`, errorMsg)
          errors.push(errorMsg)
        }
      }

      console.log(`   ✅ Stored ${stored} promises`)

      results.push({
        articleId: article.id,
        articleTitle: article.title || 'Untitled',
        articleUrl: article.url,
        politicianName: mentionedPolitician.name,
        promisesFound: promises.length,
        promisesStored: stored,
        errors
      })

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Error processing article ${article.id}:`, errorMsg)

      results.push({
        articleId: article.id,
        articleTitle: article.title || 'Untitled',
        articleUrl: article.url,
        politicianName: null,
        promisesFound: 0,
        promisesStored: 0,
        errors: [errorMsg]
      })
    }
  }

  return results
}

/**
 * Extract promises from a specific politician's news mentions
 */
export async function extractPromisesForPolitician(
  politicianName: string,
  options: { limit?: number; sinceDate?: string } = {}
): Promise<NewsPromiseExtractionResult[]> {
  return extractPromisesFromNews({
    ...options,
    politicianNames: [politicianName]
  })
}
