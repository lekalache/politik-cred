#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function executeMigration() {
  console.log('🚀 Executing Migration 007...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('❌ Missing Supabase credentials')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration file
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/007_vigie_integration_support.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  // Execute the migration
  console.log('📝 Executing SQL migration...\n')

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  })

  if (error) {
    console.error('❌ Migration failed:', error.message)

    // Try alternative approach: execute via direct SQL
    console.log('\n⚠️  Trying direct SQL execution...\n')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    let failCount = 0

    for (const statement of statements) {
      try {
        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (stmtError) {
          // Check if it's a "already exists" error which we can ignore
          if (stmtError.message.includes('already exists') ||
              stmtError.message.includes('duplicate')) {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`)
          } else {
            console.error(`❌ Failed: ${statement.substring(0, 50)}...`)
            console.error(`   Error: ${stmtError.message}`)
            failCount++
          }
        } else {
          successCount++
          console.log(`✅ ${statement.substring(0, 60)}...`)
        }
      } catch (err) {
        failCount++
        console.error(`❌ Error executing statement:`, err)
      }
    }

    console.log(`\n📊 Results: ${successCount} successful, ${failCount} failed`)

    if (failCount > 0) {
      console.log('\n⚠️  Some statements failed. Please review the errors above.')
      console.log('You may need to execute the SQL manually in Supabase SQL Editor.')
      return
    }
  } else {
    console.log('✅ Migration executed successfully!')
  }

  console.log('\n🎉 Migration 007 Complete!')
  console.log('\n📋 What was added:')
  console.log('   • source_platform column (track data origin)')
  console.log('   • external_id & external_url (deduplication)')
  console.log('   • verification_source (AI vs community)')
  console.log('   • community_votes_count & confidence')
  console.log('   • vigie_import_jobs table')
  console.log('   • promises_with_sources view')
  console.log('\n✅ Ready to import Vigie du mensonge data!')
}

executeMigration().catch(console.error)
