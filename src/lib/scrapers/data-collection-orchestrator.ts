/**
 * Data Collection Orchestrator
 * Coordinates scraping from multiple sources and stores in database
 */

import { assembleeNationaleClient } from './assemblee-nationale-client'
import { supabase } from '@/lib/supabase'

interface CollectionResult {
  success: boolean
  jobId: string
  recordsCollected: number
  recordsNew: number
  recordsUpdated: number
  errors: string[]
  duration: number
}

class DataCollectionOrchestrator {
  /**
   * Collect all deputies and their data
   */
  async collectDeputiesData(): Promise<CollectionResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let recordsCollected = 0
    let recordsNew = 0
    let recordsUpdated = 0

    // Create job tracking
    const jobId = await assembleeNationaleClient.trackCollectionJob(
      'assemblee_deputies_full',
      'running'
    )

    try {
      console.log('Starting deputies data collection...')

      // Get all deputies
      const deputies = await assembleeNationaleClient.getAllDeputies()
      console.log(`Found ${deputies.length} deputies to process`)

      // Process each deputy
      for (const deputy of deputies) {
        try {
          // Check if exists
          const { data: existing } = await supabase
            .from('politicians')
            .select('id')
            .eq('name', deputy.nom)
            .single()

          // Store deputy info
          await assembleeNationaleClient.storeDeputyInDatabase(deputy)

          if (existing) {
            recordsUpdated++
          } else {
            recordsNew++
          }

          recordsCollected++

          // Rate limiting: wait 500ms between requests
          await this.sleep(500)
        } catch (error) {
          const errorMsg = `Failed to process deputy ${deputy.nom}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update job status
      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'completed',
        records_collected: recordsCollected,
        records_new: recordsNew,
        records_updated: recordsUpdated,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      console.log(`Deputies collection completed: ${recordsCollected} processed (${recordsNew} new, ${recordsUpdated} updated)`)

      return {
        success: true,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors,
        duration
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const duration = Math.round((Date.now() - startTime) / 1000)

      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'failed',
        error_message: errorMsg,
        records_collected: recordsCollected,
        records_new: recordsNew,
        records_updated: recordsUpdated,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      return {
        success: false,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors: [...errors, errorMsg],
        duration
      }
    }
  }

  /**
   * Collect votes for all deputies
   */
  async collectDeputiesVotes(limit?: number): Promise<CollectionResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let recordsCollected = 0
    let recordsNew = 0
    let recordsUpdated = 0

    const jobId = await assembleeNationaleClient.trackCollectionJob(
      'assemblee_votes',
      'running'
    )

    try {
      console.log('Starting votes collection...')

      // Get all politicians who are deputies
      const { data: politicians } = await supabase
        .from('politicians')
        .select('id, name')
        .eq('position', 'Député')
        .limit(limit || 100)

      if (!politicians || politicians.length === 0) {
        throw new Error('No deputies found in database')
      }

      console.log(`Processing votes for ${politicians.length} deputies`)

      for (const politician of politicians) {
        try {
          // Get slug from name (convert to lowercase, replace spaces with dashes)
          const slug = this.nameToSlug(politician.name)

          // Get votes for this deputy
          const votes = await assembleeNationaleClient.getDeputyVotes(slug)

          if (votes.length > 0) {
            // Store in database
            await assembleeNationaleClient.storeParliamentaryActions(
              politician.id,
              votes,
              []
            )

            recordsCollected += votes.length
            recordsNew += votes.length // Simplified: assume all are new
          }

          // Rate limiting
          await this.sleep(1000)
        } catch (error) {
          const errorMsg = `Failed to process votes for ${politician.name}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'completed',
        records_collected: recordsCollected,
        records_new: recordsNew,
        records_updated: recordsUpdated,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      console.log(`Votes collection completed: ${recordsCollected} votes collected`)

      return {
        success: true,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors,
        duration
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const duration = Math.round((Date.now() - startTime) / 1000)

      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'failed',
        error_message: errorMsg,
        records_collected: recordsCollected,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      return {
        success: false,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors: [...errors, errorMsg],
        duration
      }
    }
  }

  /**
   * Collect activity and attendance for all deputies
   */
  async collectDeputiesActivity(limit?: number): Promise<CollectionResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let recordsCollected = 0
    let recordsNew = 0
    let recordsUpdated = 0

    const jobId = await assembleeNationaleClient.trackCollectionJob(
      'assemblee_activity',
      'running'
    )

    try {
      console.log('Starting activity collection...')

      const { data: politicians } = await supabase
        .from('politicians')
        .select('id, name')
        .eq('position', 'Député')
        .limit(limit || 100)

      if (!politicians || politicians.length === 0) {
        throw new Error('No deputies found in database')
      }

      console.log(`Processing activity for ${politicians.length} deputies`)

      for (const politician of politicians) {
        try {
          const slug = this.nameToSlug(politician.name)

          // Get activity
          const activities = await assembleeNationaleClient.getDeputyActivity(slug)
          const attendance = await assembleeNationaleClient.getDeputyAttendance(slug)

          // Store activities
          if (activities.length > 0) {
            await assembleeNationaleClient.storeParliamentaryActions(
              politician.id,
              [],
              activities
            )
            recordsCollected += activities.length
            recordsNew += activities.length
          }

          // Update politician attendance stats
          await supabase
            .from('politicians')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', politician.id)

          // Rate limiting
          await this.sleep(1000)
        } catch (error) {
          const errorMsg = `Failed to process activity for ${politician.name}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'completed',
        records_collected: recordsCollected,
        records_new: recordsNew,
        records_updated: recordsUpdated,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      console.log(`Activity collection completed: ${recordsCollected} activities collected`)

      return {
        success: true,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors,
        duration
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const duration = Math.round((Date.now() - startTime) / 1000)

      await assembleeNationaleClient.updateCollectionJob(jobId, {
        status: 'failed',
        error_message: errorMsg,
        records_collected: recordsCollected,
        completed_at: new Date().toISOString(),
        duration_seconds: duration
      })

      return {
        success: false,
        jobId,
        recordsCollected,
        recordsNew,
        recordsUpdated,
        errors: [...errors, errorMsg],
        duration
      }
    }
  }

  /**
   * Run full data collection (deputies + votes + activity)
   */
  async runFullCollection(): Promise<{
    deputies: CollectionResult
    votes: CollectionResult
    activity: CollectionResult
  }> {
    console.log('Starting full data collection...')

    // Step 1: Collect deputies
    const deputies = await this.collectDeputiesData()

    // Step 2: Collect votes
    const votes = await this.collectDeputiesVotes(50) // Limit to 50 for testing

    // Step 3: Collect activity
    const activity = await this.collectDeputiesActivity(50)

    console.log('Full collection completed!')
    console.log('Summary:', {
      deputies: `${deputies.recordsCollected} processed (${deputies.recordsNew} new)`,
      votes: `${votes.recordsCollected} votes collected`,
      activity: `${activity.recordsCollected} activities collected`
    })

    return { deputies, votes, activity }
  }

  /**
   * Helper: Convert name to NosDéputés slug format
   */
  private nameToSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton
export const dataCollectionOrchestrator = new DataCollectionOrchestrator()
