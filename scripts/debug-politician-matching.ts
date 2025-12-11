/**
 * Debug Politician Matching
 * Shows which politicians can/cannot be matched to API deputies
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
}

async function debugMatching() {
  console.log('\n🔍 POLITICIAN MATCHING DEBUG\n')

  // Get our politicians
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name, party')
    .order('name')

  // Fetch API deputies
  const response = await fetch('https://www.nosdeputes.fr/deputes/json')
  const apiData = await response.json()
  const deputies = apiData.deputes.map((d: any) => d.depute)

  console.log(`DB Politicians: ${politicians?.length || 0}`)
  console.log(`API Deputies: ${deputies.length}`)
  console.log('')

  if (!politicians) return

  // Try matching
  const matches: any[] = []
  const unmatched: any[] = []

  for (const politician of politicians) {
    const normalizedPol = normalizeName(politician.name)

    const match = deputies.find((deputy: any) => {
      const fullName = `${deputy.prenom} ${deputy.nom}`
      const normalizedDep = normalizeName(fullName)

      // Try exact match
      if (normalizedDep === normalizedPol) return true

      // Try reversed (last first)
      const reversedName = `${deputy.nom} ${deputy.prenom}`
      if (normalizeName(reversedName) === normalizedPol) return true

      // Try last name only match
      if (normalizeName(deputy.nom) === normalizedPol) return true

      return false
    })

    if (match) {
      matches.push({
        politician: politician.name,
        deputy: `${match.prenom} ${match.nom}`,
        party: match.groupe_sigle
      })
    } else {
      unmatched.push(politician)
    }
  }

  console.log(`✅ MATCHED (${matches.length}):`)
  console.log('='.repeat(60))
  matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m.politician} → ${m.deputy} (${m.party})`)
  })

  console.log(`\n❌ UNMATCHED (${unmatched.length}):`)
  console.log('='.repeat(60))
  unmatched.slice(0, 20).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (${p.party || 'No party'})`)
  })

  console.log(`\n💡 SUGGESTIONS:`)
  console.log('='.repeat(60))
  console.log(`1. ${unmatched.length} politicians can't be matched`)
  console.log(`2. Some may not be current deputies (e.g., Macron is President)`)
  console.log(`3. Add more ACTUAL deputies from the API to your database`)
  console.log(`4. Focus on matched politicians (${matches.length}) for initial audit`)

  // Show some example deputies from API
  console.log(`\n📋 SAMPLE API DEPUTIES (first 10):`)
  console.log('='.repeat(60))
  deputies.slice(0, 10).forEach((deputy: any, i: number) => {
    console.log(`${i + 1}. ${deputy.prenom} ${deputy.nom} (${deputy.groupe_sigle})`)
  })
}

debugMatching().catch(console.error)
