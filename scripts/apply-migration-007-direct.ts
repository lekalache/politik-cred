#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function applyMigration() {
  console.log('🚀 Applying Migration 007 - Vigie Integration\n')

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

  console.log('📝 Step 1: Adding source_platform column...')
  try {
    const { error } = await supabase.rpc('exec', {
      query: `
        ALTER TABLE political_promises
        ADD COLUMN IF NOT EXISTS source_platform varchar(50) DEFAULT 'politik_cred';
      `
    })

    if (error && !error.message.includes('already exists')) {
      console.log('⚠️  Note:', error.message)
    } else {
      console.log('✅ source_platform column ready')
    }
  } catch (err: any) {
    console.log('⚠️  Using alternative method...')
  }

  console.log('\n📝 Step 2: Adding external_id and external_url columns...')
  try {
    const { error } = await supabase.rpc('exec', {
      query: `
        ALTER TABLE political_promises
        ADD COLUMN IF NOT EXISTS external_id varchar(200),
        ADD COLUMN IF NOT EXISTS external_url varchar(1000);
      `
    })

    if (error && !error.message.includes('already exists')) {
      console.log('⚠️  Note:', error.message)
    } else {
      console.log('✅ external_id and external_url columns ready')
    }
  } catch (err: any) {
    console.log('⚠️  Using alternative method...')
  }

  console.log('\n📋 Migration Summary:')
  console.log('   The migration adds support for:')
  console.log('   • Multi-source promise tracking (Vigie, AN, Politik Cred\')')
  console.log('   • External platform deduplication')
  console.log('   • Community verification metrics')
  console.log('   • Import job tracking')
  console.log('\n💡 Manual Application Required:')
  console.log('   Due to Supabase security restrictions, please:')
  console.log('   1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor')
  console.log('   2. Create a new query')
  console.log('   3. Paste the contents of: supabase/migrations/007_vigie_integration_support.sql')
  console.log('   4. Click "Run"')
  console.log('\n📄 Migration file location:')
  console.log('   /Users/ayoubkalache/repos/politics-trust/supabase/migrations/007_vigie_integration_support.sql')
}

applyMigration().catch(console.error)
