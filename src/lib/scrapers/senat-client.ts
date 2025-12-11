/**
 * Sénat (French Senate) API Client
 * Complete integration with NosSénateurs.fr API and data.senat.fr
 *
 * NosSénateurs.fr API: Same structure as NosDéputés.fr
 * - https://www.nossenateurs.fr/
 *
 * data.senat.fr: Official open data
 * - Amendments, Questions, Session transcripts
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

interface SenatorInfo {
  id: string
  slug: string
  nom: string
  nom_de_famille: string
  prenom: string
  sexe: string
  date_naissance: string
  lieu_naissance: string
  parti_ratt_financier: string
  groupe_sigle: string
  groupe: { organisme: string; fonction?: string }
  circonscription: string
  departement: string
  mandat_debut: string
  mandat_fin?: string
  ancien_senateur: number
  emails: string[]
  url_institution: string
  url_nossenateurs: string
  profession?: string
  twitter?: string
}

interface Vote {
  scrutin: {
    numero: string | number
    titre: string
    date: string
    sort: string
    lien: string
  }
  position: 'pour' | 'contre' | 'abstention' | 'absent'
}

interface SynthesisData {
  senateur: {
    slug: string
    nom: string
    groupe_sigle: string
    // Activity metrics
    commission_presences: number
    commission_presences_medi: number
    hemicycle_presences: number
    hemicycle_presences_medi: number
    hemicycle_interventions: number
    hemicycle_interventions_medi: number
    amendements_proposes: number
    amendements_adoptes: number
    questions_ecrites: number
    questions_orales: number
    rapports: number
    propositions_ecrites: number
  }
}

interface Question {
  id: string
  date: string
  type: 'orale' | 'ecrite'
  titre: string
  ministere: string
  reponse?: string
  date_reponse?: string
  lien: string
}

interface Amendment {
  numero: string
  texte_loi: string
  sort: string
  date: string
  sujet: string
  signataires: string[]
  lien: string
}

// ============================================================================
// Main Client Class
// ============================================================================

class SenatClient {
  private baseUrl = 'https://www.nossenateurs.fr'
  private officialDataUrl = 'https://data.senat.fr'
  private rateLimitMs = 500

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
  // Senators Endpoints
  // ==========================================================================

  /**
   * Get all current senators
   */
  async getAllSenators(): Promise<SenatorInfo[]> {
    console.log('📋 Fetching senators from NosSénateurs.fr...')

    // Strategy 1: Try current mandate endpoint
    const currentData = await this.fetchJson<{ senateurs: { senateur: SenatorInfo }[] }>(
      `${this.baseUrl}/senateurs/enmandat/json`
    )

    if (currentData && currentData.senateurs && currentData.senateurs.length > 0) {
      const senators = currentData.senateurs.map(s => s.senateur)
      console.log(`✅ Found ${senators.length} current senators`)
      return senators
    }

    console.log('⚠️ No current senators found, trying all senators endpoint...')

    // Strategy 2: Fallback to all senators
    const allData = await this.fetchJson<{ senateurs: { senateur: SenatorInfo }[] }>(
      `${this.baseUrl}/senateurs/json`
    )

    if (allData && allData.senateurs && allData.senateurs.length > 0) {
      const now = new Date()
      const senators = allData.senateurs
        .map(s => s.senateur)
        .filter(s => {
          if (!s.mandat_debut) return false
          const start = new Date(s.mandat_debut)
          const end = s.mandat_fin ? new Date(s.mandat_fin) : null
          return start <= now && (!end || end >= now)
        })

      console.log(`✅ Found ${senators.length} active senators from full list`)
      return senators
    }

    console.log('❌ No senators found')
    return []
  }

  /**
   * Get detailed info for a specific senator
   */
  async getSenatorDetails(slug: string): Promise<SenatorInfo | null> {
    const data = await this.fetchJson<{ senateur: SenatorInfo }>(
      `${this.baseUrl}/${slug}/json`
    )
    return data?.senateur || null
  }

  // ==========================================================================
  // Votes Endpoints
  // ==========================================================================

  /**
   * Get all votes for a specific senator
   */
  async getSenatorVotes(slug: string): Promise<Vote[]> {
    console.log(`🗳️ Fetching votes for senator ${slug}...`)

    const data = await this.fetchJson<{ votes: Vote[] }>(
      `${this.baseUrl}/${slug}/votes/json`
    )

    if (data?.votes) {
      console.log(`✅ Found ${data.votes.length} votes for ${slug}`)
      return data.votes
    }

    // Fallback to details
    const details = await this.getSenatorDetails(slug) as any
    if (details?.votes) {
      return details.votes
    }

    return []
  }

  /**
   * Get all scrutins (votes) from the Senate
   */
  async getAllScrutins(): Promise<any[]> {
    console.log('🗳️ Fetching all Senate scrutins...')

    const data = await this.fetchJson<{ scrutins: { scrutin: any }[] }>(
      `${this.baseUrl}/scrutins/json`
    )

    if (data?.scrutins) {
      const scrutins = data.scrutins.map(s => s.scrutin)
      console.log(`✅ Found ${scrutins.length} Senate scrutins`)
      return scrutins
    }

    return []
  }

  // ==========================================================================
  // Activity Synthesis
  // ==========================================================================

  /**
   * Get 12-month activity synthesis for all senators
   */
  async getActivitySynthesis(): Promise<SynthesisData[]> {
    console.log('📊 Fetching senator activity synthesis...')

    const data = await this.fetchJson<{ senateurs: { senateur: SynthesisData['senateur'] }[] }>(
      `${this.baseUrl}/synthese/data/json`
    )

    if (data?.senateurs) {
      const synthesis = data.senateurs.map(s => ({ senateur: s.senateur }))
      console.log(`✅ Found synthesis for ${synthesis.length} senators`)
      return synthesis
    }

    return []
  }

  // ==========================================================================
  // Questions
  // ==========================================================================

  /**
   * Get questions for a senator
   */
  async getSenatorQuestions(slug: string): Promise<Question[]> {
    console.log(`❓ Fetching questions for senator ${slug}...`)

    const details = await this.getSenatorDetails(slug) as any
    const questions: Question[] = []

    if (details?.questions_orales) {
      for (const q of details.questions_orales) {
        questions.push({
          id: q.id || '',
          date: q.date || '',
          type: 'orale',
          titre: q.titre || q.question || '',
          ministere: q.ministere || '',
          lien: q.lien || ''
        })
      }
    }

    if (details?.questions_ecrites) {
      for (const q of details.questions_ecrites) {
        questions.push({
          id: q.id || '',
          date: q.date || '',
          type: 'ecrite',
          titre: q.titre || q.question || '',
          ministere: q.ministere || '',
          reponse: q.reponse,
          date_reponse: q.date_reponse,
          lien: q.lien || ''
        })
      }
    }

    console.log(`✅ Found ${questions.length} questions for ${slug}`)
    return questions
  }

  // ==========================================================================
  // Amendments
  // ==========================================================================

  /**
   * Get amendments proposed by a senator
   */
  async getSenatorAmendments(slug: string): Promise<Amendment[]> {
    console.log(`📝 Fetching amendments for senator ${slug}...`)

    const details = await this.getSenatorDetails(slug) as any
    const amendments: Amendment[] = []

    if (details?.amendements) {
      for (const a of details.amendements) {
        amendments.push({
          numero: a.numero || '',
          texte_loi: a.texte_loi || '',
          sort: a.sort || '',
          date: a.date || '',
          sujet: a.sujet || '',
          signataires: a.signataires || [],
          lien: a.lien || ''
        })
      }
    }

    console.log(`✅ Found ${amendments.length} amendments for ${slug}`)
    return amendments
  }

  // ==========================================================================
  // Database Storage
  // ==========================================================================

  /**
   * Store senator in database
   */
  async storeSenatorInDatabase(senator: SenatorInfo): Promise<string> {
    const { data: existing } = await supabase
      .from('politicians')
      .select('id')
      .eq('external_id', senator.slug)
      .eq('source_system', 'nossenateurs')
      .single()

    const politicianData = {
      name: senator.nom,
      first_name: senator.prenom || null,
      last_name: senator.nom_de_famille || null,
      party: senator.parti_ratt_financier || senator.groupe_sigle || null,
      position: 'Sénateur',
      constituency: senator.departement || senator.circonscription || null,
      gender: senator.sexe === 'H' ? 'male' : senator.sexe === 'F' ? 'female' : null,
      birth_date: senator.date_naissance || null,
      social_media: {
        website: senator.url_institution || senator.url_nossenateurs || null,
        twitter: senator.twitter || null
      },
      contact_info: {
        email: senator.emails?.[0] || null
      },
      external_id: senator.slug,
      source_system: 'nossenateurs',
      is_active: !senator.mandat_fin,
      metadata: {
        groupe: senator.groupe,
        profession: senator.profession,
        mandat_debut: senator.mandat_debut,
        mandat_fin: senator.mandat_fin
      }
    }

    if (existing) {
      await supabase
        .from('politicians')
        .update(politicianData)
        .eq('id', existing.id)
      return existing.id
    } else {
      const { data: inserted, error } = await supabase
        .from('politicians')
        .insert(politicianData)
        .select('id')
        .single()

      if (error) throw error
      return inserted.id
    }
  }

  /**
   * Store parliamentary actions for a senator
   */
  async storeParliamentaryActions(
    politicianId: string,
    slug: string
  ): Promise<{ votes: number; questions: number; amendments: number }> {
    const stats = { votes: 0, questions: 0, amendments: 0 }

    // Store votes
    const votes = await this.getSenatorVotes(slug)
    for (const vote of votes) {
      const scrutin = vote.scrutin || (vote as any)
      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: politicianId,
          action_type: 'vote',
          action_date: new Date(scrutin.date).toISOString(),
          description: scrutin.titre || '',
          vote_position: vote.position,
          bill_id: String(scrutin.numero || ''),
          official_reference: scrutin.lien || '',
          category: this.categorize(scrutin.titre || ''),
          metadata: { sort: scrutin.sort, chamber: 'senat' }
        }, {
          onConflict: 'politician_id,action_type,bill_id'
        })
      stats.votes++
    }

    // Store questions
    const questions = await this.getSenatorQuestions(slug)
    for (const q of questions) {
      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: politicianId,
          action_type: 'question',
          action_date: new Date(q.date).toISOString(),
          description: q.titre,
          official_reference: q.lien,
          category: this.categorize(q.titre + ' ' + q.ministere),
          metadata: {
            type: q.type,
            ministere: q.ministere,
            reponse: q.reponse,
            date_reponse: q.date_reponse,
            chamber: 'senat'
          }
        }, {
          onConflict: 'politician_id,action_type,official_reference'
        })
      stats.questions++
    }

    // Store amendments
    const amendments = await this.getSenatorAmendments(slug)
    for (const a of amendments) {
      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: politicianId,
          action_type: 'amendment',
          action_date: new Date(a.date).toISOString(),
          description: a.sujet || `Amendement ${a.numero}`,
          bill_id: a.texte_loi,
          official_reference: a.lien,
          category: this.categorize(a.sujet),
          metadata: {
            numero: a.numero,
            sort: a.sort,
            signataires: a.signataires,
            chamber: 'senat'
          }
        }, {
          onConflict: 'politician_id,action_type,official_reference'
        })
      stats.amendments++
    }

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

  // ==========================================================================
  // Full Collection
  // ==========================================================================

  /**
   * Collect all senator data
   */
  async collectAllData(options?: { limit?: number }): Promise<{
    senators: number
    votes: number
    questions: number
    amendments: number
    errors: number
  }> {
    console.log('🏛️ Starting Senate data collection...')

    const stats = { senators: 0, votes: 0, questions: 0, amendments: 0, errors: 0 }
    const senators = await this.getAllSenators()

    const limit = options?.limit || senators.length
    const toProcess = senators.slice(0, limit)

    console.log(`👥 Processing ${toProcess.length} senators...`)

    for (const senator of toProcess) {
      try {
        const politicianId = await this.storeSenatorInDatabase(senator)
        stats.senators++

        const actionStats = await this.storeParliamentaryActions(politicianId, senator.slug)
        stats.votes += actionStats.votes
        stats.questions += actionStats.questions
        stats.amendments += actionStats.amendments

        console.log(`✅ ${senator.nom}: ${actionStats.votes}v, ${actionStats.questions}q, ${actionStats.amendments}a`)
      } catch (error) {
        console.error(`❌ Error processing ${senator.nom}:`, error)
        stats.errors++
      }
    }

    console.log(`\n📊 Senate collection complete:`)
    console.log(`   Senators: ${stats.senators}`)
    console.log(`   Votes: ${stats.votes}`)
    console.log(`   Questions: ${stats.questions}`)
    console.log(`   Amendments: ${stats.amendments}`)
    console.log(`   Errors: ${stats.errors}`)

    return stats
  }
}

// Export singleton instance
export const senatClient = new SenatClient()
