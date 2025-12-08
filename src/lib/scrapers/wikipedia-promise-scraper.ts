/**
 * Wikipedia/WikiData Promise Scraper
 *
 * Extracts political promises from Wikipedia pages about:
 * - French political campaigns
 * - Party manifestos
 * - Politician biographies
 * - Election programs
 */

import { promiseClassifier } from '../promise-extraction/promise-classifier'
import { validateURL, getURLUpdateData } from '../validation/url-validator'
import { createClient } from '@supabase/supabase-js'

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

interface WikipediaPage {
  title: string
  extract: string
  url: string
  pageid: number
}

/**
 * Fetch Wikipedia page content using MediaWiki API
 */
async function fetchWikipediaPage(pageTitle: string): Promise<WikipediaPage | null> {
  try {
    // Use French Wikipedia API
    const url = new URL('https://fr.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('titles', pageTitle)
    url.searchParams.set('prop', 'extracts|info')
    url.searchParams.set('exintro', 'false')
    url.searchParams.set('explaintext', 'true')
    url.searchParams.set('inprop', 'url')
    url.searchParams.set('origin', '*')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    const pages = data.query?.pages

    if (!pages) {
      return null
    }

    const page = Object.values(pages)[0] as any

    if (page.missing) {
      return null
    }

    return {
      title: page.title,
      extract: page.extract || '',
      url: page.fullurl || `https://fr.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      pageid: page.pageid
    }
  } catch (error) {
    console.error(`Error fetching Wikipedia page "${pageTitle}":`, error)
    return null
  }
}

/**
 * Search Wikipedia for pages about a politician
 */
async function searchWikipedia(query: string, limit: number = 5): Promise<string[]> {
  try {
    const url = new URL('https://fr.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'opensearch')
    url.searchParams.set('format', 'json')
    url.searchParams.set('search', query)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('origin', '*')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Wikipedia search error: ${response.status}`)
    }

    const data = await response.json()
    const titles = data[1] as string[]

    return titles || []
  } catch (error) {
    console.error(`Error searching Wikipedia for "${query}":`, error)
    return []
  }
}

export interface WikipediaExtractionResult {
  politicianName: string
  wikipediaPages: string[]
  promisesFound: number
  promisesStored: number
  errors: string[]
}

/**
 * Extract promises from Wikipedia pages about a politician
 */
export async function extractPromisesFromWikipedia(
  politicianName: string
): Promise<WikipediaExtractionResult> {
  const supabase = getSupabaseClient()
  const errors: string[] = []

  console.log(`\n📚 Extracting promises from Wikipedia for: ${politicianName}`)

  // Step 1: Get politician ID from database
  const { data: politician } = await supabase
    .from('politicians')
    .select('id')
    .ilike('name', `%${politicianName}%`)
    .single()

  if (!politician) {
    const errorMsg = `Politician not found: ${politicianName}`
    console.error(errorMsg)
    return {
      politicianName,
      wikipediaPages: [],
      promisesFound: 0,
      promisesStored: 0,
      errors: [errorMsg]
    }
  }

  // Step 2: Search Wikipedia for relevant pages
  const searchQueries = [
    politicianName,
    `${politicianName} programme`,
    `${politicianName} campagne`,
    `${politicianName} élection`,
    `${politicianName} 2022`,
    `${politicianName} 2024`,
    `${politicianName} 2027`
  ]

  const allTitles = new Set<string>()

  for (const query of searchQueries) {
    const titles = await searchWikipedia(query, 3)
    titles.forEach(t => allTitles.add(t))
    await new Promise(resolve => setTimeout(resolve, 200)) // Rate limit
  }

  console.log(`   Found ${allTitles.size} Wikipedia pages`)

  if (allTitles.size === 0) {
    return {
      politicianName,
      wikipediaPages: [],
      promisesFound: 0,
      promisesStored: 0,
      errors: ['No Wikipedia pages found']
    }
  }

  // Step 3: Extract promises from each page
  let totalPromisesFound = 0
  let totalPromisesStored = 0
  const processedPages: string[] = []

  for (const title of Array.from(allTitles)) {
    try {
      console.log(`\n   📖 Processing: ${title}`)

      const page = await fetchWikipediaPage(title)

      if (!page || !page.extract) {
        console.log(`      No content found`)
        continue
      }

      // Extract promises from page content
      const promises = promiseClassifier.extractPromises(page.extract, page.url)

      if (promises.length === 0) {
        console.log(`      No promises found`)
        continue
      }

      console.log(`      Found ${promises.length} promises`)
      totalPromisesFound += promises.length

      // Validate Wikipedia URL (should always be valid)
      const urlValidation = await validateURL(page.url)
      const urlHealthData = await getURLUpdateData(urlValidation, 0)

      // Store promises
      let stored = 0

      for (const promise of promises) {
        try {
          const { error: insertError } = await supabase
            .from('political_promises')
            .insert({
              politician_id: politician.id,
              promise_text: promise.text,
              promise_date: new Date().toISOString(), // Wikipedia doesn't always have specific dates
              category: promise.category,
              source_url: page.url,
              source_type: 'manifesto', // Wikipedia campaign pages are like manifestos
              extraction_method: 'ai_extracted',
              confidence_score: promise.confidence,
              verification_status: promise.isActionable ? 'actionable' : 'non_actionable',
              is_actionable: promise.isActionable,
              context: `From Wikipedia: ${page.title}. Keywords: ${promise.keywords.join(', ')}`,
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
            console.error(`      Error storing promise:`, insertError.message)
            errors.push(insertError.message)
            continue
          }

          stored++
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(errorMsg)
        }
      }

      console.log(`      ✅ Stored ${stored} promises`)
      totalPromisesStored += stored
      processedPages.push(title)

      // Rate limiting: Wikipedia has strict rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`   Error processing "${title}":`, errorMsg)
      errors.push(errorMsg)
    }
  }

  return {
    politicianName,
    wikipediaPages: processedPages,
    promisesFound: totalPromisesFound,
    promisesStored: totalPromisesStored,
    errors
  }
}

/**
 * Extract promises for multiple politicians from Wikipedia
 */
export async function extractPromisesFromWikipediaForAll(
  politicianNames: string[]
): Promise<WikipediaExtractionResult[]> {
  const results: WikipediaExtractionResult[] = []

  for (const name of politicianNames) {
    const result = await extractPromisesFromWikipedia(name)
    results.push(result)

    // Rate limiting between politicians
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}

/**
 * Get French political campaign pages from Wikipedia
 */
export const FRENCH_CAMPAIGN_PAGES = [
  'Élection présidentielle française de 2022',
  'Élection présidentielle française de 2027',
  'Élections législatives françaises de 2022',
  'Élections législatives françaises de 2024',
  'Programme d\'Emmanuel Macron',
  'Programme de Marine Le Pen',
  'Programme de Jean-Luc Mélenchon',
  'La France insoumise',
  'Rassemblement national',
  'Renaissance (parti politique)',
  'Les Républicains',
  'Parti socialiste (France)'
]
