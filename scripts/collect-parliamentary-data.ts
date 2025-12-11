/**
 * Parliamentary Data Collector
 * Fetches voting records, bills, attendance from NosDéputés.fr API
 * Populates parliamentary_actions table
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface DeputyData {
  id: number
  nom: string
  prenom: string
  groupe_sigle: string
  slug: string
  url_nosdeputes_api: string
}

interface VoteData {
  date: string
  position: string
  titre: string
  url: string
  numero: string
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Normalize politician name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z\s]/g, '')
    .trim()
}

// Match our politicians to API deputies
async function matchPoliticiansToDeputies() {
  console.log('\n🔍 Matching politicians to API deputies...')

  // Get our politicians
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name, party')

  if (!politicians || politicians.length === 0) {
    throw new Error('No politicians found in database')
  }

  // Fetch all deputies from API
  const response = await fetch('https://www.nosdeputes.fr/deputes/json')
  const apiData = await response.json()
  const deputies: DeputyData[] = apiData.deputes.map((d: any) => d.depute)

  console.log(`Found ${politicians.length} politicians in DB`)
  console.log(`Found ${deputies.length} deputies in API`)

  // Match by name
  const matches: Array<{ politicianId: string; deputy: DeputyData }> = []
  const unmatched: string[] = []

  for (const politician of politicians) {
    const normalizedPoliticianName = normalizeName(politician.name)

    const match = deputies.find(deputy => {
      const deputyFullName = `${deputy.prenom} ${deputy.nom}`
      const normalizedDeputyName = normalizeName(deputyFullName)

      // Try exact match
      if (normalizedDeputyName === normalizedPoliticianName) return true

      // Try reversed (last first)
      const reversedName = `${deputy.nom} ${deputy.prenom}`
      if (normalizeName(reversedName) === normalizedPoliticianName) return true

      // Try last name only
      if (normalizeName(deputy.nom) === normalizedPoliticianName) return true

      return false
    })

    if (match) {
      matches.push({ politicianId: politician.id, deputy: match })

      // Update politician with external ID
      await supabase
        .from('politicians')
        .update({ external_id: match.id.toString() })
        .eq('id', politician.id)
    } else {
      unmatched.push(politician.name)
    }
  }

  console.log(`✅ Matched: ${matches.length}`)
  console.log(`❌ Unmatched: ${unmatched.length}`)
  if (unmatched.length > 0) {
    console.log('Unmatched politicians:', unmatched.slice(0, 10).join(', '))
  }

  return matches
}

// Fetch deputy votes
async function fetchDeputyVotes(deputySlug: string): Promise<any> {
  const votesUrl = `https://www.nosdeputes.fr/${deputySlug}/votes/json`
  const response = await fetch(votesUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${votesUrl}: ${response.statusText}`)
  }
  return await response.json()
}

// Collect votes for a politician
async function collectVotes(
  politicianId: string,
  deputy: DeputyData,
  jobId: string
): Promise<number> {
  console.log(`\n  📊 Collecting votes for ${deputy.prenom} ${deputy.nom}...`)

  try {
    // Fetch votes using correct endpoint
    const votesData = await fetchDeputyVotes(deputy.slug)
    const votes = votesData.votes || []

    console.log(`  Found ${votes.length} votes`)

    let inserted = 0
    let skipped = 0

    for (const voteWrapper of votes) {
      try {
        const vote = voteWrapper.vote
        const scrutin = vote.scrutin

        // Map position to our schema
        let votePosition = 'absent'
        if (vote.position === 'pour') votePosition = 'pour'
        else if (vote.position === 'contre') votePosition = 'contre'
        else if (vote.position === 'abstention') votePosition = 'abstention'

        // Insert vote as parliamentary action
        const { error } = await supabase
          .from('parliamentary_actions')
          .insert({
            politician_id: politicianId,
            action_type: 'vote',
            action_date: scrutin.date,
            description: scrutin.titre,
            vote_position: votePosition,
            bill_id: scrutin.numero,
            official_reference: scrutin.url_institution || scrutin.url_nosdeputes,
            metadata: {
              scrutin_type: scrutin.type,
              sort: scrutin.sort,
              nombre_votants: scrutin.nombre_votants,
              nombre_pours: scrutin.nombre_pours,
              nombre_contres: scrutin.nombre_contres,
              nombre_abstentions: scrutin.nombre_abstentions,
              par_delegation: vote.par_delegation
            }
          })

        if (!error) {
          inserted++
        } else {
          // Check if it's a duplicate key error (vote already exists)
          if (error.code === '23505') {
            skipped++
          } else {
            console.error(`  ⚠️ Failed to insert vote:`, error.message)
          }
        }
      } catch (err) {
        console.error(`  ⚠️ Failed to process vote:`, err)
      }
    }

    console.log(`  ✅ Inserted ${inserted}/${votes.length} votes (${skipped} duplicates skipped)`)
    return inserted
  } catch (err) {
    console.error(`  ❌ Error collecting votes:`, err)
    return 0
  }
}

// Main collection function
async function collectParliamentaryData() {
  console.log('\n🚀 PARLIAMENTARY DATA COLLECTION\n')
  console.log('='.repeat(60))

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('data_collection_jobs')
    .insert({
      job_type: 'nosdeputes_votes',
      status: 'running',
      source: 'https://www.nosdeputes.fr',
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (jobError || !job) {
    throw new Error('Failed to create job record')
  }

  const jobId = job.id

  try {
    // Step 1: Match politicians to deputies
    const matches = await matchPoliticiansToDeputies()

    if (matches.length === 0) {
      throw new Error('No politicians could be matched to API deputies')
    }

    console.log(`\n✅ Proceeding with ${matches.length} matched politicians\n`)

    // Step 2: Collect data for each match
    let totalCollected = 0
    let totalNew = 0

    for (let i = 0; i < matches.length; i++) {
      const { politicianId, deputy } = matches[i]

      console.log(`\n[${i + 1}/${matches.length}] ${deputy.prenom} ${deputy.nom}`)

      // Collect votes
      const votesInserted = await collectVotes(politicianId, deputy, jobId)
      totalCollected += votesInserted
      totalNew += votesInserted

      // Update job progress
      await supabase
        .from('data_collection_jobs')
        .update({
          records_collected: totalCollected,
          records_new: totalNew
        })
        .eq('id', jobId)

      // Rate limiting (1 request per second)
      if (i < matches.length - 1) {
        await sleep(1000)
      }
    }

    // Mark job as completed
    const duration = Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000)
    await supabase
      .from('data_collection_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        records_collected: totalCollected,
        records_new: totalNew
      })
      .eq('id', jobId)

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ COLLECTION COMPLETE!')
    console.log(`   Politicians processed: ${matches.length}`)
    console.log(`   Actions collected: ${totalCollected}`)
    console.log(`   Duration: ${duration}s`)
    console.log('')

  } catch (err) {
    console.error('\n❌ COLLECTION FAILED:', err)

    // Mark job as failed
    await supabase
      .from('data_collection_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        error_count: 1,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    throw err
  }
}

// Run collection
collectParliamentaryData()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
