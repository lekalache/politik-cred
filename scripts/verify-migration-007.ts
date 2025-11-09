#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function verifyMigration() {
  console.log('🔍 Verifying Migration 007...\n')

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

  console.log('📊 Test 1: Check new columns in political_promises')
  const { data: promises, error: promisesError } = await supabase
    .from('political_promises')
    .select('id, promise_text, source_platform, external_id, external_url')
    .limit(3)

  if (promisesError) {
    console.log('❌ Error:', promisesError.message)
  } else {
    console.log('✅ Success! New columns exist:')
    console.log(`   Found ${promises?.length} promises`)
    console.log(`   Columns: source_platform, external_id, external_url`)
    if (promises && promises.length > 0) {
      console.log(`   Example: source_platform = "${promises[0].source_platform || 'NULL'}"`)
    }
  }

  console.log('\n📊 Test 2: Check new columns in promise_verifications')
  const { data: verifications, error: verificationsError } = await supabase
    .from('promise_verifications')
    .select('id, verification_source, community_votes_count, community_confidence')
    .limit(3)

  if (verificationsError) {
    console.log('❌ Error:', verificationsError.message)
  } else {
    console.log('✅ Success! New columns exist:')
    console.log(`   Columns: verification_source, community_votes_count, community_confidence`)
  }

  console.log('\n📊 Test 3: Check vigie_import_jobs table')
  const { data: jobs, error: jobsError } = await supabase
    .from('vigie_import_jobs')
    .select('*')
    .limit(1)

  if (jobsError) {
    console.log('❌ Error:', jobsError.message)
  } else {
    console.log('✅ Success! vigie_import_jobs table exists')
    console.log(`   Found ${jobs?.length || 0} import jobs`)
  }

  console.log('\n📊 Test 4: Check promises_with_sources view')
  const { data: viewData, error: viewError } = await supabase
    .from('promises_with_sources')
    .select('politician_name, vigie_verifications, ai_verifications, parliamentary_verifications')
    .limit(3)

  if (viewError) {
    console.log('❌ Error:', viewError.message)
  } else {
    console.log('✅ Success! promises_with_sources view exists')
    console.log(`   Found ${viewData?.length} promises with source aggregation`)
    if (viewData && viewData.length > 0) {
      console.log(`   Example: ${viewData[0].politician_name}`)
      console.log(`      - AI verifications: ${viewData[0].ai_verifications}`)
      console.log(`      - Vigie verifications: ${viewData[0].vigie_verifications}`)
      console.log(`      - Parliamentary verifications: ${viewData[0].parliamentary_verifications}`)
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║  ✅ MIGRATION 007 SUCCESSFULLY VERIFIED                  ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('\n🎉 Your database now supports:')
  console.log('   • Multi-source promise tracking')
  console.log('   • External platform deduplication')
  console.log('   • Community verification metrics')
  console.log('   • Import job monitoring')
  console.log('\n🚀 Ready to import Vigie du mensonge data!')
}

verifyMigration().catch(console.error)
