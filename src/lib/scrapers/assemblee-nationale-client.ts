/**
 * Assemblée Nationale API Client
 * Complete integration with NosDéputés.fr API
 *
 * API Documentation: https://github.com/regardscitoyens/nosdeputes.fr/blob/master/doc/api.md
 *
 * Endpoints used:
 * - /deputes/enmandat/json - Current deputies
 * - /deputes/json - All deputies (fallback)
 * - /{slug}/json - Deputy details
 * - /{slug}/votes/json - Deputy's votes (direct endpoint)
 * - /synthese/data/json - 12-month activity synthesis
 * - /synthese/{YYYYMM}/json - Monthly synthesis
 * - /17/scrutins/json - All scrutins for legislature 17
 * - /recherche/{query} - Search endpoint
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

interface DeputyInfo {
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
  num_circo: number
  num_deptmt: string
  nom_circo: string
  mandat_debut: string
  mandat_fin?: string
  ancien_depute: number
  emails: string[]
  adresses: any[]
  collaborateurs: any[]
  url_an: string
  url_nosdeputes: string
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
  depute: {
    slug: string
    nom: string
    groupe_sigle: string
    // Activity metrics
    sempieces_presences: number
    sempieces_presences_medi: number
    commission_presences: number
    commission_presences_medi: number
    hemicycle_presences: number
    hemicycle_presences_medi: number
    hemicycle_interventions: number
    hemicycle_interventions_medi: number
    amendements_proposes: number
    amendements_proposes_medi: number
    amendements_adoptes: number
    rapports: number
    propositions_ecrites: number
    propositions_signees: number
    questions_ecrites: number
    questions_orales: number
  }
}

interface Scrutin {
  numero: number
  titre: string
  date: string
  type: string
  sort: string
  nombre_votants: number
  pour: number
  contre: number
  abstentions: number
  lien: string
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

class AssembleeNationaleClient {
  private baseUrl = 'https://www.nosdeputes.fr'
  // Use 16th legislature as it has complete data (17th not yet populated)
  private legislature = '16'
  private previousLegislatures = ['15', '14', '13']
  private rateLimitMs = 300 // 300ms between requests for faster collection

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
  // Deputies Endpoints
  // ==========================================================================

  /**
   * Get all deputies from 16th legislature (most complete data available)
   */
  async getAllDeputies(): Promise<DeputyInfo[]> {
    console.log('📋 Fetching deputies from NosDéputés.fr...')

    // Strategy 1: Use synthesis data which has all 16th legislature deputies
    const synthesisData = await this.fetchJson<{ deputes: { depute: any }[] }>(
      `${this.baseUrl}/synthese/data/json`
    )

    if (synthesisData && synthesisData.deputes && synthesisData.deputes.length > 0) {
      const deputies = synthesisData.deputes.map(d => {
        const dep = d.depute
        return {
          id: dep.id,
          slug: dep.slug,
          nom: dep.nom,
          nom_de_famille: dep.nom_de_famille,
          prenom: dep.prenom,
          sexe: dep.sexe,
          date_naissance: dep.date_naissance,
          lieu_naissance: dep.lieu_naissance,
          parti_ratt_financier: dep.parti_ratt_financier,
          groupe_sigle: dep.groupe_sigle,
          groupe: { organisme: dep.groupe_sigle },
          circonscription: dep.nom_circo,
          num_circo: dep.num_circo,
          num_deptmt: dep.num_deptmt,
          nom_circo: dep.nom_circo,
          mandat_debut: dep.mandat_debut,
          mandat_fin: dep.mandat_fin,
          ancien_depute: dep.ancien_depute,
          emails: dep.emails?.map((e: any) => e.email) || [],
          adresses: [],
          collaborateurs: [],
          url_an: dep.url_an,
          url_nosdeputes: dep.url_nosdeputes,
          profession: dep.profession,
          twitter: dep.twitter
        } as DeputyInfo
      })
      console.log(`✅ Found ${deputies.length} deputies from synthesis data (16th legislature)`)
      return deputies
    }

    console.log('⚠️ No synthesis data, trying all deputies endpoint...')

    // Strategy 2: Fallback to all deputies
    const allData = await this.fetchJson<{ deputes: { depute: DeputyInfo }[] }>(
      `${this.baseUrl}/deputes/json`
    )

    if (allData && allData.deputes && allData.deputes.length > 0) {
      const deputies = allData.deputes.map(d => d.depute)
      console.log(`✅ Found ${deputies.length} deputies from full list`)
      return deputies
    }

    console.log('❌ No deputies found from any endpoint')
    return []
  }

  /**
   * Get detailed info for a specific deputy
   */
  async getDeputyDetails(slug: string): Promise<DeputyInfo | null> {
    const data = await this.fetchJson<{ depute: DeputyInfo }>(
      `${this.baseUrl}/${slug}/json`
    )
    return data?.depute || null
  }

  // ==========================================================================
  // Votes/Scrutins Endpoints
  // ==========================================================================

  /**
   * Get all votes for a specific deputy using legislature prefix
   */
  async getDeputyVotes(slug: string): Promise<Vote[]> {
    console.log(`🗳️ Fetching votes for ${slug}...`)

    // Try with legislature prefix first (this is the working approach)
    const data = await this.fetchJson<{ votes: { vote: any }[] }>(
      `${this.baseUrl}/${this.legislature}/${slug}/votes/json`
    )

    if (data?.votes && data.votes.length > 0) {
      const votes = data.votes.map(v => {
        const vote = v.vote || v
        return {
          scrutin: vote.scrutin || {
            numero: vote.numero,
            titre: vote.titre,
            date: vote.date,
            sort: vote.sort,
            lien: vote.lien || vote.url_nosdeputes
          },
          position: vote.position as Vote['position']
        }
      })
      console.log(`✅ Found ${votes.length} votes for ${slug}`)
      return votes
    }

    // Fallback: try without legislature prefix
    const fallbackData = await this.fetchJson<{ votes: Vote[] }>(
      `${this.baseUrl}/${slug}/votes/json`
    )

    if (fallbackData?.votes && fallbackData.votes.length > 0) {
      console.log(`✅ Found ${fallbackData.votes.length} votes for ${slug} (fallback)`)
      return fallbackData.votes
    }

    console.log(`⚠️ No votes found for ${slug}`)
    return []
  }

  /**
   * Get votes from a specific scrutin (fetches all vote positions)
   */
  async getScrutinVotes(scrutinNumero: number): Promise<Array<{
    slug: string
    position: Vote['position']
    groupe: string
    scrutin: any
  }>> {
    const data = await this.fetchJson<{ votes: { vote: any }[] }>(
      `${this.baseUrl}/${this.legislature}/scrutin/${scrutinNumero}/json`
    )

    if (!data?.votes) return []

    return data.votes.map(v => {
      const vote = v.vote || v
      return {
        slug: vote.parlementaire_slug,
        position: vote.position as Vote['position'],
        groupe: vote.parlementaire_groupe_acronyme,
        scrutin: vote.scrutin
      }
    })
  }

  /**
   * Collect votes from all scrutins for a batch of deputies (more efficient)
   */
  async collectVotesFromScrutins(
    deputySlugs: Set<string>,
    limit?: number
  ): Promise<Map<string, Vote[]>> {
    console.log('🗳️ Collecting votes from scrutins...')

    const votesByDeputy = new Map<string, Vote[]>()
    deputySlugs.forEach(slug => votesByDeputy.set(slug, []))

    // Get all scrutins
    const scrutins = await this.getAllScrutins()
    const toProcess = limit ? scrutins.slice(0, limit) : scrutins

    console.log(`📊 Processing ${toProcess.length} scrutins...`)

    for (let i = 0; i < toProcess.length; i++) {
      const scrutin = toProcess[i]
      const scrutinVotes = await this.getScrutinVotes(scrutin.numero)

      for (const sv of scrutinVotes) {
        if (deputySlugs.has(sv.slug)) {
          const existing = votesByDeputy.get(sv.slug) || []
          existing.push({
            scrutin: sv.scrutin || {
              numero: scrutin.numero,
              titre: scrutin.titre,
              date: scrutin.date,
              sort: scrutin.sort,
              lien: scrutin.lien
            },
            position: sv.position
          })
          votesByDeputy.set(sv.slug, existing)
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`📊 Processed ${i + 1}/${toProcess.length} scrutins`)
      }
    }

    // Log results
    let totalVotes = 0
    votesByDeputy.forEach(votes => totalVotes += votes.length)
    console.log(`✅ Collected ${totalVotes} votes across ${deputySlugs.size} deputies`)

    return votesByDeputy
  }

  /**
   * Get all scrutins (votes) for the current legislature
   */
  async getAllScrutins(legislature?: string): Promise<Scrutin[]> {
    const leg = legislature || this.legislature
    console.log(`🗳️ Fetching all scrutins for legislature ${leg}...`)

    const data = await this.fetchJson<{ scrutins: { scrutin: Scrutin }[] }>(
      `${this.baseUrl}/${leg}/scrutins/json`
    )

    if (data?.scrutins) {
      const scrutins = data.scrutins.map(s => s.scrutin)
      console.log(`✅ Found ${scrutins.length} scrutins`)
      return scrutins
    }

    return []
  }

  /**
   * Get details of a specific scrutin
   */
  async getScrutinDetails(numero: number, legislature?: string): Promise<any> {
    const leg = legislature || this.legislature
    const data = await this.fetchJson<any>(
      `${this.baseUrl}/${leg}/scrutin/${numero}/json`
    )
    return data
  }

  // ==========================================================================
  // Activity Synthesis Endpoints
  // ==========================================================================

  /**
   * Get 12-month activity synthesis for all deputies
   * This is the MOST VALUABLE endpoint - gives aggregate stats
   */
  async getActivitySynthesis(): Promise<SynthesisData[]> {
    console.log('📊 Fetching 12-month activity synthesis...')

    const data = await this.fetchJson<{ deputes: { depute: SynthesisData['depute'] }[] }>(
      `${this.baseUrl}/synthese/data/json`
    )

    if (data?.deputes) {
      const synthesis = data.deputes.map(d => ({ depute: d.depute }))
      console.log(`✅ Found synthesis data for ${synthesis.length} deputies`)
      return synthesis
    }

    return []
  }

  /**
   * Get monthly synthesis for a specific month (YYYYMM format)
   */
  async getMonthlySynthesis(yearMonth: string): Promise<SynthesisData[]> {
    console.log(`📊 Fetching synthesis for ${yearMonth}...`)

    const data = await this.fetchJson<{ deputes: { depute: SynthesisData['depute'] }[] }>(
      `${this.baseUrl}/synthese/${yearMonth}/json`
    )

    if (data?.deputes) {
      return data.deputes.map(d => ({ depute: d.depute }))
    }

    return []
  }

  // ==========================================================================
  // Questions Endpoints
  // ==========================================================================

  /**
   * Get questions for a deputy (from details)
   */
  async getDeputyQuestions(slug: string): Promise<Question[]> {
    console.log(`❓ Fetching questions for ${slug}...`)

    const details = await this.getDeputyDetails(slug) as any
    const questions: Question[] = []

    // Oral questions
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

    // Written questions
    if (details?.questions_ecrites) {
      for (const q of details.questions_ecrites) {
        questions.push({
          id: q.id || '',
          date: q.date || '',
          type: 'ecrite',
          titre: q.titre || q.question || '',
          ministere: q.ministere || '',
          reponse: q.reponse || undefined,
          date_reponse: q.date_reponse || undefined,
          lien: q.lien || ''
        })
      }
    }

    console.log(`✅ Found ${questions.length} questions for ${slug}`)
    return questions
  }

  // ==========================================================================
  // Amendments Endpoints
  // ==========================================================================

  /**
   * Get amendments proposed by a deputy
   */
  async getDeputyAmendments(slug: string): Promise<Amendment[]> {
    console.log(`📝 Fetching amendments for ${slug}...`)

    const details = await this.getDeputyDetails(slug) as any
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

  /**
   * Get all amendments for a specific bill
   */
  async getBillAmendments(billNumber: string, legislature?: string): Promise<any[]> {
    const leg = legislature || this.legislature
    console.log(`📝 Fetching amendments for bill ${billNumber}...`)

    const data = await this.fetchJson<any>(
      `${this.baseUrl}/${leg}/amendements/${billNumber}/json`
    )

    return data?.amendements || []
  }

  // ==========================================================================
  // Attendance Calculation
  // ==========================================================================

  /**
   * Calculate attendance from votes and synthesis data
   */
  async getDeputyAttendance(slug: string): Promise<{
    votes: { present: number; absent: number; total: number; rate: number }
    commission: { presences: number; median: number }
    hemicycle: { presences: number; median: number; interventions: number }
  }> {
    // Get votes for vote-based attendance
    const votes = await this.getDeputyVotes(slug)
    const votePresent = votes.filter(v => v.position !== 'absent').length
    const voteAbsent = votes.filter(v => v.position === 'absent').length
    const voteTotal = votes.length

    // Try to get synthesis data for more detailed attendance
    const synthesis = await this.getActivitySynthesis()
    const deputySynthesis = synthesis.find(s => s.depute.slug === slug)?.depute

    return {
      votes: {
        present: votePresent,
        absent: voteAbsent,
        total: voteTotal,
        rate: voteTotal > 0 ? Math.round((votePresent / voteTotal) * 100) : 0
      },
      commission: {
        presences: deputySynthesis?.commission_presences || 0,
        median: deputySynthesis?.commission_presences_medi || 0
      },
      hemicycle: {
        presences: deputySynthesis?.hemicycle_presences || 0,
        median: deputySynthesis?.hemicycle_presences_medi || 0,
        interventions: deputySynthesis?.hemicycle_interventions || 0
      }
    }
  }

  // ==========================================================================
  // Database Storage Methods
  // ==========================================================================

  /**
   * Store deputy in database with deduplication
   */
  async storeDeputyInDatabase(deputy: DeputyInfo): Promise<string> {
    // Check for existing by external_id
    const { data: existing } = await supabase
      .from('politicians')
      .select('id')
      .eq('external_id', deputy.slug)
      .eq('source_system', 'nosdeputes')
      .single()

    const politicianData = {
      name: deputy.nom,
      first_name: deputy.prenom || null,
      last_name: deputy.nom_de_famille || null,
      party: deputy.parti_ratt_financier || deputy.groupe_sigle || null,
      position: 'Député',
      constituency: deputy.circonscription || deputy.nom_circo || null,
      gender: deputy.sexe === 'H' ? 'male' : deputy.sexe === 'F' ? 'female' : null,
      birth_date: deputy.date_naissance || null,
      social_media: {
        website: deputy.url_an || deputy.url_nosdeputes || null,
        twitter: deputy.twitter || null
      },
      contact_info: {
        email: deputy.emails?.[0] || null
      },
      external_id: deputy.slug,
      source_system: 'nosdeputes',
      is_active: !deputy.mandat_fin,
      metadata: {
        groupe: deputy.groupe,
        num_circo: deputy.num_circo,
        num_deptmt: deputy.num_deptmt,
        profession: deputy.profession,
        mandat_debut: deputy.mandat_debut,
        mandat_fin: deputy.mandat_fin
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
   * Store parliamentary actions (votes, questions, amendments)
   */
  async storeParliamentaryActions(
    politicianId: string,
    slug: string
  ): Promise<{ votes: number; questions: number; amendments: number }> {
    const stats = { votes: 0, questions: 0, amendments: 0 }

    // Store votes
    const votes = await this.getDeputyVotes(slug)
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
          category: this.categorizeVote(scrutin.titre || ''),
          metadata: { sort: scrutin.sort }
        }, {
          onConflict: 'politician_id,action_type,bill_id'
        })
      stats.votes++
    }

    // Store questions
    const questions = await this.getDeputyQuestions(slug)
    for (const q of questions) {
      await supabase
        .from('parliamentary_actions')
        .upsert({
          politician_id: politicianId,
          action_type: 'question',
          action_date: new Date(q.date).toISOString(),
          description: q.titre,
          official_reference: q.lien,
          category: this.categorizeQuestion(q.titre, q.ministere),
          metadata: {
            type: q.type,
            ministere: q.ministere,
            reponse: q.reponse,
            date_reponse: q.date_reponse
          }
        }, {
          onConflict: 'politician_id,action_type,official_reference'
        })
      stats.questions++
    }

    // Store amendments
    const amendments = await this.getDeputyAmendments(slug)
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
          category: this.categorizeAmendment(a.sujet),
          metadata: {
            numero: a.numero,
            sort: a.sort,
            signataires: a.signataires
          }
        }, {
          onConflict: 'politician_id,action_type,official_reference'
        })
      stats.amendments++
    }

    return stats
  }

  /**
   * Store synthesis data as attendance record
   */
  async storeSynthesisData(politicianId: string, synthesis: SynthesisData['depute']): Promise<void> {
    // Update politician with synthesis metadata
    await supabase
      .from('politicians')
      .update({
        metadata: {
          synthesis: {
            commission_presences: synthesis.commission_presences,
            hemicycle_presences: synthesis.hemicycle_presences,
            hemicycle_interventions: synthesis.hemicycle_interventions,
            amendements_proposes: synthesis.amendements_proposes,
            amendements_adoptes: synthesis.amendements_adoptes,
            questions_ecrites: synthesis.questions_ecrites,
            questions_orales: synthesis.questions_orales,
            rapports: synthesis.rapports,
            propositions_ecrites: synthesis.propositions_ecrites
          }
        }
      })
      .eq('id', politicianId)
  }

  // ==========================================================================
  // Categorization Helpers
  // ==========================================================================

  private categorizeVote(titre: string): string {
    const lower = titre.toLowerCase()
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

  private categorizeQuestion(titre: string, ministere: string): string {
    const text = `${titre} ${ministere}`.toLowerCase()
    return this.categorizeVote(text)
  }

  private categorizeAmendment(sujet: string): string {
    return this.categorizeVote(sujet || '')
  }

  // ==========================================================================
  // Job Tracking
  // ==========================================================================

  async trackCollectionJob(jobType: string, status: string, metadata?: any): Promise<string> {
    const { data, error } = await supabase
      .from('data_collection_jobs')
      .insert({
        job_type: jobType,
        status,
        source: this.baseUrl,
        metadata: metadata || {}
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async updateCollectionJob(jobId: string, updates: {
    status?: string
    records_collected?: number
    records_new?: number
    records_updated?: number
    error_message?: string
    completed_at?: string
    duration_seconds?: number
  }): Promise<void> {
    await supabase
      .from('data_collection_jobs')
      .update(updates)
      .eq('id', jobId)
  }
}

// Export singleton instance
export const assembleeNationaleClient = new AssembleeNationaleClient()
