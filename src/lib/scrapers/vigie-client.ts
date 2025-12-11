/**
 * Vigie du mensonge Client
 * Scraper for the French political fact-checking platform
 *
 * Source: https://www.vigiedumensonge.fr
 *
 * This importer:
 * 1. Scrapes promise data from Vigie du mensonge
 * 2. Maps their statuses to our verification system
 * 3. Stores promises with source attribution in promise_sources table
 * 4. Respects rate limiting and proper attribution
 */

import * as cheerio from 'cheerio'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type {
  PromiseCategory,
  PromiseStatus,
  PoliticalPromiseInsert,
  PromiseSourceInsert
} from '@/lib/supabase'

// Vigie-specific types
export interface VigiePromise {
  politicianName: string
  statement: string
  date: string
  status: VigieStatus
  sources: string[]
  category: string
  vigieUrl: string
  vigieId: string
}

export type VigieStatus =
  | 'promesse_tenue'
  | 'promesse_rompue'
  | 'promesse_en_cours'
  | 'promesse_non_tenue'
  | 'mensonge'
  | 'trompeur'
  | 'vrai'
  | 'faux'

export interface VigieVerification {
  isVerified: boolean
  status: PromiseStatus
  sources: string[]
  verificationDate: string
  vigieUrl: string
  confidence: number
}

export interface VigieImportResult {
  success: boolean
  jobId: string
  promisesFound: number
  promisesImported: number
  promisesSkipped: number
  errors: string[]
  duration: number
}

// Map Vigie categories to our categories
const CATEGORY_MAP: Record<string, PromiseCategory> = {
  'economie': 'economic',
  'économie': 'economic',
  'fiscalite': 'economic',
  'fiscalité': 'economic',
  'social': 'social',
  'societe': 'social',
  'société': 'social',
  'environnement': 'environmental',
  'ecologie': 'environmental',
  'écologie': 'environmental',
  'climat': 'environmental',
  'securite': 'security',
  'sécurité': 'security',
  'defense': 'security',
  'défense': 'security',
  'sante': 'healthcare',
  'santé': 'healthcare',
  'education': 'education',
  'éducation': 'education',
  'justice': 'justice',
  'immigration': 'immigration',
  'europe': 'foreign_policy',
  'international': 'foreign_policy',
  'politique_etrangere': 'foreign_policy'
}

// Map Vigie statuses to our promise statuses
const STATUS_MAP: Record<VigieStatus, PromiseStatus> = {
  'promesse_tenue': 'kept',
  'promesse_rompue': 'broken',
  'promesse_non_tenue': 'broken',
  'promesse_en_cours': 'pending',
  'mensonge': 'broken',
  'trompeur': 'partial',
  'vrai': 'kept',
  'faux': 'broken'
}

export class VigieClient {
  private baseUrl = 'https://www.vigiedumensonge.fr'
  private userAgent = 'PolitikCred-Bot/1.0 (Fact-checking platform; https://politikcred.fr)'
  private rateLimitMs = 2000 // 2 seconds between requests

  /**
   * Fetch HTML content from a URL with proper headers
   */
  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    }

    return response.text()
  }

  /**
   * Parse Vigie category from text
   */
  private parseCategory(categoryText: string): PromiseCategory {
    const normalized = categoryText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '_')

    return CATEGORY_MAP[normalized] || 'other'
  }

  /**
   * Parse Vigie status from text or class name
   */
  private parseStatus(statusText: string): PromiseStatus {
    const normalized = statusText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') as VigieStatus

    return STATUS_MAP[normalized] || 'pending'
  }

  /**
   * Search for promises by politician name
   * NOTE: This scrapes the public search results from Vigie
   */
  async searchPromises(politicianName: string): Promise<VigiePromise[]> {
    const promises: VigiePromise[] = []

    try {
      // URL encode the politician name
      const searchQuery = encodeURIComponent(politicianName)
      const searchUrl = `${this.baseUrl}/recherche?q=${searchQuery}`

      console.log(`[Vigie] Searching for: ${politicianName}`)
      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      // Parse search results (adjust selectors based on actual site structure)
      $('.promise-card, .result-item, article.promise').each((_, element) => {
        try {
          const $el = $(element)

          // Extract promise data (selectors are examples - adjust to actual site)
          const statement = $el.find('.promise-text, .statement, h3').first().text().trim()
          const statusText = $el.find('.status, .verdict, .badge').first().text().trim()
          const categoryText = $el.find('.category, .theme').first().text().trim()
          const dateText = $el.find('.date, time').first().text().trim()
          const link = $el.find('a').first().attr('href')

          if (statement && statement.length > 10) {
            const vigieId = link ? link.split('/').pop() || `search-${Date.now()}` : `search-${Date.now()}`

            promises.push({
              politicianName,
              statement,
              date: dateText || new Date().toISOString(),
              status: this.parseStatusFromText(statusText) as VigieStatus,
              sources: link ? [`${this.baseUrl}${link}`] : [],
              category: categoryText,
              vigieUrl: link ? `${this.baseUrl}${link}` : searchUrl,
              vigieId
            })
          }
        } catch (parseError) {
          console.error('[Vigie] Failed to parse element:', parseError)
        }
      })

      console.log(`[Vigie] Found ${promises.length} promises for ${politicianName}`)
    } catch (error) {
      console.error(`[Vigie] Search failed for ${politicianName}:`, error)
    }

    return promises
  }

  /**
   * Parse status from display text
   */
  private parseStatusFromText(text: string): VigieStatus {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('tenue') || lowerText.includes('vrai') || lowerText.includes('respectée')) {
      return 'promesse_tenue'
    }
    if (lowerText.includes('rompue') || lowerText.includes('non tenue') || lowerText.includes('faux')) {
      return 'promesse_rompue'
    }
    if (lowerText.includes('mensonge')) {
      return 'mensonge'
    }
    if (lowerText.includes('trompeur') || lowerText.includes('partiellement')) {
      return 'trompeur'
    }
    if (lowerText.includes('en cours')) {
      return 'promesse_en_cours'
    }

    return 'promesse_en_cours'
  }

  /**
   * Verify if a promise exists in Vigie's database
   */
  async verifyPromise(promiseText: string): Promise<VigieVerification | null> {
    try {
      // Search for similar text in Vigie
      const searchQuery = encodeURIComponent(promiseText.substring(0, 100))
      const searchUrl = `${this.baseUrl}/recherche?q=${searchQuery}`

      console.log(`[Vigie] Verifying promise: ${promiseText.substring(0, 50)}...`)
      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      // Look for matching promises
      let bestMatch: VigieVerification | null = null

      $('.promise-card, .result-item, article.promise').each((_, element) => {
        const $el = $(element)
        const statement = $el.find('.promise-text, .statement, h3').first().text().trim()
        const statusText = $el.find('.status, .verdict, .badge').first().text().trim()
        const link = $el.find('a').first().attr('href')

        // Simple similarity check (Jaccard-like)
        const similarity = this.calculateSimilarity(promiseText, statement)

        if (similarity > 0.3 && (!bestMatch || similarity > bestMatch.confidence)) {
          bestMatch = {
            isVerified: true,
            status: STATUS_MAP[this.parseStatusFromText(statusText) as VigieStatus] || 'pending',
            sources: link ? [`${this.baseUrl}${link}`] : [],
            verificationDate: new Date().toISOString(),
            vigieUrl: link ? `${this.baseUrl}${link}` : searchUrl,
            confidence: similarity
          }
        }
      })

      return bestMatch
    } catch (error) {
      console.error('[Vigie] Verification failed:', error)
      return null
    }
  }

  /**
   * Simple text similarity (Jaccard on words)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3))

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Get all promises for a list of politicians
   */
  async getBulkPromises(politicians: string[]): Promise<VigiePromise[]> {
    const allPromises: VigiePromise[] = []

    for (const politician of politicians) {
      await this.sleep(this.rateLimitMs)
      const promises = await this.searchPromises(politician)
      allPromises.push(...promises)
    }

    return allPromises
  }

  /**
   * Import promises from Vigie into our database
   */
  async importPromises(politicianNames: string[]): Promise<VigieImportResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let promisesFound = 0
    let promisesImported = 0
    let promisesSkipped = 0

    // Use admin client if available, otherwise use regular client
    const db = supabaseAdmin || supabase

    // Create job tracking
    const { data: job, error: jobError } = await db
      .from('data_collection_jobs')
      .insert({
        job_type: 'vigie_import',
        status: 'running',
        source: 'vigiedumensonge.fr',
        metadata: { politicians: politicianNames }
      })
      .select()
      .single()

    const jobId = job?.id || 'unknown'

    if (jobError) {
      console.error('[Vigie] Failed to create job:', jobError)
    }

    try {
      console.log(`[Vigie] Starting import for ${politicianNames.length} politicians...`)

      for (const politicianName of politicianNames) {
        await this.sleep(this.rateLimitMs)

        try {
          // Find politician in our database
          const { data: politician } = await db
            .from('politicians')
            .select('id, name')
            .ilike('name', `%${politicianName}%`)
            .single()

          if (!politician) {
            console.log(`[Vigie] Politician not found in DB: ${politicianName}`)
            continue
          }

          // Scrape promises from Vigie
          const vigiePromises = await this.searchPromises(politicianName)
          promisesFound += vigiePromises.length

          for (const vp of vigiePromises) {
            try {
              // Check if promise already exists (by similar text)
              const { data: existing } = await db
                .from('political_promises')
                .select('id')
                .eq('politician_id', politician.id)
                .ilike('promise_text', `%${vp.statement.substring(0, 50)}%`)
                .limit(1)

              if (existing && existing.length > 0) {
                // Promise exists - add Vigie as a source
                const promiseId = existing[0].id

                // Check if Vigie source already exists
                const { data: existingSource } = await db
                  .from('promise_sources')
                  .select('id')
                  .eq('promise_id', promiseId)
                  .eq('source_type', 'vigie')
                  .limit(1)

                if (!existingSource || existingSource.length === 0) {
                  // Add Vigie as a source
                  const sourceInsert: PromiseSourceInsert = {
                    promise_id: promiseId,
                    source_type: 'vigie',
                    source_url: vp.vigieUrl,
                    source_name: 'Vigie du mensonge',
                    status_claimed: STATUS_MAP[vp.status],
                    evidence_text: vp.statement,
                    confidence: 0.85, // Vigie is a reliable source
                    credibility_weight: 1.0
                  }

                  await db.from('promise_sources').insert(sourceInsert)
                  console.log(`[Vigie] Added source to existing promise: ${promiseId}`)
                }

                promisesSkipped++
              } else {
                // Create new promise
                const promiseInsert: PoliticalPromiseInsert = {
                  politician_id: politician.id,
                  promise_text: vp.statement,
                  promise_date: vp.date || new Date().toISOString(),
                  category: this.parseCategory(vp.category),
                  source_url: vp.vigieUrl,
                  source_type: 'other', // External fact-check site
                  extraction_method: 'scraped',
                  confidence_score: 0.85,
                  verification_status: 'verified',
                  is_actionable: true,
                  context: `Importé depuis Vigie du mensonge (${vp.vigieId})`,
                  source_url_status: 'valid',
                  authenticity_flags: {
                    is_verified: true,
                    has_multiple_sources: false,
                    community_verified: true
                  }
                }

                const { data: newPromise, error: promiseError } = await db
                  .from('political_promises')
                  .insert(promiseInsert)
                  .select()
                  .single()

                if (promiseError) {
                  throw promiseError
                }

                // Add Vigie as the source
                const sourceInsert: PromiseSourceInsert = {
                  promise_id: newPromise.id,
                  source_type: 'vigie',
                  source_url: vp.vigieUrl,
                  source_name: 'Vigie du mensonge',
                  status_claimed: STATUS_MAP[vp.status],
                  evidence_text: vp.statement,
                  confidence: 0.85,
                  credibility_weight: 1.0
                }

                await db.from('promise_sources').insert(sourceInsert)

                promisesImported++
                console.log(`[Vigie] Imported new promise: ${vp.statement.substring(0, 50)}...`)
              }
            } catch (error) {
              const errorMsg = `Failed to import promise: ${error}`
              console.error(`[Vigie] ${errorMsg}`)
              errors.push(errorMsg)
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process politician ${politicianName}: ${error}`
          console.error(`[Vigie] ${errorMsg}`)
          errors.push(errorMsg)
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update job status
      if (jobId !== 'unknown') {
        await db
          .from('data_collection_jobs')
          .update({
            status: 'completed',
            records_collected: promisesFound,
            records_new: promisesImported,
            records_skipped: promisesSkipped,
            error_count: errors.length,
            completed_at: new Date().toISOString(),
            duration_seconds: duration
          })
          .eq('id', jobId)
      }

      console.log(`[Vigie] Import completed: ${promisesImported} new, ${promisesSkipped} existing, ${errors.length} errors`)

      return {
        success: true,
        jobId,
        promisesFound,
        promisesImported,
        promisesSkipped,
        errors,
        duration
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const duration = Math.round((Date.now() - startTime) / 1000)

      if (jobId !== 'unknown') {
        await db
          .from('data_collection_jobs')
          .update({
            status: 'failed',
            error_message: errorMsg,
            records_collected: promisesFound,
            records_new: promisesImported,
            completed_at: new Date().toISOString(),
            duration_seconds: duration
          })
          .eq('id', jobId)
      }

      return {
        success: false,
        jobId,
        promisesFound,
        promisesImported,
        promisesSkipped,
        errors: [...errors, errorMsg],
        duration
      }
    }
  }

  /**
   * Map Vigie status to our verification status
   */
  mapStatus(vigieStatus: VigieStatus): PromiseStatus {
    return STATUS_MAP[vigieStatus] || 'pending'
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Attribution: Generate proper credit for Vigie data
   */
  generateAttribution(vigieUrl: string): string {
    return `Données vérifiées par Vigie du mensonge - ${vigieUrl}`
  }
}

// Export singleton
export const vigieClient = new VigieClient()

/**
 * Example usage:
 *
 * // Search for promises
 * const promises = await vigieClient.searchPromises('Emmanuel Macron')
 *
 * // Verify a specific promise
 * const verification = await vigieClient.verifyPromise('Je m\'engage à...')
 *
 * // Import promises for multiple politicians
 * const result = await vigieClient.importPromises(['Emmanuel Macron', 'Marine Le Pen'])
 */
