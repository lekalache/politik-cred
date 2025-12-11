/**
 * Check what columns already exist in political_promises table
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkColumns() {
  console.log('\n🔍 Checking existing columns in political_promises table...\n')

  const { data, error } = await supabase
    .from('political_promises')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0])
    console.log('Existing columns:')
    columns.forEach(col => console.log(`  - ${col}`))

    console.log('\n🎯 Checking for migration 008 columns:')
    console.log(`  category: ${columns.includes('category') ? '✅ EXISTS' : '❌ NOT EXISTS'}`)
    console.log(`  confidence_score: ${columns.includes('confidence_score') ? '✅ EXISTS' : '❌ NOT EXISTS'}`)
    console.log(`  authenticity_flags: ${columns.includes('authenticity_flags') ? '✅ EXISTS' : '❌ NOT EXISTS'}`)
  }
}

checkColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
