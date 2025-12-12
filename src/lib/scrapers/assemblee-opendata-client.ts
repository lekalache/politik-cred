/**
 * Assemblée Nationale Official Open Data Client
 * Fetches data from data.assemblee-nationale.fr static repository
 *
 * This provides official government data including:
 * - Votes/Scrutins: Voting positions of deputies
 * - Deputies: Current active deputies with their info
 *
 * Data Source: https://data.assemblee-nationale.fr/
 * Uses static ZIP file repository for reliable data access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { mkdirSync, readdirSync, readFileSync, rmSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import AdmZip from 'adm-zip'

// Create admin client directly for server-side operations that bypass RLS
// This is initialized lazily to allow env vars to be loaded first
let _db: SupabaseClient | null = null

function getDb(): SupabaseClient {
  if (!_db) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Use service role key if available, otherwise anon key
    _db = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`📦 AN Client using: ${supabaseServiceKey ? 'service_role' : 'anon'} key`)
  }
  return _db
}

// ============================================================================
// Type Definitions
// ============================================================================

interface VotePosition {
  acteurRef: string
  position: 'pour' | 'contre' | 'abstention' | 'nonVotant'
}

interface ScrutinData {
  uid: string
  numero: string
  legislature: string
  dateScrutin: string
  titre: string
  sort: {
    code: string
    libelle: string
  }
  syntheseVote: {
    nombreVotants: string
    suffragesExprimes: string
    decompte: {
      pour: string
      contre: string
      abstentions: string
      nonVotants: string
    }
  }
  ventilationVotes?: {
    organe?: {
      groupes?: {
        groupe?: Array<{
          organeRef: string
          vote?: {
            decompteNominatif?: {
              pours?: { votant?: Array<{ acteurRef: string }> | { acteurRef: string } }
              contres?: { votant?: Array<{ acteurRef: string }> | { acteurRef: string } }
              abstentions?: { votant?: Array<{ acteurRef: string }> | { acteurRef: string } }
              nonVotants?: { votant?: Array<{ acteurRef: string }> | { acteurRef: string } }
            }
          }
        }>
      }
    }
  }
}

interface DeputyData {
  uid: string
  etatCivil: {
    ident: {
      prenom: string
      nom: string
      civ: string
    }
    infoNaissance?: {
      dateNais?: string
    }
  }
}

// ============================================================================
// Main Client Class
// ============================================================================

class AssembleeOpendataClient {
  private baseUrl = 'https://data.assemblee-nationale.fr'
  private legislature = '17' // 17th legislature is now active with data
  private rateLimitMs = 100

  // Static repository URLs
  private scrutinsUrl = `${this.baseUrl}/static/openData/repository/${this.legislature}/loi/scrutins/Scrutins.json.zip`
  private deputiesUrl = `${this.baseUrl}/static/openData/repository/${this.legislature}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`

  // Cache for acteur -> politician ID mappings
  private acteurCache = new Map<string, string | null>()
  private deputiesCache = new Map<string, { prenom: string; nom: string }>()

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==========================================================================
  // ZIP Download and Extraction
  // ==========================================================================

  /**
   * Download and extract a ZIP file to a temporary directory
   */
  private async downloadAndExtractZip(url: string, prefix: string): Promise<string> {
    const tempDir = join(tmpdir(), `an-opendata-${prefix}-${Date.now()}`)

    try {
      mkdirSync(tempDir, { recursive: true })

      console.log(`📥 Downloading ${prefix} data from AN...`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PolitikCred/1.0 (https://politikcred.fr)'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download ${prefix}: ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())

      console.log(`📦 Extracting ${prefix} data (${(buffer.length / 1024 / 1024).toFixed(1)} MB)...`)

      // Extract using adm-zip
      const zip = new AdmZip(buffer)
      zip.extractAllTo(tempDir, true)

      console.log(`✅ ${prefix} data extracted to ${tempDir}`)
      return tempDir
    } catch (error) {
      console.error(`Error downloading/extracting ${prefix}:`, error)
      throw error
    }
  }

  /**
   * Read all JSON files from extracted directory
   */
  private readJsonFiles<T>(dir: string, subdir: string): T[] {
    const results: T[] = []
    const jsonDir = join(dir, subdir)

    if (!existsSync(jsonDir)) {
      // Try direct json folder
      const altDir = join(dir, 'json')
      if (existsSync(altDir)) {
        return this.readJsonFilesFromDir<T>(altDir)
      }
      console.warn(`Directory not found: ${jsonDir}`)
      return []
    }

    return this.readJsonFilesFromDir<T>(jsonDir)
  }

  private readJsonFilesFromDir<T>(jsonDir: string): T[] {
    const results: T[] = []

    try {
      const files = readdirSync(jsonDir)

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const filePath = join(jsonDir, file)
          const content = readFileSync(filePath, 'utf-8')
          const data = JSON.parse(content)
          results.push(data)
        } catch (e) {
          // Skip invalid files
        }
      }
    } catch (e) {
      // Check for nested structure (e.g., json/acteur/)
      const nestedDir = readdirSync(jsonDir)
      for (const subFolder of nestedDir) {
        const subPath = join(jsonDir, subFolder)
        try {
          const stat = statSync(subPath)
          if (stat.isDirectory()) {
            const nestedFiles = readdirSync(subPath)
            for (const file of nestedFiles) {
              if (!file.endsWith('.json')) continue
              try {
                const filePath = join(subPath, file)
                const content = readFileSync(filePath, 'utf-8')
                const data = JSON.parse(content)
                results.push(data)
              } catch (e) {
                // Skip invalid files
              }
            }
          }
        } catch (e) {
          // Not a directory, skip
        }
      }
    }

    return results
  }

  /**
   * Cleanup temporary directory
   */
  private cleanup(dir: string): void {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch (e) {
      console.warn(`Failed to cleanup ${dir}`)
    }
  }

  // ==========================================================================
  // Deputies Data
  // ==========================================================================

  /**
   * Load deputies data into cache
   */
  async loadDeputiesCache(): Promise<number> {
    console.log('👥 Loading deputies data...')

    let tempDir: string | null = null

    try {
      tempDir = await this.downloadAndExtractZip(this.deputiesUrl, 'deputies')

      // Read all deputy JSON files - they're in json/acteur/ subfolder
      const jsonDir = join(tempDir, 'json')

      if (!existsSync(jsonDir)) {
        console.error('No json directory found in deputies zip')
        return 0
      }

      // Check for acteur subfolder
      const acteurDir = join(jsonDir, 'acteur')
      const targetDir = existsSync(acteurDir) ? acteurDir : jsonDir

      const files = readdirSync(targetDir)
      let count = 0

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const filePath = join(targetDir, file)
          const content = readFileSync(filePath, 'utf-8')
          const data = JSON.parse(content)

          const acteur = data.acteur
          if (!acteur) continue

          const uid = typeof acteur.uid === 'object' ? acteur.uid['#text'] : acteur.uid
          const prenom = acteur.etatCivil?.ident?.prenom || ''
          const nom = acteur.etatCivil?.ident?.nom || ''

          if (uid && (prenom || nom)) {
            this.deputiesCache.set(uid, { prenom, nom })
            count++
          }
        } catch (e) {
          // Skip invalid files
        }
      }

      console.log(`✅ Loaded ${count} deputies into cache`)
      return count

    } finally {
      if (tempDir) this.cleanup(tempDir)
    }
  }

  /**
   * Normalize a name for matching (handle accents, hyphens, case)
   */
  private normalizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .trim()
  }

  /**
   * Map acteurRef to politician in database
   */
  async mapActeurToPolitician(acteurRef: string): Promise<string | null> {
    // Check cache first
    if (this.acteurCache.has(acteurRef)) {
      return this.acteurCache.get(acteurRef) || null
    }

    // Check if we already have this mapping in database
    const { data: existing } = await getDb()
      .from('politicians')
      .select('id')
      .contains('metadata', { acteurRef })
      .single()

    if (existing) {
      this.acteurCache.set(acteurRef, existing.id)
      return existing.id
    }

    // Get deputy info from cache
    const deputyInfo = this.deputiesCache.get(acteurRef)
    if (!deputyInfo) {
      this.acteurCache.set(acteurRef, null)
      return null
    }

    const { prenom, nom } = deputyInfo
    const normalizedNom = this.normalizeName(nom)
    const normalizedPrenom = this.normalizeName(prenom)

    // Strategy 1: Try exact name match
    let { data: politician } = await getDb()
      .from('politicians')
      .select('id')
      .eq('last_name', nom)
      .eq('first_name', prenom)
      .single()

    // Strategy 2: Case-insensitive match
    if (!politician) {
      const result = await getDb()
        .from('politicians')
        .select('id')
        .ilike('last_name', nom)
        .ilike('first_name', prenom)
        .single()
      politician = result.data
    }

    // Strategy 3: Try with wildcards for partial matches
    if (!politician) {
      const result = await getDb()
        .from('politicians')
        .select('id')
        .ilike('last_name', `%${nom}%`)
        .ilike('first_name', `%${prenom.split('-')[0]}%`)
        .single()
      politician = result.data
    }

    // Strategy 4: Search by last name only, then match first name manually
    if (!politician) {
      const result = await getDb()
        .from('politicians')
        .select('id, first_name, last_name')
        .or(`last_name.ilike.%${nom}%,last_name.ilike.%${nom.toUpperCase()}%`)
        .limit(10)

      if (result.data && result.data.length > 0) {
        for (const p of result.data) {
          const pNomNorm = this.normalizeName(p.last_name || '')
          const pPrenomNorm = this.normalizeName(p.first_name || '')

          // Check if names match when normalized
          if (pNomNorm === normalizedNom || pNomNorm.includes(normalizedNom) || normalizedNom.includes(pNomNorm)) {
            if (pPrenomNorm === normalizedPrenom ||
                pPrenomNorm.startsWith(normalizedPrenom.split('-')[0]) ||
                normalizedPrenom.startsWith(pPrenomNorm.split('-')[0])) {
              politician = { id: p.id }
              break
            }
          }
        }
      }
    }

    // Strategy 5: Full text search on name column if it exists
    if (!politician) {
      const fullName = `${prenom} ${nom}`
      const result = await getDb()
        .from('politicians')
        .select('id, first_name, last_name, name')
        .or(`name.ilike.%${fullName}%,name.ilike.%${nom}%`)
        .limit(5)

      if (result.data && result.data.length > 0) {
        for (const p of result.data) {
          const pNomNorm = this.normalizeName(p.last_name || '')
          if (pNomNorm === normalizedNom || pNomNorm.includes(normalizedNom)) {
            politician = { id: p.id }
            break
          }
        }
      }
    }

    if (politician) {
      // Store the acteurRef mapping for future lookups
      const { data: current } = await getDb()
        .from('politicians')
        .select('metadata')
        .eq('id', politician.id)
        .single()

      const updatedMetadata = {
        ...(current?.metadata || {}),
        acteurRef
      }

      await getDb()
        .from('politicians')
        .update({ metadata: updatedMetadata })
        .eq('id', politician.id)

      this.acteurCache.set(acteurRef, politician.id)
      return politician.id
    }

    // Log unmatched for debugging (only first few)
    if (this.unmatchedLogCount < 10) {
      console.log(`   ⚠️ No match for: ${prenom} ${nom} (${acteurRef})`)
      this.unmatchedLogCount++
    }

    this.acteurCache.set(acteurRef, null)
    return null
  }

  private unmatchedLogCount = 0

  // ==========================================================================
  // Scrutins (Votes)
  // ==========================================================================

  /**
   * Extract vote positions from scrutin data
   */
  private extractVotePositions(scrutin: any): VotePosition[] {
    const positions: VotePosition[] = []

    const groupes = scrutin?.ventilationVotes?.organe?.groupes?.groupe || []
    const groupeArray = Array.isArray(groupes) ? groupes : [groupes]

    for (const groupe of groupeArray) {
      if (!groupe?.vote?.decompteNominatif) continue

      const decompte = groupe.vote.decompteNominatif

      // Pour
      if (decompte.pours?.votant) {
        const votants = Array.isArray(decompte.pours.votant)
          ? decompte.pours.votant
          : [decompte.pours.votant]

        for (const v of votants) {
          if (v?.acteurRef) {
            positions.push({ acteurRef: v.acteurRef, position: 'pour' })
          }
        }
      }

      // Contre
      if (decompte.contres?.votant) {
        const votants = Array.isArray(decompte.contres.votant)
          ? decompte.contres.votant
          : [decompte.contres.votant]

        for (const v of votants) {
          if (v?.acteurRef) {
            positions.push({ acteurRef: v.acteurRef, position: 'contre' })
          }
        }
      }

      // Abstentions
      if (decompte.abstentions?.votant) {
        const votants = Array.isArray(decompte.abstentions.votant)
          ? decompte.abstentions.votant
          : [decompte.abstentions.votant]

        for (const v of votants) {
          if (v?.acteurRef) {
            positions.push({ acteurRef: v.acteurRef, position: 'abstention' })
          }
        }
      }

      // Non votants
      if (decompte.nonVotants?.votant) {
        const votants = Array.isArray(decompte.nonVotants.votant)
          ? decompte.nonVotants.votant
          : [decompte.nonVotants.votant]

        for (const v of votants) {
          if (v?.acteurRef) {
            positions.push({ acteurRef: v.acteurRef, position: 'nonVotant' })
          }
        }
      }
    }

    return positions
  }

  /**
   * Store a single scrutin's votes in database
   */
  private async storeScrutinVotes(scrutinData: any): Promise<number> {
    const scrutin = scrutinData.scrutin || scrutinData

    const numero = scrutin.numero
    const dateScrutin = scrutin.dateScrutin
    const titre = scrutin.titre || scrutin.objet?.libelle || ''

    if (!numero || !dateScrutin) return 0

    const positions = this.extractVotePositions(scrutin)
    let stored = 0

    for (const pos of positions) {
      const politicianId = await this.mapActeurToPolitician(pos.acteurRef)
      if (!politicianId) continue

      try {
        await getDb()
          .from('parliamentary_actions')
          .upsert({
            politician_id: politicianId,
            action_type: 'vote',
            action_date: new Date(dateScrutin).toISOString(),
            description: titre.substring(0, 500), // Truncate long titles
            vote_position: pos.position,
            bill_id: `L${this.legislature}-${numero}`,
            official_reference: `https://www.assemblee-nationale.fr/dyn/${this.legislature}/scrutins/${String(numero).padStart(4, '0')}`,
            category: this.categorize(titre),
            metadata: {
              source: 'data.assemblee-nationale.fr',
              legislature: this.legislature,
              scrutinUid: scrutin.uid || `VTANR5L${this.legislature}V${numero}`
            }
          }, {
            onConflict: 'politician_id,action_type,bill_id'
          })

        stored++
      } catch (e) {
        // Ignore duplicate errors
      }
    }

    return stored
  }

  // ==========================================================================
  // Full Collection
  // ==========================================================================

  /**
   * Collect all scrutins data from static repository
   */
  async collectAllData(options?: { limit?: number }): Promise<{
    scrutins: number
    votes: number
    deputies: number
    errors: number
  }> {
    console.log('🏛️ Starting Assemblée Nationale Open Data collection...')
    console.log(`   Using legislature: ${this.legislature}`)

    const stats = { scrutins: 0, votes: 0, deputies: 0, errors: 0 }

    // First, load deputies cache
    try {
      stats.deputies = await this.loadDeputiesCache()
    } catch (error) {
      console.error('Failed to load deputies cache:', error)
      stats.errors++
    }

    // Now collect scrutins
    let tempDir: string | null = null

    try {
      tempDir = await this.downloadAndExtractZip(this.scrutinsUrl, 'scrutins')

      const jsonDir = join(tempDir, 'json')

      if (!existsSync(jsonDir)) {
        console.error('No json directory found in scrutins zip')
        return stats
      }

      const files = readdirSync(jsonDir).filter(f => f.endsWith('.json'))
      const limit = options?.limit || files.length
      const toProcess = files.slice(0, limit)

      console.log(`📊 Processing ${toProcess.length} scrutins (out of ${files.length} total)...`)

      let processed = 0
      for (const file of toProcess) {
        try {
          const filePath = join(jsonDir, file)
          const content = readFileSync(filePath, 'utf-8')
          const data = JSON.parse(content)

          const votesStored = await this.storeScrutinVotes(data)
          stats.votes += votesStored
          stats.scrutins++
          processed++

          if (processed % 100 === 0) {
            console.log(`   Progress: ${processed}/${toProcess.length} scrutins, ${stats.votes} votes stored`)
          }

          // Small delay to avoid overwhelming the database
          if (processed % 50 === 0) {
            await this.delay(this.rateLimitMs)
          }
        } catch (e) {
          stats.errors++
        }
      }

    } catch (error) {
      console.error('Error collecting scrutins:', error)
      stats.errors++
    } finally {
      if (tempDir) this.cleanup(tempDir)
    }

    console.log(`\n📊 AN Open Data collection complete:`)
    console.log(`   Deputies in cache: ${stats.deputies}`)
    console.log(`   Scrutins processed: ${stats.scrutins}`)
    console.log(`   Votes stored: ${stats.votes}`)
    console.log(`   Errors: ${stats.errors}`)

    return stats
  }

  // ==========================================================================
  // Categorization
  // ==========================================================================

  private categorize(text: string): string {
    const lower = (text || '').toLowerCase()
    if (lower.includes('budget') || lower.includes('financ') || lower.includes('fiscal')) return 'economic'
    if (lower.includes('santé') || lower.includes('hôpital') || lower.includes('médic')) return 'healthcare'
    if (lower.includes('écolog') || lower.includes('environnement') || lower.includes('climat')) return 'environmental'
    if (lower.includes('sécurité') || lower.includes('police') || lower.includes('défense')) return 'security'
    if (lower.includes('éducation') || lower.includes('école') || lower.includes('université')) return 'education'
    if (lower.includes('social') || lower.includes('retraite') || lower.includes('emploi')) return 'social'
    if (lower.includes('justice') || lower.includes('pénal')) return 'justice'
    if (lower.includes('immigration') || lower.includes('étranger')) return 'immigration'
    if (lower.includes('international') || lower.includes('europe')) return 'foreign_policy'
    return 'other'
  }
}

// Export singleton instance
export const assembleeOpendataClient = new AssembleeOpendataClient()
