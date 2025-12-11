/**
 * List valid politician URLs for testing
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function listValidUrls() {
  console.log('\n🔗 VALID POLITICIAN URLs\n')
  console.log('='.repeat(80))

  // Get politicians with AI scores (these definitely exist and have data)
  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, name, party, ai_score')
    .not('ai_score', 'is', null)
    .order('ai_score', { ascending: false })

  if (error || !politicians) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`\nFound ${politicians.length} politicians with AI scores:\n`)

  politicians.forEach((pol, index) => {
    console.log(`${index + 1}. ${pol.name} (${pol.party})`)
    console.log(`   AI Score: ${pol.ai_score}/100`)
    console.log(`   URL: http://localhost:3000/politicians/${pol.id}`)
    console.log()
  })

  console.log('='.repeat(80))
  console.log('\n💡 Try these URLs - they all work!\n')

  // Show top 3 as quick links
  console.log('🔥 TOP 3 TO TEST:')
  politicians.slice(0, 3).forEach((pol, i) => {
    console.log(`${i + 1}. http://localhost:3000/politicians/${pol.id}`)
  })
  console.log()
}

listValidUrls()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
