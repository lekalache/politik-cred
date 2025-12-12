/**
 * Fast Assemblée Nationale data collection
 * Optimized version: pre-loads all politicians, uses batch inserts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readdirSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import AdmZip from 'adm-zip'

// Database client
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Legislature 17 URLs
const LEGISLATURE = '17'
const BASE_URL = 'https://data.assemblee-nationale.fr'
const SCRUTINS_URL = `${BASE_URL}/static/openData/repository/${LEGISLATURE}/loi/scrutins/Scrutins.json.zip`
const DEPUTIES_URL = `${BASE_URL}/static/openData/repository/${LEGISLATURE}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`

// Caches
const deputiesCache = new Map<string, { prenom: string; nom: string }>()
const politicianCache = new Map<string, string>() // normalized name -> politician_id

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
}

async function downloadAndExtract(url: string, prefix: string): Promise<string> {
  const tempDir = join(tmpdir(), `an-fast-${prefix}-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  console.log(`📥 Downloading ${prefix}...`)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PolitikCred/1.0' }
  })

  if (!response.ok) throw new Error(`Download failed: ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  console.log(`📦 Extracting ${prefix} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)...`)

  const zip = new AdmZip(buffer)
  zip.extractAllTo(tempDir, true)

  return tempDir
}

async function loadDeputies(): Promise<number> {
  const tempDir = await downloadAndExtract(DEPUTIES_URL, 'deputies')

  try {
    const acteurDir = join(tempDir, 'json', 'acteur')
    const targetDir = existsSync(acteurDir) ? acteurDir : join(tempDir, 'json')

    const files = readdirSync(targetDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const content = readFileSync(join(targetDir, file), 'utf-8')
        const data = JSON.parse(content)
        const acteur = data.acteur
        if (!acteur) continue

        const uid = typeof acteur.uid === 'object' ? acteur.uid['#text'] : acteur.uid
        const prenom = acteur.etatCivil?.ident?.prenom || ''
        const nom = acteur.etatCivil?.ident?.nom || ''

        if (uid && (prenom || nom)) {
          deputiesCache.set(uid, { prenom, nom })
        }
      } catch (e) { }
    }

    console.log(`✅ Loaded ${deputiesCache.size} deputies`)
    return deputiesCache.size
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

async function loadPoliticians(): Promise<number> {
  console.log('👥 Loading politicians from database...')

  const { data: politicians, error } = await db
    .from('politicians')
    .select('id, name, first_name, last_name, metadata')

  if (error) throw error

  for (const p of politicians || []) {
    // Index by existing acteurRef if present
    if (p.metadata?.acteurRef) {
      politicianCache.set(`ref:${p.metadata.acteurRef}`, p.id)
    }

    // Index by normalized full name
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    if (fullName) {
      politicianCache.set(normalizeName(fullName), p.id)
    }

    // Also index by just last name for fuzzy matching
    if (p.last_name) {
      const key = `last:${normalizeName(p.last_name)}`
      if (!politicianCache.has(key)) {
        politicianCache.set(key, p.id)
      }
    }

    // Index by name field too
    if (p.name) {
      politicianCache.set(normalizeName(p.name), p.id)
    }
  }

  console.log(`✅ Loaded ${politicians?.length || 0} politicians into cache`)
  return politicians?.length || 0
}

function findPoliticianId(acteurRef: string): string | null {
  // Check by acteurRef first
  const byRef = politicianCache.get(`ref:${acteurRef}`)
  if (byRef) return byRef

  // Get deputy info
  const deputy = deputiesCache.get(acteurRef)
  if (!deputy) return null

  const { prenom, nom } = deputy
  const fullName = normalizeName(`${prenom} ${nom}`)

  // Try full name match
  const byName = politicianCache.get(fullName)
  if (byName) return byName

  // Try last name only
  const byLast = politicianCache.get(`last:${normalizeName(nom)}`)
  if (byLast) return byLast

  return null
}

function extractVotes(scrutinData: any): Array<{ acteurRef: string; position: string }> {
  const scrutin = scrutinData.scrutin || scrutinData
  const votes: Array<{ acteurRef: string; position: string }> = []

  const groupes = scrutin?.ventilationVotes?.organe?.groupes?.groupe || []
  const groupeArray = Array.isArray(groupes) ? groupes : [groupes]

  for (const groupe of groupeArray) {
    if (!groupe?.vote?.decompteNominatif) continue
    const decompte = groupe.vote.decompteNominatif

    const positions = [
      { key: 'pours', pos: 'pour' },
      { key: 'contres', pos: 'contre' },
      { key: 'abstentions', pos: 'abstention' },
      { key: 'nonVotants', pos: 'absent' }  // Map nonVotant to valid 'absent'
    ]

    for (const { key, pos } of positions) {
      const votant = decompte[key]?.votant
      if (!votant) continue

      const votants = Array.isArray(votant) ? votant : [votant]
      for (const v of votants) {
        if (v?.acteurRef) {
          votes.push({ acteurRef: v.acteurRef, position: pos })
        }
      }
    }
  }

  return votes
}

function categorize(text: string): string {
  const lower = (text || '').toLowerCase()
  if (lower.includes('budget') || lower.includes('financ')) return 'economic'
  if (lower.includes('santé') || lower.includes('hôpital')) return 'healthcare'
  if (lower.includes('écolog') || lower.includes('climat')) return 'environmental'
  if (lower.includes('sécurité') || lower.includes('police')) return 'security'
  if (lower.includes('éducation') || lower.includes('école')) return 'education'
  if (lower.includes('social') || lower.includes('retraite')) return 'social'
  if (lower.includes('justice')) return 'justice'
  if (lower.includes('immigration')) return 'immigration'
  return 'other'
}

async function main() {
  console.log('🚀 Fast Assemblée Nationale data collection\n')

  const startTime = Date.now()

  // Step 1: Load deputies
  await loadDeputies()

  // Step 2: Load politicians
  await loadPoliticians()

  // Step 3: Process scrutins with batching
  console.log('\n📊 Processing scrutins...')

  const tempDir = await downloadAndExtract(SCRUTINS_URL, 'scrutins')

  try {
    const jsonDir = join(tempDir, 'json')
    const files = readdirSync(jsonDir).filter(f => f.endsWith('.json'))

    console.log(`   Found ${files.length} scrutins to process`)

    let totalVotes = 0
    let matchedVotes = 0
    let processedScrutins = 0
    let batch: any[] = []
    const BATCH_SIZE = 500

    const matchedActeurs = new Set<string>()
    const unmatchedActeurs = new Set<string>()

    for (const file of files) {
      try {
        const content = readFileSync(join(jsonDir, file), 'utf-8')
        const data = JSON.parse(content)
        const scrutin = data.scrutin || data

        const numero = scrutin.numero
        const dateScrutin = scrutin.dateScrutin
        const titre = scrutin.titre || scrutin.objet?.libelle || ''

        if (!numero || !dateScrutin) continue

        const votes = extractVotes(data)
        totalVotes += votes.length

        for (const vote of votes) {
          const politicianId = findPoliticianId(vote.acteurRef)

          if (politicianId) {
            matchedActeurs.add(vote.acteurRef)
            matchedVotes++

            batch.push({
              politician_id: politicianId,
              action_type: 'vote',
              action_date: new Date(dateScrutin).toISOString(),
              description: titre.substring(0, 500),
              vote_position: vote.position,
              bill_id: `L${LEGISLATURE}-${numero}`,
              official_reference: `https://www.assemblee-nationale.fr/dyn/${LEGISLATURE}/scrutins/${String(numero).padStart(4, '0')}`,
              category: categorize(titre),
              metadata: { source: 'data.assemblee-nationale.fr', legislature: LEGISLATURE, scrutin_numero: numero }
            })

            // Batch insert
            if (batch.length >= BATCH_SIZE) {
              const { error } = await db
                .from('parliamentary_actions')
                .insert(batch)
                .select('id')

              if (error && !error.message.includes('duplicate')) {
                console.error('Batch insert error:', error.message)
              }
              batch = []
            }
          } else {
            unmatchedActeurs.add(vote.acteurRef)
          }
        }

        processedScrutins++

        if (processedScrutins % 500 === 0) {
          console.log(`   Progress: ${processedScrutins}/${files.length} scrutins, ${matchedVotes} votes matched`)
        }
      } catch (e) { }
    }

    // Final batch
    if (batch.length > 0) {
      await db.from('parliamentary_actions').insert(batch)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('\n📊 Collection complete!')
    console.log(`   Time: ${elapsed}s`)
    console.log(`   Scrutins processed: ${processedScrutins}`)
    console.log(`   Total votes found: ${totalVotes}`)
    console.log(`   Votes matched & stored: ${matchedVotes}`)
    console.log(`   Unique deputies matched: ${matchedActeurs.size}`)
    console.log(`   Unique deputies unmatched: ${unmatchedActeurs.size}`)

    // Show sample of unmatched
    if (unmatchedActeurs.size > 0) {
      console.log('\n⚠️ Sample unmatched deputies:')
      let count = 0
      for (const ref of unmatchedActeurs) {
        const deputy = deputiesCache.get(ref)
        if (deputy && count < 5) {
          console.log(`   - ${deputy.prenom} ${deputy.nom}`)
          count++
        }
      }
    }

  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch(console.error)
