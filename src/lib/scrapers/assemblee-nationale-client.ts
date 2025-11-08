/**
 * Assemblée Nationale API Client
 * Scrapes official parliamentary data from the French National Assembly
 *
 * Data sources:
 * - Open Data API: https://data.assemblee-nationale.fr/
 * - NosDéputés.fr API: https://www.nosdeputes.fr/
 * - Official website scraping for missing data
 */

import { supabase } from '@/lib/supabase'

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
  circonscription: string
  emails: string[]
  adresses: any[]
  collaborateurs: any[]
  url_an: string
  url_nosdeputes: string
}

interface Vote {
  numero: string
  titre: string
  date: string
  position: 'pour' | 'contre' | 'abstention' | 'absent'
  sort: string
  lien_scrutin: string
}

interface Activity {
  date: string
  type: string
  titre: string
  organisme?: string
  lien?: string
}

class AssembleeNationaleClient {
  private baseUrlNosDeps = 'https://www.nosdeputes.fr'
  private baseUrlOpenData = 'https://data.assemblee-nationale.fr'

  /**
   * Get all current deputies with their info
   */
  async getAllDeputies(): Promise<DeputyInfo[]> {
    try {
      console.log('Fetching all deputies from NosDéputés.fr...')

      const response = await fetch(`${this.baseUrlNosDeps}/deputes/enmandat/json`, {
        headers: {
          'User-Agent': 'PolitikCred/1.0 (Contact: contact@politikcred.fr)',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch deputies: ${response.status}`)
      }

      const data = await response.json()

      // NosDéputés returns { deputes: [ { depute: {...} }, ... ] }
      const deputies = data.deputes?.map((d: any) => d.depute) || []

      console.log(`Fetched ${deputies.length} deputies`)
      return deputies
    } catch (error) {
      console.error('Error fetching deputies:', error)
      throw error
    }
  }

  /**
   * Get detailed info for a specific deputy
   */
  async getDeputyDetails(slug: string): Promise<any> {
    try {
      console.log(`Fetching details for deputy: ${slug}`)

      const response = await fetch(`${this.baseUrlNosDeps}/${slug}/json`, {
        headers: {
          'User-Agent': 'PolitikCred/1.0 (Contact: contact@politikcred.fr)',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch deputy details: ${response.status}`)
      }

      const data = await response.json()
      return data.depute
    } catch (error) {
      console.error(`Error fetching deputy details for ${slug}:`, error)
      throw error
    }
  }

  /**
   * Get votes for a specific deputy
   */
  async getDeputyVotes(slug: string): Promise<Vote[]> {
    try {
      console.log(`Fetching votes for deputy: ${slug}`)

      const details = await this.getDeputyDetails(slug)
      const votes = details?.votes || []

      console.log(`Fetched ${votes.length} votes for ${slug}`)
      return votes
    } catch (error) {
      console.error(`Error fetching votes for ${slug}:`, error)
      return []
    }
  }

  /**
   * Get attendance and activity for a deputy
   */
  async getDeputyActivity(slug: string): Promise<Activity[]> {
    try {
      console.log(`Fetching activity for deputy: ${slug}`)

      const details = await this.getDeputyDetails(slug)

      // Combine different activity types
      const activities: Activity[] = []

      // Commission memberships
      if (details.responsabilites) {
        details.responsabilites.forEach((resp: any) => {
          activities.push({
            date: resp.debut || new Date().toISOString(),
            type: 'commission',
            titre: resp.responsabilite || '',
            organisme: resp.organisme || ''
          })
        })
      }

      // Questions
      if (details.questions_orales) {
        details.questions_orales.forEach((q: any) => {
          activities.push({
            date: q.date || '',
            type: 'question_orale',
            titre: q.titre || '',
            lien: q.lien || ''
          })
        })
      }

      if (details.questions_ecrites) {
        details.questions_ecrites.forEach((q: any) => {
          activities.push({
            date: q.date || '',
            type: 'question_ecrite',
            titre: q.titre || '',
            lien: q.lien || ''
          })
        })
      }

      // Interventions
      if (details.interventions) {
        details.interventions.forEach((i: any) => {
          activities.push({
            date: i.date || '',
            type: 'intervention',
            titre: i.titre || '',
            lien: i.lien || ''
          })
        })
      }

      console.log(`Fetched ${activities.length} activities for ${slug}`)
      return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } catch (error) {
      console.error(`Error fetching activity for ${slug}:`, error)
      return []
    }
  }

  /**
   * Get attendance statistics for a deputy
   */
  async getDeputyAttendance(slug: string): Promise<{
    present: number
    absent: number
    total: number
    rate: number
  }> {
    try {
      const details = await this.getDeputyDetails(slug)

      // Calculate from votes
      const votes = details?.votes || []
      const present = votes.filter((v: Vote) => v.position !== 'absent').length
      const absent = votes.filter((v: Vote) => v.position === 'absent').length
      const total = votes.length

      return {
        present,
        absent,
        total,
        rate: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0
      }
    } catch (error) {
      console.error(`Error calculating attendance for ${slug}:`, error)
      return { present: 0, absent: 0, total: 0, rate: 0 }
    }
  }

  /**
   * Store deputy data in database
   * Uses external_id (slug) to prevent duplicates
   */
  async storeDeputyInDatabase(deputy: DeputyInfo): Promise<string> {
    try {
      // Check if politician already exists by external_id
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
        constituency: deputy.circonscription || null,
        gender: deputy.sexe === 'H' ? 'male' : deputy.sexe === 'F' ? 'female' : null,
        birth_date: deputy.date_naissance || null,
        social_media: {
          website: deputy.url_an || deputy.url_nosdeputes || null
        },
        contact_info: {
          email: deputy.emails?.[0] || null
        },
        external_id: deputy.slug,
        source_system: 'nosdeputes',
        is_active: true,
        verification_status: 'verified' as const
      }

      if (existing) {
        // Update existing politician
        await supabase
          .from('politicians')
          .update(politicianData)
          .eq('id', existing.id)

        console.log(`Updated politician: ${deputy.nom} (${deputy.slug})`)
        return existing.id
      } else {
        // Insert new politician
        const { data: inserted, error } = await supabase
          .from('politicians')
          .insert(politicianData)
          .select('id')
          .single()

        if (error) {
          throw error
        }

        console.log(`Inserted politician: ${deputy.nom} (${deputy.slug})`)
        return inserted.id
      }
    } catch (error) {
      console.error(`Error storing deputy ${deputy.nom}:`, error)
      throw error
    }
  }

  /**
   * Store parliamentary actions in database
   */
  async storeParliamentaryActions(
    politicianId: string,
    votes: Vote[],
    activities: Activity[]
  ): Promise<void> {
    try {
      // Store votes
      for (const vote of votes) {
        const actionData = {
          politician_id: politicianId,
          action_type: 'vote' as const,
          action_date: new Date(vote.date).toISOString(),
          description: vote.titre,
          vote_position: vote.position,
          bill_id: vote.numero,
          official_reference: vote.lien_scrutin,
          metadata: {
            sort: vote.sort
          }
        }

        // Insert or update
        await supabase
          .from('parliamentary_actions')
          .upsert(actionData, {
            onConflict: 'politician_id,action_date,action_type,description'
          })
      }

      // Store other activities
      for (const activity of activities) {
        const actionData = {
          politician_id: politicianId,
          action_type: this.mapActivityType(activity.type),
          action_date: new Date(activity.date).toISOString(),
          description: activity.titre,
          official_reference: activity.lien || '',
          metadata: {
            organisme: activity.organisme || null
          }
        }

        await supabase
          .from('parliamentary_actions')
          .upsert(actionData, {
            onConflict: 'politician_id,action_date,action_type,description'
          })
      }

      console.log(`Stored ${votes.length} votes and ${activities.length} activities`)
    } catch (error) {
      console.error('Error storing parliamentary actions:', error)
      throw error
    }
  }

  /**
   * Map activity type to our schema
   */
  private mapActivityType(type: string): string {
    const mapping: Record<string, string> = {
      'commission': 'committee',
      'question_orale': 'question',
      'question_ecrite': 'question',
      'intervention': 'debate'
    }
    return mapping[type] || 'other'
  }

  /**
   * Track collection job
   */
  async trackCollectionJob(
    jobType: string,
    status: string,
    metadata?: any
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('data_collection_jobs')
        .insert({
          job_type: jobType,
          status: status,
          source: this.baseUrlNosDeps,
          metadata: metadata || {}
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error tracking job:', error)
      throw error
    }
  }

  /**
   * Update collection job status
   */
  async updateCollectionJob(
    jobId: string,
    updates: {
      status?: string
      records_collected?: number
      records_new?: number
      records_updated?: number
      error_message?: string
      completed_at?: string
      duration_seconds?: number
    }
  ): Promise<void> {
    try {
      await supabase
        .from('data_collection_jobs')
        .update(updates)
        .eq('id', jobId)
    } catch (error) {
      console.error('Error updating job:', error)
      throw error
    }
  }
}

// Export singleton instance
export const assembleeNationaleClient = new AssembleeNationaleClient()
