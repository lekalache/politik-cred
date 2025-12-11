/**
 * Simulate exactly what the profile page does
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Simulate the same client creation as /src/lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const buildTimeUrl = supabaseUrl || 'https://placeholder.supabase.co'
const buildTimeKey = (supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE')
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk0MDUyNDAsImV4cCI6MTk2NDk4MTI0MH0.placeholder'

console.log('\n🔍 SIMULATING PROFILE PAGE QUERY\n')
console.log('='.repeat(80))

console.log('\nConfiguration:')
console.log('URL:', buildTimeUrl)
console.log('Key available:', !!buildTimeKey)
console.log('Key is placeholder:', buildTimeKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk0MDUyNDAsImV4cCI6MTk2NDk4MTI0MH0.placeholder')

const supabase = createClient(buildTimeUrl, buildTimeKey)

async function testQuery() {
  const id = 'e7969a5b-532e-4ad9-85b1-0554e0106d40' // Olivier Faure

  console.log(`\nQuerying for politician: ${id}`)
  console.log('Query: .from("politicians").select("*").eq("id", id).single()\n')

  try {
    const { data: polData, error: polError } = await supabase
      .from('politicians')
      .select('*')
      .eq('id', id)
      .single()

    if (polError) {
      console.log('❌ ERROR:', polError)
      console.log('   Code:', polError.code)
      console.log('   Message:', polError.message)
      console.log('   Details:', polError.details)
      console.log('   Hint:', polError.hint)
    } else if (!polData) {
      console.log('⚠️  No error but no data returned')
    } else {
      console.log('✅ SUCCESS!')
      console.log('   Name:', polData.name)
      console.log('   Party:', polData.party)
      console.log('   AI Score:', polData.ai_score)
    }

    // Try consistency_scores
    console.log('\n\nTrying consistency_scores...')
    const { data: scoresData, error: scoresError } = await supabase
      .from('consistency_scores')
      .select('*')
      .eq('politician_id', id)
      .single()

    if (scoresError) {
      console.log('❌ Consistency scores error:', scoresError.message)
    } else if (scoresData) {
      console.log('✅ Got consistency scores:', scoresData.overall_score)
    }

  } catch (error) {
    console.log('💥 EXCEPTION:', error)
  }

  console.log('\n' + '='.repeat(80))
}

testQuery()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
