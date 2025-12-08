/**
 * Promise Collection System
 * Collects political promises from various French political sources
 *
 * Sources:
 * - Political party manifestos
 * - Campaign websites
 * - News articles with politician quotes
 * - Twitter/X posts
 * - Debate transcripts
 */

import { promiseClassifier, PromiseCandidate } from './promise-classifier'
import { validateURL, getURLUpdateData } from '../validation/url-validator'
import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client for server-side use
 * This is a separate client to avoid build-time placeholder issues
 * Uses service role key if available for bypassing RLS in scripts
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key for server-side operations, fall back to anon key
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

export interface PromiseSource {
  url: string
  type: 'campaign_site' | 'interview' | 'social_media' | 'debate' | 'manifesto' | 'other'
  politicianName: string
  date?: string
  content?: string
}

export interface CollectionResult {
  source: PromiseSource
  promisesFound: number
  promisesStored: number
  promises: PromiseCandidate[]
  errors: string[]
}

export class PromiseCollector {
  /**
   * Collect promises from a given source
   */
  async collectFromSource(source: PromiseSource): Promise<CollectionResult> {
    const errors: string[] = []

    try {
      // If content is not provided, fetch it
      let content = source.content
      if (!content) {
        content = await this.fetchContent(source.url)
      }

      // Extract promises from content
      const promises = promiseClassifier.extractPromises(content, source.url)

      console.log(`Found ${promises.length} promises from ${source.url}`)

      return {
        source,
        promisesFound: promises.length,
        promisesStored: 0, // Will be updated when stored
        promises,
        errors
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error collecting promises from ${source.url}:`, errorMsg)
      errors.push(errorMsg)

      return {
        source,
        promisesFound: 0,
        promisesStored: 0,
        promises: [],
        errors
      }
    }
  }

  /**
   * Collect promises from multiple sources
   */
  async collectFromMultipleSources(sources: PromiseSource[]): Promise<CollectionResult[]> {
    const results: CollectionResult[] = []

    for (const source of sources) {
      const result = await this.collectFromSource(source)
      results.push(result)

      // Rate limiting: wait 1 second between requests
      await this.sleep(1000)
    }

    return results
  }

  /**
   * Store collected promises in database
   * Requires politician ID from database
   * NOW WITH URL VALIDATION
   */
  async storePromises(
    politicianId: string,
    promises: PromiseCandidate[],
    source: PromiseSource
  ): Promise<{ stored: number; errors: string[]; urlValidation?: any }> {
    const errors: string[] = []
    let stored = 0
    const supabase = getSupabaseClient()

    // STEP 1: Validate source URL before storing promises
    console.log(`Validating source URL: ${source.url}`)
    const urlValidation = await validateURL(source.url)

    if (!urlValidation.isAccessible) {
      const errorMsg = `Source URL is not accessible: ${urlValidation.errorMessage} (${urlValidation.status})`
      console.error(errorMsg)
      errors.push(errorMsg)

      if (urlValidation.archiveUrl) {
        console.log(`ℹ️  Archive available: ${urlValidation.archiveUrl}`)
        errors.push(`Archive available at: ${urlValidation.archiveUrl}`)
      }

      return { stored: 0, errors, urlValidation }
    }

    console.log(`✅ URL validated: ${urlValidation.status} (HTTP ${urlValidation.httpStatus})`)

    // Use redirect URL if available (permanent redirect)
    const effectiveUrl = urlValidation.redirectUrl || source.url

    // Get URL health data for storage
    const urlHealthData = await getURLUpdateData(urlValidation, 0)

    // STEP 2: Store promises with URL health tracking
    for (const promise of promises) {
      try {
        const { error } = await supabase.from('political_promises').insert({
          politician_id: politicianId,
          promise_text: promise.text,
          promise_date: source.date || new Date().toISOString(),
          category: promise.category,
          source_url: effectiveUrl, // Use effective URL (after redirect)
          source_type: source.type,
          extraction_method: 'ai_extracted',
          confidence_score: promise.confidence,
          verification_status: promise.isActionable ? 'actionable' : 'non_actionable',
          is_actionable: promise.isActionable,
          context: `Keywords: ${promise.keywords.join(', ')}`,
          // URL health tracking fields
          source_url_status: urlHealthData.source_url_status,
          source_url_http_status: urlHealthData.source_url_http_status,
          source_url_last_checked: urlHealthData.source_url_last_checked,
          source_url_redirect_url: urlHealthData.source_url_redirect_url,
          source_url_archive_url: urlHealthData.source_url_archive_url,
          source_url_error_message: urlHealthData.source_url_error_message,
          url_check_attempts: urlHealthData.url_check_attempts
        })

        if (error) {
          console.error('Error storing promise:', error)
          errors.push(error.message)
          continue
        }

        stored++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error storing promise:', errorMsg)
        errors.push(errorMsg)
      }
    }

    return { stored, errors, urlValidation }
  }

  /**
   * Fetch content from URL
   * In production, this should use a proper web scraper
   */
  private async fetchContent(url: string): Promise<string> {
    // For now, throw an error - content must be provided
    // In production, implement proper web scraping here
    throw new Error('Content fetching not yet implemented. Please provide content directly.')
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get politician ID by name
   */
  async getPoliticianIdByName(name: string): Promise<string | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('politicians')
      .select('id')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single()

    if (error || !data) {
      console.error(`Politician not found: ${name}`)
      return null
    }

    return data.id
  }

  /**
   * Complete workflow: collect and store promises
   */
  async collectAndStore(source: PromiseSource): Promise<{
    success: boolean
    promisesFound: number
    promisesStored: number
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // Get politician ID
      const politicianId = await this.getPoliticianIdByName(source.politicianName)
      if (!politicianId) {
        throw new Error(`Politician not found in database: ${source.politicianName}`)
      }

      // Collect promises
      const result = await this.collectFromSource(source)
      errors.push(...result.errors)

      if (result.promises.length === 0) {
        return {
          success: true,
          promisesFound: 0,
          promisesStored: 0,
          errors
        }
      }

      // Store promises
      const { stored, errors: storeErrors } = await this.storePromises(
        politicianId,
        result.promises,
        source
      )
      errors.push(...storeErrors)

      return {
        success: true,
        promisesFound: result.promisesFound,
        promisesStored: stored,
        errors
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(errorMsg)

      return {
        success: false,
        promisesFound: 0,
        promisesStored: 0,
        errors
      }
    }
  }
}

// Export singleton
export const promiseCollector = new PromiseCollector()

/**
 * Sample French Political Sources for Promise Collection
 */
export const FRENCH_POLITICAL_SOURCES = {
  // Emmanuel Macron
  macron: {
    manifestos: [
      'https://en-marche.fr/emmanuel-macron/le-programme',
      'https://avecvous.fr/'
    ],
    speeches: [
      // Add speech URLs
    ]
  },

  // Marine Le Pen
  marineLePen: {
    manifestos: [
      'https://rassemblementnational.fr/programme/'
    ]
  },

  // Jean-Luc Mélenchon
  melenchon: {
    manifestos: [
      'https://lafranceinsoumise.fr/programme/'
    ]
  },

  // Political parties
  parties: {
    rn: 'https://rassemblementnational.fr',
    lfi: 'https://lafranceinsoumise.fr',
    lrem: 'https://en-marche.fr',
    lr: 'https://republicains.fr',
    ps: 'https://parti-socialiste.fr',
    eelv: 'https://eelv.fr'
  }
}
