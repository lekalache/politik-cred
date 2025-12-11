/**
 * Data Collection Orchestrator
 * Coordinates data collection from multiple official sources:
 *
 * 1. NosDéputés.fr - Deputies votes, questions, amendments, attendance
 * 2. NosSénateurs.fr - Senators votes, questions, amendments
 * 3. RNE (data.gouv.fr) - Official elected officials registry
 * 4. data.assemblee-nationale.fr - Official AN open data
 * 5. Vigie du Mensonge - Community-verified promises
 */

import { assembleeNationaleClient } from './assemblee-nationale-client'
import { senatClient } from './senat-client'
import { rneClient } from './rne-client'
import { assembleeOpendataClient } from './assemblee-opendata-client'
import { vigieClient, VigieImportResult } from './vigie-client'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

interface CollectionResult {
  success: boolean
  jobId: string
  recordsCollected: number
  recordsNew: number
  recordsUpdated: number
  errors: string[]
  duration: number
}

interface FullCollectionStats {
  rne: { deputies: number; senators: number; errors: number }
  deputies: { politicians: number; votes: number; questions: number; amendments: number; errors: number }
  senators: { politicians: number; votes: number; questions: number; amendments: number; errors: number }
  opendata: { scrutins: number; votes: number; errors: number }
  vigie: { imported: number; skipped: number; errors: number }
  duration: number
}

// ============================================================================
// Main Orchestrator Class
// ============================================================================

export class DataCollectionOrchestrator {

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private nameToSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // ==========================================================================
  // RNE Collection (Primary Source for Politicians List)
  // ==========================================================================

  /**
   * Sync all elected officials from RNE (Répertoire National des Élus)
   * This is the authoritative source from the French government
   */
  async collectRNEData(): Promise<{ deputies: number; senators: number; errors: number }> {
    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('📋 PHASE: RNE (Répertoire National des Élus)')
    console.log('══════════════════════════════════════════════════════════════\n')

    try {
      const stats = await rneClient.syncToDatabase()
      return stats
    } catch (error) {
      console.error('RNE collection failed:', error)
      return { deputies: 0, senators: 0, errors: 1 }
    }
  }

  // ==========================================================================
  // Deputies Collection (NosDéputés.fr)
  // ==========================================================================

  /**
   * Collect all deputies with their votes, questions, and amendments
   */
  async collectDeputiesFullData(options?: { limit?: number }): Promise<{
    politicians: number
    votes: number
    questions: number
    amendments: number
    errors: number
  }> {
    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('🏛️ PHASE: Deputies (NosDéputés.fr)')
    console.log('══════════════════════════════════════════════════════════════\n')

    const stats = { politicians: 0, votes: 0, questions: 0, amendments: 0, errors: 0 }

    try {
      // Get all deputies
      const deputies = await assembleeNationaleClient.getAllDeputies()
      const limit = options?.limit || deputies.length

      console.log(`👥 Processing ${Math.min(limit, deputies.length)} deputies...`)

      for (const deputy of deputies.slice(0, limit)) {
        try {
          // Store deputy info
          const politicianId = await assembleeNationaleClient.storeDeputyInDatabase(deputy)
          stats.politicians++

          // Store parliamentary actions (votes, questions, amendments)
          const actionStats = await assembleeNationaleClient.storeParliamentaryActions(
            politicianId,
            deputy.slug
          )

          stats.votes += actionStats.votes
          stats.questions += actionStats.questions
          stats.amendments += actionStats.amendments

          console.log(`✅ ${deputy.nom}: ${actionStats.votes}v, ${actionStats.questions}q, ${actionStats.amendments}a`)
        } catch (error) {
          console.error(`❌ Error processing ${deputy.nom}:`, error)
          stats.errors++
        }
      }

      // Also fetch synthesis data for aggregate stats
      try {
        const synthesis = await assembleeNationaleClient.getActivitySynthesis()
        console.log(`📊 Got synthesis data for ${synthesis.length} deputies`)

        for (const s of synthesis) {
          // Find matching politician and store synthesis
          const { data: politician } = await supabase
            .from('politicians')
            .select('id')
            .eq('external_id', s.depute.slug)
            .single()

          if (politician) {
            await assembleeNationaleClient.storeSynthesisData(politician.id, s.depute)
          }
        }
      } catch (error) {
        console.error('Error fetching synthesis:', error)
      }

    } catch (error) {
      console.error('Deputies collection failed:', error)
      stats.errors++
    }

    console.log(`\n📊 Deputies: ${stats.politicians} politicians, ${stats.votes} votes, ${stats.questions} questions, ${stats.amendments} amendments`)
    return stats
  }

  // ==========================================================================
  // Senators Collection (NosSénateurs.fr)
  // ==========================================================================

  /**
   * Collect all senators with their votes, questions, and amendments
   */
  async collectSenatorsFullData(options?: { limit?: number }): Promise<{
    politicians: number
    votes: number
    questions: number
    amendments: number
    errors: number
  }> {
    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('🏛️ PHASE: Senators (NosSénateurs.fr)')
    console.log('══════════════════════════════════════════════════════════════\n')

    try {
      const result = await senatClient.collectAllData(options)
      // Map 'senators' to 'politicians' for consistency
      return {
        politicians: result.senators,
        votes: result.votes,
        questions: result.questions,
        amendments: result.amendments,
        errors: result.errors
      }
    } catch (error) {
      console.error('Senators collection failed:', error)
      return { politicians: 0, votes: 0, questions: 0, amendments: 0, errors: 1 }
    }
  }

  // ==========================================================================
  // Official Open Data Collection (data.assemblee-nationale.fr)
  // ==========================================================================

  /**
   * Collect official scrutins and vote data from AN Open Data
   */
  async collectOfficialOpenData(options?: { limit?: number }): Promise<{
    scrutins: number
    votes: number
    errors: number
  }> {
    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('📊 PHASE: Official Open Data (data.assemblee-nationale.fr)')
    console.log('══════════════════════════════════════════════════════════════\n')

    try {
      const stats = await assembleeOpendataClient.collectAllData(options)
      return { scrutins: stats.scrutins, votes: stats.votes, errors: stats.errors }
    } catch (error) {
      console.error('Official open data collection failed:', error)
      return { scrutins: 0, votes: 0, errors: 1 }
    }
  }

  // ==========================================================================
  // Vigie du Mensonge Collection
  // ==========================================================================

  /**
   * Collect verified promises from Vigie du mensonge
   */
  async collectVigiePromises(politicianNames?: string[]): Promise<VigieImportResult> {
    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('👁️ PHASE: Vigie du Mensonge')
    console.log('══════════════════════════════════════════════════════════════\n')

    // If no politicians specified, get top politicians from database
    if (!politicianNames || politicianNames.length === 0) {
      const { data: politicians } = await supabase
        .from('politicians')
        .select('name')
        .eq('is_active', true)
        .order('credibility_score', { ascending: false, nullsFirst: false })
        .limit(20)

      politicianNames = politicians?.map(p => p.name) || []
    }

    if (politicianNames.length === 0) {
      console.log('⚠️ No politicians found to import')
      return {
        success: false,
        jobId: 'none',
        promisesFound: 0,
        promisesImported: 0,
        promisesSkipped: 0,
        errors: ['No politicians found'],
        duration: 0
      }
    }

    console.log(`🔍 Searching Vigie for ${politicianNames.length} politicians...`)
    return await vigieClient.importPromises(politicianNames)
  }

  // ==========================================================================
  // Full Collection Pipeline
  // ==========================================================================

  /**
   * Run the complete data collection pipeline
   */
  async runFullCollection(options?: {
    skipRNE?: boolean
    skipDeputies?: boolean
    skipSenators?: boolean
    skipOpenData?: boolean
    skipVigie?: boolean
    limit?: number
  }): Promise<FullCollectionStats> {
    const startTime = Date.now()

    console.log('\n╔════════════════════════════════════════════════════════════════════╗')
    console.log('║  🇫🇷 POLITIK CRED\' - Complete Data Collection Pipeline              ║')
    console.log('╚════════════════════════════════════════════════════════════════════╝\n')

    const stats: FullCollectionStats = {
      rne: { deputies: 0, senators: 0, errors: 0 },
      deputies: { politicians: 0, votes: 0, questions: 0, amendments: 0, errors: 0 },
      senators: { politicians: 0, votes: 0, questions: 0, amendments: 0, errors: 0 },
      opendata: { scrutins: 0, votes: 0, errors: 0 },
      vigie: { imported: 0, skipped: 0, errors: 0 },
      duration: 0
    }

    // Phase 1: RNE (Authoritative politicians list)
    if (!options?.skipRNE) {
      stats.rne = await this.collectRNEData()
    }

    // Phase 2: Deputies (NosDéputés.fr)
    if (!options?.skipDeputies) {
      stats.deputies = await this.collectDeputiesFullData({ limit: options?.limit })
    }

    // Phase 3: Senators (NosSénateurs.fr)
    if (!options?.skipSenators) {
      stats.senators = await this.collectSenatorsFullData({ limit: options?.limit })
    }

    // Phase 4: Official Open Data
    if (!options?.skipOpenData) {
      stats.opendata = await this.collectOfficialOpenData({ limit: options?.limit })
    }

    // Phase 5: Vigie du Mensonge
    if (!options?.skipVigie) {
      const vigieResult = await this.collectVigiePromises()
      stats.vigie = {
        imported: vigieResult.promisesImported,
        skipped: vigieResult.promisesSkipped,
        errors: vigieResult.errors.length
      }
    }

    stats.duration = Math.round((Date.now() - startTime) / 1000)

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════════════╗')
    console.log('║  📊 COLLECTION SUMMARY                                              ║')
    console.log('╠════════════════════════════════════════════════════════════════════╣')
    console.log(`║  RNE: ${stats.rne.deputies} deputies, ${stats.rne.senators} senators`)
    console.log(`║  Deputies: ${stats.deputies.politicians} politicians, ${stats.deputies.votes} votes`)
    console.log(`║  Senators: ${stats.senators.politicians} politicians, ${stats.senators.votes} votes`)
    console.log(`║  Open Data: ${stats.opendata.scrutins} scrutins, ${stats.opendata.votes} votes`)
    console.log(`║  Vigie: ${stats.vigie.imported} promises imported`)
    console.log('╠════════════════════════════════════════════════════════════════════╣')
    console.log(`║  ⏱️  Duration: ${stats.duration} seconds`)
    console.log('╚════════════════════════════════════════════════════════════════════╝\n')

    return stats
  }

  // ==========================================================================
  // Legacy Methods (for backward compatibility)
  // ==========================================================================

  /**
   * @deprecated Use collectDeputiesFullData instead
   */
  async collectDeputiesData(): Promise<CollectionResult> {
    const stats = await this.collectDeputiesFullData()
    return {
      success: stats.errors === 0,
      jobId: 'legacy',
      recordsCollected: stats.politicians,
      recordsNew: stats.politicians,
      recordsUpdated: 0,
      errors: [],
      duration: 0
    }
  }

  /**
   * @deprecated Use collectDeputiesFullData instead
   */
  async collectDeputiesVotes(limit?: number): Promise<CollectionResult> {
    const stats = await this.collectDeputiesFullData({ limit })
    return {
      success: stats.errors === 0,
      jobId: 'legacy',
      recordsCollected: stats.votes,
      recordsNew: stats.votes,
      recordsUpdated: 0,
      errors: [],
      duration: 0
    }
  }

  /**
   * @deprecated Use collectDeputiesFullData instead
   */
  async collectDeputiesActivity(limit?: number): Promise<CollectionResult> {
    const stats = await this.collectDeputiesFullData({ limit })
    return {
      success: stats.errors === 0,
      jobId: 'legacy',
      recordsCollected: stats.questions + stats.amendments,
      recordsNew: stats.questions + stats.amendments,
      recordsUpdated: 0,
      errors: [],
      duration: 0
    }
  }

  /**
   * @deprecated Use runFullCollection instead
   */
  async runFullCollection_Legacy(): Promise<{
    deputies: CollectionResult
    votes: CollectionResult
    activity: CollectionResult
  }> {
    const stats = await this.collectDeputiesFullData({ limit: 50 })
    const result = {
      success: stats.errors === 0,
      jobId: 'legacy',
      recordsCollected: 0,
      recordsNew: 0,
      recordsUpdated: 0,
      errors: [],
      duration: 0
    }

    return {
      deputies: { ...result, recordsCollected: stats.politicians },
      votes: { ...result, recordsCollected: stats.votes },
      activity: { ...result, recordsCollected: stats.questions + stats.amendments }
    }
  }
}

// Export singleton
export const dataCollectionOrchestrator = new DataCollectionOrchestrator()
