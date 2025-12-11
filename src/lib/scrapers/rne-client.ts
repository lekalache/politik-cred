/**
 * Répertoire National des Élus (RNE) Client
 * Fetches official elected officials data from data.gouv.fr
 *
 * Data source: https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1/
 * Updated quarterly by Ministry of Interior
 *
 * This provides the authoritative list of all French deputies and senators
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

interface RNEDeputyRecord {
  __id: number
  'Code du département': string
  'Libellé du département': string
  'Code de la collectivité à statut particulier': string | null
  'Libellé de la collectivité à statut particulier': string | null
  'Code de la circonscription législative': string
  'Libellé de la circonscription législative': string
  "Nom de l'élu": string
  "Prénom de l'élu": string
  'Code sexe': 'M' | 'F'
  'Date de naissance': string
  'Code de la catégorie socio-professionnelle': string
  'Libellé de la catégorie socio-professionnelle': string
  'Date de début du mandat': string
}

interface RNESenatorRecord {
  __id: number
  'Code du département': string
  'Libellé du département': string
  'Code de la collectivité à statut particulier': string | null
  'Libellé de la collectivité à statut particulier': string | null
  "Nom de l'élu": string
  "Prénom de l'élu": string
  'Code sexe': 'M' | 'F'
  'Date de naissance': string
  'Code de la catégorie socio-professionnelle': string
  'Libellé de la catégorie socio-professionnelle': string
  'Date de début du mandat': string
}

interface RNEApiResponse<T> {
  data: T[]
  links?: {
    next?: string
    prev?: string
  }
}

// ============================================================================
// Main Client Class
// ============================================================================

class RNEClient {
  // data.gouv.fr Tabular API endpoint
  private tabularApiBase = 'https://tabular-api.data.gouv.fr/api/resources'

  // Official resource IDs from the RNE dataset (updated October 2024)
  private deputiesResourceId = '1ac42ff4-1336-44f8-a221-832039dbc142'
  private senatorsResourceId = 'b78f8945-509f-4609-a4a7-3048b8370479'

  private rateLimitMs = 300

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==========================================================================
  // Fetch Methods
  // ==========================================================================

  /**
   * Fetch all deputies from RNE
   */
  async fetchDeputies(): Promise<RNEDeputyRecord[]> {
    console.log('📋 Fetching deputies from RNE (data.gouv.fr)...')
    return await this.fetchPaginated<RNEDeputyRecord>(this.deputiesResourceId, 'deputies')
  }

  /**
   * Fetch all senators from RNE
   */
  async fetchSenators(): Promise<RNESenatorRecord[]> {
    console.log('📋 Fetching senators from RNE (data.gouv.fr)...')
    return await this.fetchPaginated<RNESenatorRecord>(this.senatorsResourceId, 'senators')
  }

  /**
   * Generic paginated fetch for RNE data
   */
  private async fetchPaginated<T>(resourceId: string, label: string): Promise<T[]> {
    const allRecords: T[] = []
    let page = 1
    const pageSize = 100

    try {
      while (true) {
        await this.delay(this.rateLimitMs)

        const url = `${this.tabularApiBase}/${resourceId}/data/?page=${page}&page_size=${pageSize}`

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'PolitikCred/1.0 (https://politikcred.fr)'
          }
        })

        if (!response.ok) {
          console.error(`RNE API error for ${label}: ${response.status}`)
          break
        }

        const data: RNEApiResponse<T> = await response.json()

        if (!data.data || data.data.length === 0) {
          break
        }

        allRecords.push(...data.data)
        console.log(`📄 ${label} page ${page}: fetched ${data.data.length} records (total: ${allRecords.length})`)

        if (data.data.length < pageSize) {
          break
        }

        page++
      }
    } catch (error) {
      console.error(`Error fetching ${label} from RNE:`, error)
    }

    console.log(`✅ Total ${label} fetched: ${allRecords.length}`)
    return allRecords
  }

  // ==========================================================================
  // Database Storage
  // ==========================================================================

  /**
   * Generate a URL-safe slug from a name
   */
  private generateSlug(firstName: string, lastName: string): string {
    const text = `${firstName} ${lastName}`
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Store deputy in database
   */
  async storeDeputy(record: RNEDeputyRecord): Promise<string | null> {
    try {
      const firstName = record["Prénom de l'élu"] || ''
      const lastName = record["Nom de l'élu"] || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (!fullName) {
        console.warn('Skipping deputy with no name')
        return null
      }

      const slug = this.generateSlug(firstName, lastName)
      const externalId = `rne-deputy-${slug}`

      // Check if exists by external_id or by name
      const { data: existingByExternal } = await supabase
        .from('politicians')
        .select('id')
        .eq('external_id', externalId)
        .single()

      if (existingByExternal) {
        // Update existing record
        await supabase
          .from('politicians')
          .update({
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            position: 'Député',
            constituency: `${record['Libellé du département'] || ''} - ${record['Libellé de la circonscription législative'] || ''}`.trim(),
            gender: record['Code sexe'] === 'F' ? 'female' : 'male',
            birth_date: record['Date de naissance'] || null,
            is_active: true,
            metadata: {
              rne: {
                source: 'data.gouv.fr/rne',
                code_departement: record['Code du département'],
                libelle_departement: record['Libellé du département'],
                code_circonscription: record['Code de la circonscription législative'],
                libelle_circonscription: record['Libellé de la circonscription législative'],
                code_profession: record['Code de la catégorie socio-professionnelle'],
                libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
                date_debut_mandat: record['Date de début du mandat']
              },
              slug: slug
            }
          })
          .eq('id', existingByExternal.id)

        return existingByExternal.id
      }

      // Check by name match (case insensitive)
      const { data: existingByName } = await supabase
        .from('politicians')
        .select('id')
        .ilike('last_name', lastName)
        .ilike('first_name', firstName)
        .single()

      if (existingByName) {
        // Update existing record with RNE data
        await supabase
          .from('politicians')
          .update({
            external_id: externalId,
            source_system: 'rne',
            position: 'Député',
            constituency: `${record['Libellé du département'] || ''} - ${record['Libellé de la circonscription législative'] || ''}`.trim(),
            gender: record['Code sexe'] === 'F' ? 'female' : 'male',
            birth_date: record['Date de naissance'] || null,
            is_active: true,
            metadata: {
              rne: {
                source: 'data.gouv.fr/rne',
                code_departement: record['Code du département'],
                libelle_departement: record['Libellé du département'],
                code_circonscription: record['Code de la circonscription législative'],
                libelle_circonscription: record['Libellé de la circonscription législative'],
                code_profession: record['Code de la catégorie socio-professionnelle'],
                libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
                date_debut_mandat: record['Date de début du mandat']
              },
              slug: slug
            }
          })
          .eq('id', existingByName.id)

        return existingByName.id
      }

      // Insert new record
      const { data: inserted, error } = await supabase
        .from('politicians')
        .insert({
          name: fullName,
          first_name: firstName,
          last_name: lastName,
          position: 'Député',
          constituency: `${record['Libellé du département'] || ''} - ${record['Libellé de la circonscription législative'] || ''}`.trim(),
          gender: record['Code sexe'] === 'F' ? 'female' : 'male',
          birth_date: record['Date de naissance'] || null,
          external_id: externalId,
          source_system: 'rne',
          is_active: true,
          verification_status: 'verified',
          metadata: {
            rne: {
              source: 'data.gouv.fr/rne',
              code_departement: record['Code du département'],
              libelle_departement: record['Libellé du département'],
              code_circonscription: record['Code de la circonscription législative'],
              libelle_circonscription: record['Libellé de la circonscription législative'],
              code_profession: record['Code de la catégorie socio-professionnelle'],
              libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
              date_debut_mandat: record['Date de début du mandat']
            },
            slug: slug
          }
        })
        .select('id')
        .single()

      if (error) throw error
      return inserted.id
    } catch (error) {
      console.error(`Error storing deputy ${record["Nom de l'élu"]}:`, error)
      return null
    }
  }

  /**
   * Store senator in database
   */
  async storeSenator(record: RNESenatorRecord): Promise<string | null> {
    try {
      const firstName = record["Prénom de l'élu"] || ''
      const lastName = record["Nom de l'élu"] || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (!fullName) {
        console.warn('Skipping senator with no name')
        return null
      }

      const slug = this.generateSlug(firstName, lastName)
      const externalId = `rne-senator-${slug}`

      // Check if exists by external_id
      const { data: existingByExternal } = await supabase
        .from('politicians')
        .select('id')
        .eq('external_id', externalId)
        .single()

      if (existingByExternal) {
        await supabase
          .from('politicians')
          .update({
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            position: 'Sénateur',
            constituency: record['Libellé du département'] || '',
            gender: record['Code sexe'] === 'F' ? 'female' : 'male',
            birth_date: record['Date de naissance'] || null,
            is_active: true,
            metadata: {
              rne: {
                source: 'data.gouv.fr/rne',
                code_departement: record['Code du département'],
                libelle_departement: record['Libellé du département'],
                code_profession: record['Code de la catégorie socio-professionnelle'],
                libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
                date_debut_mandat: record['Date de début du mandat']
              },
              slug: slug
            }
          })
          .eq('id', existingByExternal.id)

        return existingByExternal.id
      }

      // Check by name match
      const { data: existingByName } = await supabase
        .from('politicians')
        .select('id')
        .ilike('last_name', lastName)
        .ilike('first_name', firstName)
        .single()

      if (existingByName) {
        await supabase
          .from('politicians')
          .update({
            external_id: externalId,
            source_system: 'rne',
            position: 'Sénateur',
            constituency: record['Libellé du département'] || '',
            gender: record['Code sexe'] === 'F' ? 'female' : 'male',
            birth_date: record['Date de naissance'] || null,
            is_active: true,
            metadata: {
              rne: {
                source: 'data.gouv.fr/rne',
                code_departement: record['Code du département'],
                libelle_departement: record['Libellé du département'],
                code_profession: record['Code de la catégorie socio-professionnelle'],
                libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
                date_debut_mandat: record['Date de début du mandat']
              },
              slug: slug
            }
          })
          .eq('id', existingByName.id)

        return existingByName.id
      }

      // Insert new record
      const { data: inserted, error } = await supabase
        .from('politicians')
        .insert({
          name: fullName,
          first_name: firstName,
          last_name: lastName,
          position: 'Sénateur',
          constituency: record['Libellé du département'] || '',
          gender: record['Code sexe'] === 'F' ? 'female' : 'male',
          birth_date: record['Date de naissance'] || null,
          external_id: externalId,
          source_system: 'rne',
          is_active: true,
          verification_status: 'verified',
          metadata: {
            rne: {
              source: 'data.gouv.fr/rne',
              code_departement: record['Code du département'],
              libelle_departement: record['Libellé du département'],
              code_profession: record['Code de la catégorie socio-professionnelle'],
              libelle_profession: record['Libellé de la catégorie socio-professionnelle'],
              date_debut_mandat: record['Date de début du mandat']
            },
            slug: slug
          }
        })
        .select('id')
        .single()

      if (error) throw error
      return inserted.id
    } catch (error) {
      console.error(`Error storing senator ${record["Nom de l'élu"]}:`, error)
      return null
    }
  }

  /**
   * Sync all RNE data to database
   */
  async syncToDatabase(): Promise<{ deputies: number; senators: number; errors: number }> {
    console.log('🔄 Syncing RNE data to database...')

    const stats = { deputies: 0, senators: 0, errors: 0 }

    // Fetch and process deputies
    const deputies = await this.fetchDeputies()
    console.log(`\n👥 Processing ${deputies.length} deputies...`)

    for (const deputy of deputies) {
      const id = await this.storeDeputy(deputy)
      if (id) {
        stats.deputies++
        if (stats.deputies % 50 === 0) {
          console.log(`✅ Deputies processed: ${stats.deputies}/${deputies.length}`)
        }
      } else {
        stats.errors++
      }
    }

    // Fetch and process senators
    const senators = await this.fetchSenators()
    console.log(`\n👥 Processing ${senators.length} senators...`)

    for (const senator of senators) {
      const id = await this.storeSenator(senator)
      if (id) {
        stats.senators++
        if (stats.senators % 50 === 0) {
          console.log(`✅ Senators processed: ${stats.senators}/${senators.length}`)
        }
      } else {
        stats.errors++
      }
    }

    console.log(`\n✅ RNE sync complete: ${stats.deputies} deputies, ${stats.senators} senators, ${stats.errors} errors`)
    return stats
  }

  /**
   * Get total count from RNE
   */
  async getCounts(): Promise<{ deputies: number; senators: number }> {
    // Quick count by fetching first page
    const deputiesResponse = await fetch(
      `${this.tabularApiBase}/${this.deputiesResourceId}/data/?page=1&page_size=1`,
      { headers: { 'Accept': 'application/json' } }
    )
    const senatorsResponse = await fetch(
      `${this.tabularApiBase}/${this.senatorsResourceId}/data/?page=1&page_size=1`,
      { headers: { 'Accept': 'application/json' } }
    )

    // Estimate counts from fetching all pages
    const allDeputies = await this.fetchDeputies()
    const allSenators = await this.fetchSenators()

    return {
      deputies: allDeputies.length,
      senators: allSenators.length
    }
  }
}

// Export singleton instance
export const rneClient = new RNEClient()
