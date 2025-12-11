/**
 * Check specific politician ID
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPoliticianId() {
  const targetId = '5e6fd97a-d325-4175-ab10-17c4159d7f96'

  console.log(`\n🔍 Checking for politician with ID: ${targetId}\n`)

  // Check in politicians table
  const { data: politician, error: polError } = await supabase
    .from('politicians')
    .select('*')
    .eq('id', targetId)
    .single()

  if (polError) {
    console.log('❌ Politician not found in politicians table')
    console.log('Error:', polError.message)
  } else if (politician) {
    console.log('✅ Found politician:', politician.name)
  }

  // Check if there are any politicians with AI scores
  const { data: withScores, error: scoresError } = await supabase
    .from('politicians')
    .select('id, name, ai_score')
    .not('ai_score', 'is', null)
    .order('ai_score', { ascending: false })

  if (withScores && withScores.length > 0) {
    console.log(`\n✅ Politicians with AI scores (${withScores.length}):\n`)
    withScores.forEach(p => {
      console.log(`  - ${p.name}: ${p.ai_score}/100`)
      console.log(`    ID: ${p.id}\n`)
    })
  }
}

checkPoliticianId()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
