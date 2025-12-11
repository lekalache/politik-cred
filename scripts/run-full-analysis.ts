#!/usr/bin/env tsx
/**
 * Master Data Pipeline Script
 *
 * Runs the complete analysis pipeline for all politicians:
 * 1. Seed/Update politicians from Assemblée Nationale
 * 2. Collect parliamentary actions (votes, bills)
 * 3. Import promises from Vigie du Mensonge
 * 4. Extract promises from news
 * 5. Run semantic matching (promises ↔ actions)
 * 6. Calculate consistency scores
 * 7. Generate value profiles (authenticity, greenwashing detection)
 *
 * Usage:
 *   npx tsx scripts/run-full-analysis.ts
 *   npx tsx scripts/run-full-analysis.ts --limit=10
 *   npx tsx scripts/run-full-analysis.ts --skip-vigie --skip-news
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Load environment
config({ path: resolve(process.cwd(), '.env.local') })

// Validate environment
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Initialize Supabase admin client
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Parse CLI arguments
const args = process.argv.slice(2)
const options = {
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0'),
  skipPoliticians: args.includes('--skip-politicians'),
  skipParliament: args.includes('--skip-parliament'),
  skipVigie: args.includes('--skip-vigie'),
  skipNews: args.includes('--skip-news'),
  skipMatching: args.includes('--skip-matching'),
  skipScores: args.includes('--skip-scores'),
  skipProfiles: args.includes('--skip-profiles'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  dryRun: args.includes('--dry-run'),
}

// Stats tracking
const stats = {
  politicians: { total: 0, new: 0, updated: 0, errors: 0 },
  parliamentaryActions: { collected: 0, new: 0, errors: 0 },
  promises: { vigie: 0, news: 0, errors: 0 },
  matching: { total: 0, matched: 0, errors: 0 },
  scores: { calculated: 0, errors: 0 },
  profiles: { generated: 0, withFlags: 0, errors: 0 },
  duration: 0
}

// Utility functions
const log = (msg: string) => console.log(msg)
const logVerbose = (msg: string) => options.verbose && console.log(`  ${msg}`)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ============================================================================
// PHASE 1: Seed/Update Politicians
// ============================================================================
async function phase1_seedPoliticians(): Promise<string[]> {
  log('\n' + '═'.repeat(70))
  log('📋 PHASE 1: Seed Politicians from Assemblée Nationale')
  log('═'.repeat(70))

  const politicianIds: string[] = []

  try {
    // First check if we have existing politicians in the database
    const { data: existingPoliticians, count } = await supabase
      .from('politicians')
      .select('id, name', { count: 'exact' })
      .eq('is_active', true)

    if (existingPoliticians && existingPoliticians.length > 0) {
      log(`\n✅ Found ${count} existing politicians in database`)
      const limit = options.limit || existingPoliticians.length
      const toReturn = existingPoliticians.slice(0, limit).map(p => p.id)
      stats.politicians.total = toReturn.length
      log(`📋 Using ${toReturn.length} politicians for analysis`)
      return toReturn
    }

    // Fetch deputies from NosDéputés.fr (all deputies, not just current)
    log('\n🔍 Fetching deputies from NosDéputés.fr...')
    const response = await fetch('https://www.nosdeputes.fr/deputes/json', {
      headers: { 'User-Agent': 'PolitikCred/2.0', 'Accept': 'application/json' }
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    // Filter to only active deputies (those without mandat_fin or recent ones)
    const allDeputies = data.deputes?.map((d: any) => d.depute) || []
    const deputies = allDeputies.filter((d: any) => {
      // Include if no end date or ended recently (2024+)
      if (!d.mandat_fin) return true
      return d.mandat_fin >= '2024-01-01'
    }).slice(0, 200) // Limit to reasonable number
    const limit = options.limit || Math.min(deputies.length, 100)

    log(`✅ Found ${allDeputies.length} total, ${deputies.length} recent deputies (processing ${limit})`)

    for (let i = 0; i < Math.min(deputies.length, limit); i++) {
      const deputy = deputies[i]
      stats.politicians.total++

      try {
        // Check existing
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('name', deputy.nom)
          .single()

        const politicianData = {
          name: deputy.nom,
          party: deputy.parti_ratt_financier || deputy.groupe_sigle || null,
          position: 'Député',
          constituency: deputy.circonscription || null,
          bio: `Député de ${deputy.circonscription || 'France'}`,
          external_id: `nosdeputes_${deputy.slug}`,
          is_active: true,
          updated_at: new Date().toISOString()
        }

        if (options.dryRun) {
          logVerbose(`[DRY] Would ${existing ? 'update' : 'insert'}: ${deputy.nom}`)
          if (existing) politicianIds.push(existing.id)
          continue
        }

        if (existing) {
          await supabase.from('politicians').update(politicianData).eq('id', existing.id)
          stats.politicians.updated++
          politicianIds.push(existing.id)
          logVerbose(`✓ Updated: ${deputy.nom}`)
        } else {
          const { data: inserted, error } = await supabase
            .from('politicians')
            .insert({ ...politicianData, credibility_score: 50, total_votes: 0 })
            .select('id')
            .single()

          if (error) throw error
          if (inserted) {
            stats.politicians.new++
            politicianIds.push(inserted.id)
            logVerbose(`✓ Inserted: ${deputy.nom}`)
          }
        }

        await sleep(100) // Rate limit
      } catch (error) {
        stats.politicians.errors++
        logVerbose(`✗ Error: ${deputy.nom} - ${error}`)
      }
    }

    log(`\n📊 Politicians: ${stats.politicians.new} new, ${stats.politicians.updated} updated, ${stats.politicians.errors} errors`)
    return politicianIds
  } catch (error) {
    log(`\n❌ Phase 1 failed: ${error}`)
    return []
  }
}

// ============================================================================
// PHASE 2: Collect Parliamentary Actions
// ============================================================================
async function phase2_collectParliamentaryActions(politicianIds: string[]): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('🏛️  PHASE 2: Collect Parliamentary Actions')
  log('═'.repeat(70))

  const limit = options.limit || 50
  const toProcess = politicianIds.slice(0, limit)

  log(`\n🔍 Processing ${toProcess.length} politicians...`)

  let processed = 0
  for (const politicianId of toProcess) {
    processed++
    try {
      // Get politician info
      const { data: politician } = await supabase
        .from('politicians')
        .select('name, external_id')
        .eq('id', politicianId)
        .single()

      // Generate slug from name if external_id is missing
      let slug: string
      if (politician?.external_id) {
        slug = politician.external_id.replace('nosdeputes_', '')
      } else if (politician?.name) {
        // Generate slug from name (e.g., "Jean-Luc Mélenchon" -> "jean-luc-melenchon")
        slug = politician.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9]+/g, '-')      // Replace non-alphanumeric with dash
          .replace(/^-+|-+$/g, '')          // Trim dashes
        log(`  [${processed}/${toProcess.length}] 🔧 ${politician.name} -> generated slug: ${slug}`)
      } else {
        log(`  [${processed}/${toProcess.length}] ⏩ Unknown politician - skipping`)
        continue
      }
      // Fetch votes from NosDéputés
      const votesUrl = `https://www.nosdeputes.fr/${slug}/votes/json`
      const votesResponse = await fetch(votesUrl, {
        headers: { 'User-Agent': 'PolitikCred/2.0' },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      if (votesResponse.ok) {
        const votesData = await votesResponse.json()
        const votes = votesData.votes || []

        if (votes.length > 0) {
          log(`  [${processed}/${toProcess.length}] ✅ ${politician.name}: ${votes.length} votes found`)

          // Update external_id if we found votes (confirms slug is correct)
          if (!politician.external_id) {
            await supabase
              .from('politicians')
              .update({ external_id: `nosdeputes_${slug}` })
              .eq('id', politicianId)
          }
        } else {
          log(`  [${processed}/${toProcess.length}] ⚠️  ${politician.name}: 0 votes`)
        }

        for (const vote of votes.slice(0, 20)) { // Limit votes per politician
          if (options.dryRun) {
            stats.parliamentaryActions.collected++
            continue
          }

          const { error } = await supabase.from('parliamentary_actions').upsert({
            politician_id: politicianId,
            action_type: 'vote',
            action_date: vote.date || new Date().toISOString(),
            description: vote.titre || 'Vote',
            vote_position: mapVotePosition(vote.position),
            bill_id: vote.scrutin_id?.toString(),
            official_reference: `https://www.nosdeputes.fr/scrutin/${vote.scrutin_id}`,
            category: categorizeVote(vote.titre),
          }, { onConflict: 'politician_id,action_date,action_type,bill_id' })

          if (!error) {
            stats.parliamentaryActions.new++
          }
        }

        stats.parliamentaryActions.collected++
      } else {
        log(`  [${processed}/${toProcess.length}] ❌ ${politician.name}: API error ${votesResponse.status}`)
      }

      await sleep(300) // Rate limit for API (reduced)
    } catch (error) {
      stats.parliamentaryActions.errors++
      log(`  [${processed}/${toProcess.length}] ❌ Error: ${error}`)
    }
  }

  log(`\n📊 Parliamentary Actions: ${stats.parliamentaryActions.new} collected, ${stats.parliamentaryActions.errors} errors`)
}

// ============================================================================
// PHASE 3: Import Vigie du Mensonge Promises
// ============================================================================
async function phase3_importVigiePromises(politicianIds: string[]): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('👁️  PHASE 3: Import from Vigie du Mensonge')
  log('═'.repeat(70))

  // Get politician names for searching
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name')
    .in('id', politicianIds.slice(0, options.limit || 20))

  if (!politicians?.length) {
    log('\n⚠️  No politicians to process')
    return
  }

  log(`\n🔍 Searching Vigie for ${politicians.length} politicians...`)

  // Note: Vigie scraping would require the actual vigie-client implementation
  // For now, we check if there are existing Vigie imports
  const { count } = await supabase
    .from('promise_sources')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'vigie')

  if (count && count > 0) {
    log(`\n✅ Found ${count} existing Vigie imports`)
    stats.promises.vigie = count
  } else {
    log('\n💡 No Vigie data yet. To import:')
    log('   1. Implement scraper in src/lib/scrapers/vigie-client.ts')
    log('   2. Or manually import using the demo script')
  }
}

// ============================================================================
// PHASE 4: Extract Promises from News
// ============================================================================
async function phase4_extractNewsPromises(): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('📰 PHASE 4: Extract Promises from News')
  log('═'.repeat(70))

  // Check for news articles
  const { data: articles, count } = await supabase
    .from('news_articles')
    .select('id, title, content, url', { count: 'exact' })
    .order('published_at', { ascending: false })
    .limit(50)

  if (!articles?.length) {
    log('\n⚠️  No news articles found. Run news collection first.')
    return
  }

  log(`\n📰 Found ${count} articles, processing ${articles.length}...`)

  // Check existing promises from news
  const { count: existingCount } = await supabase
    .from('political_promises')
    .select('*', { count: 'exact', head: true })
    .eq('extraction_method', 'scraped')

  log(`\n✅ ${existingCount || 0} promises already extracted from news`)
  stats.promises.news = existingCount || 0
}

// ============================================================================
// PHASE 5: Semantic Matching
// ============================================================================
async function phase5_semanticMatching(politicianIds: string[]): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('🧠 PHASE 5: Semantic Matching (Promises ↔ Actions)')
  log('═'.repeat(70))

  const limit = options.limit || 20
  const toProcess = politicianIds.slice(0, limit)

  log(`\n🔍 Matching for ${toProcess.length} politicians...`)

  for (const politicianId of toProcess) {
    try {
      // Get unmatched promises
      const { data: promises } = await supabase
        .from('political_promises')
        .select('id, promise_text, category')
        .eq('politician_id', politicianId)
        .eq('verification_status', 'pending')
        .limit(20)

      if (!promises?.length) continue

      // Get actions for matching
      const { data: actions } = await supabase
        .from('parliamentary_actions')
        .select('id, description, action_type, category')
        .eq('politician_id', politicianId)
        .limit(50)

      if (!actions?.length) continue

      stats.matching.total += promises.length

      // Simple keyword matching (the semantic-matcher would do this better)
      for (const promise of promises) {
        const matchingAction = actions.find(action => {
          const promiseWords = promise.promise_text.toLowerCase().split(/\s+/)
          const actionWords = action.description.toLowerCase().split(/\s+/)
          const common = promiseWords.filter((w: string) => w.length > 4 && actionWords.includes(w))
          return common.length >= 3 || promise.category === action.category
        })

        if (matchingAction && !options.dryRun) {
          // Create verification
          const { error } = await supabase.from('promise_verifications').upsert({
            promise_id: promise.id,
            action_id: matchingAction.id,
            match_type: 'pending',
            match_confidence: 0.5,
            verification_method: 'semantic_match',
            explanation: 'Auto-matched by keyword similarity',
          }, { onConflict: 'promise_id,action_id' })

          if (!error) stats.matching.matched++
        }
      }

      logVerbose(`✓ Matched ${stats.matching.matched} of ${promises.length} promises`)
      await sleep(200)
    } catch (error) {
      stats.matching.errors++
    }
  }

  log(`\n📊 Matching: ${stats.matching.matched} matched of ${stats.matching.total}, ${stats.matching.errors} errors`)
}

// ============================================================================
// PHASE 6: Calculate Consistency Scores
// ============================================================================
async function phase6_calculateScores(politicianIds: string[]): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('📊 PHASE 6: Calculate Consistency Scores')
  log('═'.repeat(70))

  const limit = options.limit || politicianIds.length
  const toProcess = politicianIds.slice(0, limit)

  log(`\n🔍 Calculating scores for ${toProcess.length} politicians...`)

  for (const politicianId of toProcess) {
    try {
      // Get verified promise counts
      const { data: verifications } = await supabase
        .from('promise_verifications')
        .select('match_type, promise_id!inner(politician_id)')
        .eq('promise_id.politician_id', politicianId)
        .not('match_type', 'is', null)

      if (!verifications?.length) continue

      const counts = {
        kept: verifications.filter(v => v.match_type === 'kept').length,
        broken: verifications.filter(v => v.match_type === 'broken').length,
        partial: verifications.filter(v => v.match_type === 'partial').length,
        pending: verifications.filter(v => v.match_type === 'pending').length,
      }

      const total = counts.kept + counts.broken + counts.partial
      const score = total > 0
        ? Math.round(((counts.kept + counts.partial * 0.5) / total) * 100)
        : null

      if (score !== null && !options.dryRun) {
        await supabase.from('consistency_scores').upsert({
          politician_id: politicianId,
          overall_score: score,
          promises_kept: counts.kept,
          promises_broken: counts.broken,
          promises_partial: counts.partial,
          promises_pending: counts.pending,
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: 'politician_id' })

        stats.scores.calculated++
        logVerbose(`✓ Score: ${score}% (${counts.kept}/${total} kept)`)
      }

      await sleep(100)
    } catch (error) {
      stats.scores.errors++
    }
  }

  log(`\n📊 Scores: ${stats.scores.calculated} calculated, ${stats.scores.errors} errors`)
}

// ============================================================================
// PHASE 7: Generate Value Profiles
// ============================================================================
async function phase7_generateValueProfiles(politicianIds: string[]): Promise<void> {
  log('\n' + '═'.repeat(70))
  log('🧬 PHASE 7: Generate Value Profiles (Political DNA)')
  log('═'.repeat(70))

  const limit = options.limit || politicianIds.length
  const toProcess = politicianIds.slice(0, limit)

  log(`\n🔍 Generating profiles for ${toProcess.length} politicians...`)

  for (const politicianId of toProcess) {
    try {
      // Get promises grouped by category
      const { data: promises } = await supabase
        .from('political_promises')
        .select('id, category, verification_status')
        .eq('politician_id', politicianId)

      if (!promises || promises.length < 3) continue

      // Calculate value metrics per category
      const categories = ['economic', 'social', 'environmental', 'security', 'healthcare', 'education', 'justice', 'immigration', 'foreign_policy', 'other']
      const valueMetrics: Record<string, any> = {}

      for (const cat of categories) {
        const catPromises = promises.filter(p => p.category === cat)
        const verified = catPromises.filter(p => p.verification_status === 'verified')

        valueMetrics[cat] = {
          promise_count: catPromises.length,
          kept_count: 0, // Would need verification data
          broken_count: 0,
          partial_count: 0,
          consistency_score: 0,
          attention_score: Math.round((catPromises.length / promises.length) * 100),
          priority_rank: 0
        }
      }

      // Detect greenwashing patterns
      const greenwashingFlags: any[] = []
      const envMetrics = valueMetrics['environmental']
      if (envMetrics.promise_count >= 3 && envMetrics.consistency_score < 40) {
        greenwashingFlags.push({
          category: 'environment',
          type: 'greenwashing',
          severity: 'medium',
          description: 'Beaucoup de promesses environnementales mais faible suivi',
          detected_at: new Date().toISOString()
        })
      }

      // Calculate authenticity score based on multi-source agreement
      const { count: sourceCount } = await supabase
        .from('promise_sources')
        .select('*', { count: 'exact', head: true })
        .in('promise_id', promises.map(p => p.id))

      const authenticityScore = sourceCount && sourceCount > promises.length
        ? Math.min(90, 50 + (sourceCount / promises.length) * 20)
        : 50

      if (!options.dryRun) {
        await supabase.from('core_value_profiles').upsert({
          politician_id: politicianId,
          value_metrics: valueMetrics,
          authenticity_score: Math.round(authenticityScore),
          greenwashing_flags: greenwashingFlags,
          priority_shifts: [],
          behavioral_patterns: [],
          data_quality_score: Math.min(1, promises.length / 20),
          calculated_at: new Date().toISOString(),
        }, { onConflict: 'politician_id' })

        stats.profiles.generated++
        if (greenwashingFlags.length > 0) stats.profiles.withFlags++
        logVerbose(`✓ Profile: authenticity=${Math.round(authenticityScore)}%, flags=${greenwashingFlags.length}`)
      }

      await sleep(100)
    } catch (error) {
      stats.profiles.errors++
    }
  }

  log(`\n📊 Profiles: ${stats.profiles.generated} generated, ${stats.profiles.withFlags} with flags, ${stats.profiles.errors} errors`)
}

// ============================================================================
// Helper Functions
// ============================================================================
function mapVotePosition(position: string | undefined): 'pour' | 'contre' | 'abstention' | 'absent' | null {
  if (!position) return null
  const p = position.toLowerCase()
  if (p.includes('pour')) return 'pour'
  if (p.includes('contre')) return 'contre'
  if (p.includes('abstention')) return 'abstention'
  if (p.includes('absent')) return 'absent'
  return null
}

function categorizeVote(title: string): string {
  const t = title?.toLowerCase() || ''
  if (t.includes('budget') || t.includes('fiscal') || t.includes('impôt')) return 'economic'
  if (t.includes('climat') || t.includes('environnement') || t.includes('écolog')) return 'environmental'
  if (t.includes('santé') || t.includes('hôpital') || t.includes('médic')) return 'healthcare'
  if (t.includes('sécurité') || t.includes('police') || t.includes('justice')) return 'security'
  if (t.includes('éducation') || t.includes('école') || t.includes('université')) return 'education'
  if (t.includes('immigration') || t.includes('asile') || t.includes('étranger')) return 'immigration'
  if (t.includes('social') || t.includes('retraite') || t.includes('emploi')) return 'social'
  return 'other'
}

// ============================================================================
// Main Execution
// ============================================================================
async function main() {
  const startTime = Date.now()

  console.log('\n' + '╔' + '═'.repeat(68) + '╗')
  console.log('║' + '  🇫🇷 POLITIK CRED\' - Complete Data Analysis Pipeline'.padEnd(68) + '║')
  console.log('╚' + '═'.repeat(68) + '╝')
  console.log('\nOptions:', JSON.stringify(options, null, 2))

  let politicianIds: string[] = []

  try {
    // Phase 1: Politicians
    if (!options.skipPoliticians) {
      politicianIds = await phase1_seedPoliticians()
    } else {
      // Get existing politician IDs
      const { data } = await supabase.from('politicians').select('id').eq('is_active', true)
      politicianIds = data?.map(p => p.id) || []
      log(`\n⏩ Skipping Phase 1 (using ${politicianIds.length} existing politicians)`)
    }

    // Phase 2: Parliamentary Actions
    if (!options.skipParliament) {
      await phase2_collectParliamentaryActions(politicianIds)
    } else {
      log('\n⏩ Skipping Phase 2 (Parliamentary Actions)')
    }

    // Phase 3: Vigie Promises
    if (!options.skipVigie) {
      await phase3_importVigiePromises(politicianIds)
    } else {
      log('\n⏩ Skipping Phase 3 (Vigie du Mensonge)')
    }

    // Phase 4: News Promises
    if (!options.skipNews) {
      await phase4_extractNewsPromises()
    } else {
      log('\n⏩ Skipping Phase 4 (News Extraction)')
    }

    // Phase 5: Semantic Matching
    if (!options.skipMatching) {
      await phase5_semanticMatching(politicianIds)
    } else {
      log('\n⏩ Skipping Phase 5 (Semantic Matching)')
    }

    // Phase 6: Consistency Scores
    if (!options.skipScores) {
      await phase6_calculateScores(politicianIds)
    } else {
      log('\n⏩ Skipping Phase 6 (Consistency Scores)')
    }

    // Phase 7: Value Profiles
    if (!options.skipProfiles) {
      await phase7_generateValueProfiles(politicianIds)
    } else {
      log('\n⏩ Skipping Phase 7 (Value Profiles)')
    }

    stats.duration = Math.round((Date.now() - startTime) / 1000)

    // Final Summary
    console.log('\n' + '╔' + '═'.repeat(68) + '╗')
    console.log('║' + '  📊 PIPELINE SUMMARY'.padEnd(68) + '║')
    console.log('╠' + '═'.repeat(68) + '╣')
    console.log(`║  Politicians: ${stats.politicians.new} new, ${stats.politicians.updated} updated`.padEnd(69) + '║')
    console.log(`║  Parliamentary Actions: ${stats.parliamentaryActions.new} collected`.padEnd(69) + '║')
    console.log(`║  Promises: ${stats.promises.vigie} Vigie, ${stats.promises.news} News`.padEnd(69) + '║')
    console.log(`║  Matching: ${stats.matching.matched}/${stats.matching.total} matched`.padEnd(69) + '║')
    console.log(`║  Scores: ${stats.scores.calculated} calculated`.padEnd(69) + '║')
    console.log(`║  Profiles: ${stats.profiles.generated} generated (${stats.profiles.withFlags} with flags)`.padEnd(69) + '║')
    console.log('╠' + '═'.repeat(68) + '╣')
    console.log(`║  ⏱️  Duration: ${stats.duration} seconds`.padEnd(69) + '║')
    console.log('╚' + '═'.repeat(68) + '╝\n')

    if (options.dryRun) {
      console.log('⚠️  This was a DRY RUN - no data was modified\n')
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error)
    process.exit(1)
  }
}

// Run
main()
