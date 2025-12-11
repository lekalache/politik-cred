/**
 * Deploy Improved Matcher
 * Store matches, run on all politicians, and fine-tune threshold
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

function cleanVoteDescription(description: string): string {
  let cleaned = description.toLowerCase()
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
  return cleaned.replace(/\s+/g, ' ').trim()
}

function extractExpandedKeywords(text: string): Set<string> {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ')
  const words = normalized.split(/\s+/).filter(w => w.length >= 4)
  const stopWords = new Set(['dans', 'pour', 'avec', 'sans', 'plus', 'sous', 'tous', 'tout', 'cette', 'leur', 'leurs', 'fait', 'faire', 'sont', 'etre', 'avoir', 'elle', 'elles', 'vous', 'nous', 'ils', 'celle', 'ceux', 'comme', 'peut', 'doit', 'sera', 'ainsi', 'alors', 'entre', 'autres', 'aussi'])
  const baseKeywords = words.filter(w => !stopWords.has(w))
  const expandedKeywords = new Set<string>(baseKeywords)
  for (const keyword of baseKeywords) {
    if (KEYWORD_EXPANSIONS[keyword]) {
      KEYWORD_EXPANSIONS[keyword].forEach(expanded => expandedKeywords.add(expanded))
    }
  }
  return expandedKeywords
}

function calculateSimilarity(promiseKeywords: Set<string>, voteKeywords: Set<string>, cleanedVoteText: string): number {
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

function determineMatchType(promiseText: string, votePosition: string, voteDescription: string): 'kept' | 'broken' | 'partial' {
  const promiseLower = promiseText.toLowerCase()
  const voteLower = voteDescription.toLowerCase()

  const isPositivePromise = /promet|engage|va\s|fera|veut|augment|creer|construire|renforc|défend|proteg/i.test(promiseLower)
  const isNegativePromise = /refus|oppose|contre|interdi|supprimer|abolir|réduire|empêch|bloqu|stopp/i.test(promiseLower)

  const isMotionCensure = /motion.*censure/i.test(voteLower)
  const isAmendementSuppression = /suppression/i.test(voteLower)
  const isMotionRejet = /motion.*rejet/i.test(voteLower)

  if (isMotionCensure || isMotionRejet) {
    if (votePosition === 'pour') {
      return isNegativePromise ? 'kept' : 'broken'
    } else {
      return isPositivePromise ? 'kept' : 'broken'
    }
  }

  if (isAmendementSuppression) {
    if (votePosition === 'pour') {
      return isNegativePromise ? 'kept' : 'broken'
    } else {
      return isPositivePromise ? 'kept' : 'broken'
    }
  }

  if (votePosition === 'pour') {
    return isPositivePromise ? 'kept' : 'broken'
  } else if (votePosition === 'contre') {
    return isNegativePromise ? 'kept' : 'broken'
  }

  return 'partial'
}

async function matchPolitician(politicianId: string, politicianName: string, threshold: number) {
  const { data: promises } = await supabase
    .from('political_promises')
    .select('*')
    .eq('politician_id', politicianId)
    .eq('verification_status', 'pending')

  if (!promises || promises.length === 0) return { matches: 0, stored: 0 }

  const { data: votes } = await supabase
    .from('parliamentary_actions')
    .select('*')
    .eq('politician_id', politicianId)
    .eq('action_type', 'vote')

  if (!votes || votes.length === 0) return { matches: 0, stored: 0 }

  console.log(`\n👤 ${politicianName}`)
  console.log(`   Promises: ${promises.length}, Votes: ${votes.length}`)

  let matches = 0
  let stored = 0

  for (const promise of promises) {
    const promiseKeywords = extractExpandedKeywords(promise.promise_text)
    let bestMatch: any = null
    let bestScore = 0

    for (const vote of votes) {
      const cleanedVote = cleanVoteDescription(vote.description || '')
      const voteKeywords = extractExpandedKeywords(cleanedVote)
      const similarity = calculateSimilarity(promiseKeywords, voteKeywords, cleanedVote)

      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = vote
      }
    }

    if (bestMatch && bestScore >= threshold) {
      matches++
      const matchType = determineMatchType(promise.promise_text, bestMatch.vote_position, bestMatch.description)

      console.log(`   ✅ ${(bestScore * 100).toFixed(1)}% - ${matchType.toUpperCase()}`)
      console.log(`      "${promise.promise_text.substring(0, 60)}..."`)

      const { error } = await supabase.from('promise_verifications').insert({
        promise_id: promise.id,
        action_id: bestMatch.id,
        match_type: matchType,
        match_confidence: bestScore,
        verification_method: 'ai_assisted',
        explanation: `AI-matched (${(bestScore * 100).toFixed(1)}%): Voted ${bestMatch.vote_position} on "${bestMatch.description.substring(0, 80)}..."`,
        verified_at: new Date().toISOString()
      })

      if (!error) {
        stored++
        await supabase.from('political_promises').update({ verification_status: 'verified' }).eq('id', promise.id)
      } else if (error.code !== '23505') {
        console.error(`      ⚠️ Storage error: ${error.message}`)
      }
    }
  }

  return { matches, stored }
}

async function deploy() {
  console.log('\n🚀 DEPLOYING IMPROVED MATCHER\n')
  console.log('='.repeat(60))

  // Get all politicians with promises
  const { data: allPromises } = await supabase.from('political_promises').select('politician_id')
  const politicianIds = [...new Set(allPromises?.map(p => p.politician_id) || [])]

  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name')
    .in('id', politicianIds)

  console.log(`\nFound ${politicians?.length || 0} politicians with promises\n`)

  // Test different thresholds
  const thresholds = [0.12, 0.10, 0.08]

  for (const threshold of thresholds) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`\n📊 TESTING THRESHOLD: ${(threshold * 100)}%\n`)

    let totalMatches = 0
    let totalStored = 0

    for (const politician of politicians || []) {
      const result = await matchPolitician(politician.id, politician.name, threshold)
      totalMatches += result.matches
      totalStored += result.stored
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`\n✅ THRESHOLD ${(threshold * 100)}% RESULTS:`)
    console.log(`   Total matches found: ${totalMatches}`)
    console.log(`   Successfully stored: ${totalStored}`)

    if (threshold === 0.10) {
      console.log(`\n   📌 RECOMMENDED THRESHOLD: 10%`)
      console.log(`   Good balance of quality and coverage`)
      break
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n🎉 DEPLOYMENT COMPLETE!\n')
}

deploy()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
