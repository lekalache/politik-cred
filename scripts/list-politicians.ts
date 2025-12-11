/**
 * List all politicians in the database with their IDs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function listPoliticians() {
  console.log('\n📋 LISTING ALL POLITICIANS\n')
  console.log('='.repeat(80))

  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, name, party, ai_score')
    .order('name')

  if (error) {
    console.error('❌ Error fetching politicians:', error)
    return
  }

  if (!politicians || politicians.length === 0) {
    console.log('\n⚠️  No politicians found in database')
    return
  }

  console.log(`\n✅ Found ${politicians.length} politicians:\n`)

  politicians.forEach((pol, index) => {
    console.log(`${index + 1}. ${pol.name}`)
    console.log(`   ID: ${pol.id}`)
    console.log(`   Party: ${pol.party || 'N/A'}`)
    console.log(`   AI Score: ${pol.ai_score !== null ? pol.ai_score + '/100' : 'N/A'}`)
    console.log(`   URL: /politicians/${pol.id}`)
    console.log()
  })

  console.log('='.repeat(80))
}

listPoliticians()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
