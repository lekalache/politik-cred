/**
 * Diagnose the current database state to understand migration issues
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseMigrationState() {
  console.log('\n🔍 DIAGNOSING DATABASE MIGRATION STATE\n')
  console.log('='.repeat(80))

  // 1. Check what columns exist in political_promises
  console.log('\n📊 POLITICAL_PROMISES TABLE COLUMNS:\n')

  const { data: promisesSample } = await supabase
    .from('political_promises')
    .select('*')
    .limit(1)

  if (promisesSample && promisesSample.length > 0) {
    const columns = Object.keys(promisesSample[0])
    columns.forEach(col => console.log(`  ✓ ${col}`))

    console.log(`\n  Total: ${columns.length} columns`)
    console.log(`\n  Has category: ${columns.includes('category') ? '✅ YES' : '❌ NO'}`)
    console.log(`  Has confidence_score: ${columns.includes('confidence_score') ? '✅ YES' : '❌ NO'}`)
    console.log(`  Has authenticity_flags: ${columns.includes('authenticity_flags') ? '✅ YES' : '❌ NO'}`)
  }

  // 2. Check if new tables exist
  console.log('\n\n📋 NEW TABLES STATUS:\n')

  const tables = ['promise_sources', 'source_reputation', 'core_value_profiles']

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`  ❌ ${table}: Does not exist`)
      console.log(`     Error: ${error.message}`)
    } else {
      console.log(`  ✅ ${table}: Exists (${count || 0} rows)`)
    }
  }

  // 3. Check if views exist
  console.log('\n\n👁️  VIEWS STATUS:\n')

  const { data: viewsCheck1, error: viewError1 } = await supabase
    .from('promises_with_sources')
    .select('*')
    .limit(1)

  if (viewError1) {
    console.log(`  ❌ promises_with_sources: Does not exist`)
    console.log(`     Error: ${viewError1.message}`)
  } else {
    console.log(`  ✅ promises_with_sources: Exists`)
  }

  const { data: viewsCheck2, error: viewError2 } = await supabase
    .from('politicians_with_values')
    .select('*')
    .limit(1)

  if (viewError2) {
    console.log(`  ❌ politicians_with_values: Does not exist`)
    console.log(`     Error: ${viewError2.message}`)
  } else {
    console.log(`  ✅ politicians_with_values: Exists`)
  }

  // 4. Check Supabase migrations table
  console.log('\n\n📜 MIGRATION HISTORY:\n')

  const { data: migrations, error: migError } = await supabase
    .from('supabase_migrations')
    .select('*')
    .order('version', { ascending: false })
    .limit(10)

  if (migError) {
    console.log(`  ⚠️  Cannot access migration history: ${migError.message}`)
  } else if (migrations) {
    migrations.forEach(m => {
      console.log(`  📦 Version: ${m.version}`)
      if (m.name) console.log(`     Name: ${m.name}`)
      if (m.executed_at) console.log(`     Executed: ${new Date(m.executed_at).toLocaleString()}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 ANALYSIS:\n')

  if (promisesSample && promisesSample.length > 0) {
    const columns = Object.keys(promisesSample[0])

    if (columns.includes('category') && columns.includes('confidence_score')) {
      console.log('✅ Columns "category" and "confidence_score" already exist')
      console.log('   Migration 008 should SKIP adding these columns')
    }

    if (!columns.includes('authenticity_flags')) {
      console.log('⚠️  Column "authenticity_flags" is missing')
      console.log('   Migration 008 needs to add this column')
    } else {
      console.log('✅ Column "authenticity_flags" already exists')
      console.log('   Migration 008 has already been partially applied')
    }
  }

  console.log('\n🔧 RECOMMENDED ACTION:\n')
  console.log('If migration 008 has been partially applied, you may need to:')
  console.log('1. Manually complete the migration by running only the missing parts')
  console.log('2. Or rollback migration 008 completely and rerun it')
  console.log('3. Check Supabase dashboard > Database > Migrations for failed migrations')
  console.log()
}

diagnoseMigrationState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
