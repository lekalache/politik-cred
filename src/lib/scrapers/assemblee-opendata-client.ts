/**
 * Assemblée Nationale Official Open Data Client
 * Fetches data from data.assemblee-nationale.fr
 *
 * This provides official government data including:
 * - Votes/Scrutins: Voting positions of deputies
 * - Amendments: All amendments with authors and outcomes
 * - Questions: Written questions to ministers
 *
 * Data Source: https://data.assemblee-nationale.fr/
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

interface ScrutinPublic {
  numero: string
  organeRef: string
  legislature: string
  sessionRef: string
  seanceRef: string
  dateScrutin: string
  titre: string
  sort: {
    code: string
    libelle: string
  }
  syntheseVote: {
    nombreVotants: string
    suffragesExprimes: string
    nlesNonVotantsVolontaires?: string
    decompte: {
      pour: string
      contre: string
      abstentions: string
      nonVotants: string
    }
  }
}

interface VotePosition {
  acteurRef: string
  position: 'pour' | 'contre' | 'abstention' | 'nonVotant'
}

interface Amendement {
  uid: string
  identifiant: {
    numero: string
    numeroOrdreDepot: number
    legislature: string
    prefixeOrganeExamen: string
  }
  corps: {
    contenuAuteur: {
      dispositif: string
      exposeSommaire: string
    }
  }
  cycleDeVie: {
    dateDepot: string
    dateSort?: string
    sort?: {
      code: string
      libelle: string
    }
  }
  signataires: {
    acteurRef: string[]
  }
  texteLegislatifRef: string
}

interface QuestionEcrite {
  uid: string
  identifiant: {
    numero: string
    legislature: string
    type: string
  }
  indexationAN: {
    rubrique: string
    analyses: {
      analyse: string[]
    }
  }
  textesQuestion: {
    texteQuestion: string
  }
  textesReponse?: {
    texteReponse: string
  }
  minAttrib: {
    intituleMinistere: string
  }
  datePublication: string
  dateReponseSignalee?: string
}

// ============================================================================
// Main Client Class
// ============================================================================

class AssembleeOpendataClient {
  private baseUrl = 'https://data.assemblee-nationale.fr'
  private legislature = '16' // 16th legislature (17th not yet populated)
  private rateLimitMs = 300

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      await this.delay(this.rateLimitMs)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PolitikCred/1.0 (https://politikcred.fr)',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        console.error(`API error ${response.status}: ${url}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error)
      return null
    }
  }

  // ==========================================================================
  // Scrutins (Votes)
  // ==========================================================================

  /**
   * Get list of all scrutins for the legislature
   * Uses the publicly available JSON API
   */
  async getScrutinsList(): Promise<any[]> {
    console.log('🗳️ Fetching scrutins from data.assemblee-nationale.fr...')

    // The official portal provides JSON exports
    const url = `${this.baseUrl}/travaux-parlementaires/votes/scrutins-${this.legislature}.json`

    const data = await this.fetchJson<{ scrutins: any[] }>(url)

    if (data?.scrutins) {
      console.log(`✅ Found ${data.scrutins.length} scrutins`)
      return data.scrutins
    }

    // Fallback: try alternative URL structure
    const altUrl = `${this.baseUrl}/api/v2/scrutins/legislature/${this.legislature}`
    const altData = await this.fetchJson<any[]>(altUrl)

    if (Array.isArray(altData)) {
      console.log(`✅ Found ${altData.length} scrutins (alt)`)
      return altData
    }

    return []
  }

  /**
   * Get detailed info for a specific scrutin
   */
  async getScrutinDetails(numero: string): Promise<any | null> {
    const url = `${this.baseUrl}/travaux-parlementaires/votes/scrutin-${this.legislature}-${numero}.json`
    return await this.fetchJson(url)
  }

  /**
   * Get vote positions for a scrutin
   */
  async getScrutinVotes(numero: string): Promise<VotePosition[]> {
    console.log(`🗳️ Fetching vote positions for scrutin ${numero}...`)

    const details = await this.getScrutinDetails(numero)

    if (!details) return []

    const positions: VotePosition[] = []

    // Parse vote positions from scrutin data
    const groupes = details?.scrutin?.ventilationVotes?.organe?.groupes?.groupe || []

    for (const groupe of groupes) {
      const decompteVoix = groupe.vote?.decompteVoix

      // Pour
      if (decompteVoix?.pours?.votant) {
        const votants = Array.isArray(decompteVoix.pours.votant)
          ? decompteVoix.pours.votant
          : [decompteVoix.pours.votant]

        for (const v of votants) {
          positions.push({
            acteurRef: v.acteurRef,
            position: 'pour'
          })
        }
      }

      // Contre
      if (decompteVoix?.contres?.votant) {
        const votants = Array.isArray(decompteVoix.contres.votant)
          ? decompteVoix.contres.votant
          : [decompteVoix.contres.votant]

        for (const v of votants) {
          positions.push({
            acteurRef: v.acteurRef,
            position: 'contre'
          })
        }
      }

      // Abstentions
      if (decompteVoix?.abstentions?.votant) {
        const votants = Array.isArray(decompteVoix.abstentions.votant)
          ? decompteVoix.abstentions.votant
          : [decompteVoix.abstentions.votant]

        for (const v of votants) {
          positions.push({
            acteurRef: v.acteurRef,
            position: 'abstention'
          })
        }
      }
    }

    console.log(`✅ Found ${positions.length} vote positions`)
    return positions
  }

  // ==========================================================================
  // Amendments
  // ==========================================================================

  /**
   * Get amendments list
   */
  async getAmendementsList(dossierRef?: string): Promise<any[]> {
    console.log('📝 Fetching amendments from data.assemblee-nationale.fr...')

    // The amendments are organized by legislative dossier
    const url = dossierRef
      ? `${this.baseUrl}/travaux-parlementaires/amendements/${dossierRef}.json`
      : `${this.baseUrl}/travaux-parlementaires/amendements/liste-${this.legislature}.json`

    const data = await this.fetchJson<{ amendements: any[] }>(url)

    if (data?.amendements) {
      console.log(`✅ Found ${data.amendements.length} amendments`)
      return data.amendements
    }

    return []
  }

  // ==========================================================================
  // Questions Écrites
  // ==========================================================================

  /**
   * Get written questions
   */
  async getQuestionsEcrites(limit?: number): Promise<any[]> {
    console.log('❓ Fetching written questions...')

    const url = `${this.baseUrl}/questions/questions_ecrites/questions-${this.legislature}.json`

    const data = await this.fetchJson<{ questions: any[] }>(url)

    if (data?.questions) {
      const questions = limit ? data.questions.slice(0, limit) : data.questions
      console.log(`✅ Found ${questions.length} questions`)
      return questions
    }

    return []
  }

  // ==========================================================================
  // Actors (Deputies)
  // ==========================================================================

  /**
   * Get deputy reference data by acteurRef
   */
  async getActeur(acteurRef: string): Promise<any | null> {
    const url = `${this.baseUrl}/acteurs/${acteurRef}.json`
    return await this.fetchJson(url)
  }

  /**
   * Map acteurRef to politician in database
   */
  async mapActeurToPolitician(acteurRef: string): Promise<string | null> {
    // First check if we already have this mapping
    const { data: existing } = await supabase
      .from('politicians')
      .select('id')
      .contains('metadata', { acteurRef })
      .single()

    if (existing) return existing.id

    // Try to fetch actor details and match by name
    const acteur = await this.getActeur(acteurRef)
    if (!acteur?.acteur?.etatCivil) return null

    const nom = acteur.acteur.etatCivil.ident?.nom
    const prenom = acteur.acteur.etatCivil.ident?.prenom

    if (!nom) return null

    // Find by name match
    const { data: politician } = await supabase
      .from('politicians')
      .select('id')
      .ilike('last_name', `%${nom}%`)
      .ilike('first_name', `%${prenom}%`)
      .single()

    if (politician) {
      // Store the acteurRef mapping - fetch current metadata first
      const { data: current } = await supabase
        .from('politicians')
        .select('metadata')
        .eq('id', politician.id)
        .single()

      const updatedMetadata = {
        ...(current?.metadata || {}),
        acteurRef
      }

      await supabase
        .from('politicians')
        .update({ metadata: updatedMetadata })
        .eq('id', politician.id)

      return politician.id
    }

    return null
  }

  // ==========================================================================
  // Database Storage
  // ==========================================================================

  /**
   * Store scrutin votes in database
   */
  async storeScrutinVotes(scrutin: any): Promise<number> {
    let stored = 0
    const numero = scrutin.numero || scrutin.scrutin?.numero

    if (!numero) return 0

    const positions = await this.getScrutinVotes(numero)

    for (const pos of positions) {
      const politicianId = await this.mapActeurToPolitician(pos.acteurRef)
      if (!politicianId) continue

      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: politicianId,
          action_type: 'vote',
          action_date: new Date(scrutin.dateScrutin || scrutin.scrutin?.dateScrutin).toISOString(),
          description: scrutin.titre || scrutin.scrutin?.titre || '',
          vote_position: pos.position,
          bill_id: numero,
          official_reference: `${this.baseUrl}/scrutin/${numero}`,
          category: this.categorize(scrutin.titre || scrutin.scrutin?.titre || ''),
          metadata: {
            source: 'data.assemblee-nationale.fr',
            legislature: this.legislature
          }
        }, {
          onConflict: 'politician_id,action_type,bill_id'
        })

      stored++
    }

    return stored
  }

  /**
   * Store amendment in database
   */
  async storeAmendment(amendement: any, authorPoliticianId: string): Promise<boolean> {
    try {
      const identifiant = amendement.uid || amendement.identifiant
      const depot = amendement.cycleDeVie?.dateDepot || amendement.dateDepot

      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: authorPoliticianId,
          action_type: 'amendment',
          action_date: new Date(depot).toISOString(),
          description: amendement.corps?.contenuAuteur?.exposeSommaire || `Amendement ${identifiant}`,
          official_reference: `${this.baseUrl}/amendement/${identifiant}`,
          category: this.categorize(amendement.corps?.contenuAuteur?.exposeSommaire || ''),
          metadata: {
            source: 'data.assemblee-nationale.fr',
            sort: amendement.cycleDeVie?.sort?.libelle,
            dispositif: amendement.corps?.contenuAuteur?.dispositif
          }
        }, {
          onConflict: 'politician_id,action_type,official_reference'
        })

      return true
    } catch (error) {
      console.error('Error storing amendment:', error)
      return false
    }
  }

  // ==========================================================================
  // Full Collection
  // ==========================================================================

  /**
   * Collect all available data
   */
  async collectAllData(options?: { limit?: number }): Promise<{
    scrutins: number
    votes: number
    amendments: number
    questions: number
    errors: number
  }> {
    console.log('🏛️ Starting Assemblée Nationale Open Data collection...')

    const stats = { scrutins: 0, votes: 0, amendments: 0, questions: 0, errors: 0 }

    // Collect scrutins and votes
    try {
      const scrutins = await this.getScrutinsList()
      const limit = options?.limit || scrutins.length

      for (const scrutin of scrutins.slice(0, limit)) {
        try {
          const votesStored = await this.storeScrutinVotes(scrutin)
          stats.votes += votesStored
          stats.scrutins++
          console.log(`✅ Scrutin ${scrutin.numero}: ${votesStored} votes stored`)
        } catch (error) {
          stats.errors++
        }
      }
    } catch (error) {
      console.error('Error collecting scrutins:', error)
      stats.errors++
    }

    console.log(`\n📊 AN Open Data collection complete:`)
    console.log(`   Scrutins processed: ${stats.scrutins}`)
    console.log(`   Votes stored: ${stats.votes}`)
    console.log(`   Amendments: ${stats.amendments}`)
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
