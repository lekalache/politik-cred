/**
 * Test Improved Matcher - Standalone
 * Test improved matching with all logic in one file
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Keyword expansions
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  energie: ['electricite', 'carburant', 'petrole', 'essence', 'chauffage', 'nucleaire', 'renouvelable', 'facture'],
  tva: ['taxe', 'taxes', 'fiscalite', 'prix', 'tarif', 'cout'],
  emploi: ['travail', 'chomage', 'salarie', 'entreprise', 'embauche', 'licenciement'],
  salaire: ['remuneration', 'smic', 'revenu', 'pouvoir', 'achat', 'augmentation'],
  immigration: ['etranger', 'migrant', 'asile', 'refugie', 'nationalite', 'frontieres', 'expulsion', 'regularisation'],
  voile: ['laicite', 'religion', 'islamique', 'religieux', 'cultuel'],
  securite: ['police', 'gendarmerie', 'delinquance', 'criminalite', 'violence', 'ordre'],
  homicide: ['meurtre', 'assassinat', 'crime', 'violence', 'agression'],
  europeen: ['bruxelles', 'commission', 'union', 'traite', 'reglementation'],
  retraite: ['pension', 'senior', 'vieillesse', 'cotisation'],
}

// Clean vote description
function cleanVoteDescription(description: string): string {
  let cleaned = description.toLowerCase()

  // Remove noise patterns
  cleaned = cleaned.replace(/l['']amendement.*?(?:de|n°)\s+[\w\s]+/gi, ' ')
  cleaned = cleaned.replace(/l['']article\s+\d+\w*/gi, ' ')
  cleaned = cleaned.replace(/en application de.*?Constitution/gi, ' ')
  cleaned = cleaned.replace(/déposée? par.*?(?:et|de)/gi, ' ')
  cleaned = cleaned.replace(/les amendements identiques suivants/gi, ' ')
  cleaned = cleaned.replace(/de suppression/gi, ' ')
  cleaned = cleaned.replace(/la motion de.*?(?:par|du)/gi, ' ')
  cleaned = cleaned.replace(/projet de loi/gi, ' ')
  cleaned = cleaned.replace(/proposition de loi/gi, ' ')
  cleaned = cleaned.replace(/première lecture/gi, ' ')
  cleaned = cleaned.replace(/deuxième lecture/gi, ' ')
  cleaned = cleaned.replace(/troisième lecture/gi, ' ')
  cleaned = cleaned.replace(/texte de la commission/gi, ' ')

  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

// Extract and expand keywords
function extractExpandedKeywords(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

  const words = normalized.split(/\s+/).filter(w => w.length >= 4)

  const stopWords = new Set([
    'dans', 'pour', 'avec', 'sans', 'plus', 'sous', 'tous', 'tout',
    'cette', 'leur', 'leurs', 'fait', 'faire', 'sont', 'etre', 'avoir',
    'elle', 'elles', 'vous', 'nous', 'ils', 'celle', 'ceux', 'comme',
    'peut', 'doit', 'sera', 'ainsi', 'alors', 'entre', 'autres', 'aussi'
  ])

  const baseKeywords = words.filter(w => !stopWords.has(w))

  const expandedKeywords = new Set<string>(baseKeywords)

  for (const keyword of baseKeywords) {
    if (KEYWORD_EXPANSIONS[keyword]) {
      KEYWORD_EXPANSIONS[keyword].forEach(expanded => {
        expandedKeywords.add(expanded)
      })
    }
  }

  return expandedKeywords
}

// Calculate similarity
function calculateSimilarity(
  promiseKeywords: Set<string>,
  voteKeywords: Set<string>,
  cleanedVoteText: string
): number {
  const intersection = new Set([...promiseKeywords].filter(x => voteKeywords.has(x)))
  const union = new Set([...promiseKeywords, ...voteKeywords])

  const jaccardScore = union.size > 0 ? intersection.size / union.size : 0

  let directMatchBoost = 0
  for (const keyword of promiseKeywords) {
    if (cleanedVoteText.includes(keyword)) {
      directMatchBoost += 0.05
    }
  }

  return Math.min(jaccardScore + directMatchBoost, 1)
}

async function testMatcher() {
  console.log('\n🧪 TESTING IMPROVED MATCHER (STANDALONE)\n')
  console.log('='.repeat(60))

  // Find Marine Le Pen
  const { data: mlp } = await supabase
    .from('politicians')
    .select('id, name')
    .ilike('name', '%Marine Le Pen%')
    .single()

  console.log(`Politician: ${mlp?.name}`)

  // Get promises
  const { data: promises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('politician_id', mlp!.id)
    .eq('verification_status', 'pending')

  console.log(`Promises: ${promises?.length || 0}`)

  // Get votes
  const { data: votes } = await supabase
    .from('parliamentary_actions')
    .select('*')
    .eq('politician_id', mlp!.id)
    .eq('action_type', 'vote')

  console.log(`Votes: ${votes?.length || 0}\n`)

  if (!promises || !votes) {
    console.log('Missing data')
    return
  }

  const matches: any[] = []

  for (const promise of promises) {
    console.log(`📌 ${promise.promise_text.substring(0, 60)}...`)

    const promiseKeywords = extractExpandedKeywords(promise.promise_text)
    console.log(`   Keywords (${promiseKeywords.size}): ${[...promiseKeywords].slice(0, 10).join(', ')}`)

    let bestMatch: any = null
    let bestScore = 0

    for (const vote of votes) {
      const cleanedVote = cleanVoteDescription(vote.description || '')
      const voteKeywords = extractExpandedKeywords(cleanedVote)

      const similarity = calculateSimilarity(
        promiseKeywords,
        voteKeywords,
        cleanedVote
      )

      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = vote
      }
    }

    console.log(`   Best match: ${(bestScore * 100).toFixed(1)}%`)

    if (bestMatch && bestScore >= 0.08) {
      console.log(`   ✅ MATCH FOUND!`)
      console.log(`      Vote: ${bestMatch.description.substring(0, 80)}...`)
      console.log(`      Position: ${bestMatch.vote_position}`)

      matches.push({
        promise,
        vote: bestMatch,
        similarity: bestScore
      })
    } else {
      console.log(`   ⚠️ No match (threshold: 8%)`)
    }

    console.log('')
  }

  console.log('='.repeat(60))
  console.log(`\n✅ TOTAL MATCHES: ${matches.length}`)

  if (matches.length > 0) {
    console.log('\nTop matches:')
    matches.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. ${(m.similarity * 100).toFixed(1)}% - ${m.promise.promise_text.substring(0, 60)}...`)
    })
  }

  console.log('')
}

testMatcher()
  .then(() => {
    console.log('✅ Test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
