#!/usr/bin/env tsx
/**
 * Database Debug Script
 * Diagnoses why data insertion might be failing
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function debugDatabase() {
  console.log('\n🔍 Database Diagnostic Tool')
  console.log('='.repeat(70))

  // Test 1: Connection
  console.log('\n1️⃣ Testing Database Connection...')
  try {
    const { data, error } = await supabase.from('politicians').select('count').single()
    if (error) {
      console.log('❌ Connection failed:', error.message)
      console.log('   Code:', error.code)
      console.log('   Details:', error.details)
    } else {
      console.log('✅ Connection successful')
    }
  } catch (err) {
    console.log('❌ Connection error:', err)
  }

  // Test 2: Current data count
  console.log('\n2️⃣ Checking Existing Data...')
  try {
    const { count: politicianCount } = await supabase
      .from('politicians')
      .select('*', { count: 'exact', head: true })

    const { count: promiseCount } = await supabase
      .from('political_promises')
      .select('*', { count: 'exact', head: true })

    const { count: actionCount } = await supabase
      .from('parliamentary_actions')
      .select('*', { count: 'exact', head: true })

    console.log(`   Politicians: ${politicianCount || 0}`)
    console.log(`   Promises: ${promiseCount || 0}`)
    console.log(`   Parliamentary Actions: ${actionCount || 0}`)
  } catch (err) {
    console.log('❌ Count error:', err)
  }

  // Test 3: List existing politicians
  console.log('\n3️⃣ Existing Politicians (first 10)...')
  try {
    const { data: politicians, error } = await supabase
      .from('politicians')
      .select('id, name, party, external_id')
      .limit(10)

    if (error) {
      console.log('❌ Query error:', error.message)
    } else if (politicians && politicians.length > 0) {
      politicians.forEach((p: any) => {
        console.log(`   • ${p.name} (${p.party}) - ${p.external_id || 'no external_id'}`)
      })
    } else {
      console.log('   (No politicians found)')
    }
  } catch (err) {
    console.log('❌ Query error:', err)
  }

  // Test 4: Try inserting a test politician
  console.log('\n4️⃣ Testing Insert Operation...')
  const testPolitician = {
    name: `TEST_POLITICIAN_${Date.now()}`,
    party: 'Test Party',
    position: 'Test Position',
    credibility_score: 50,
    total_votes: 0,
    positive_votes: 0,
    negative_votes: 0
  }

  try {
    const { data, error } = await supabase
      .from('politicians')
      .insert(testPolitician)
      .select()

    if (error) {
      console.log('❌ Insert failed:', error.message)
      console.log('   Code:', error.code)
      console.log('   Details:', error.details)
      console.log('   Hint:', error.hint)

      if (error.message.includes('duplicate')) {
        console.log('\n⚠️  Duplicate key error - politician might already exist')
      }
      if (error.message.includes('policy')) {
        console.log('\n⚠️  RLS policy error - check Row Level Security policies')
      }
      if (error.message.includes('permission')) {
        console.log('\n⚠️  Permission error - check database grants')
      }
    } else {
      console.log('✅ Insert successful!')
      console.log('   Inserted:', data)

      // Clean up test data
      if (data && data[0]) {
        await supabase.from('politicians').delete().eq('id', data[0].id)
        console.log('   (Test data cleaned up)')
      }
    }
  } catch (err) {
    console.log('❌ Insert error:', err)
  }

  // Test 5: Check NosDéputés.fr API
  console.log('\n5️⃣ Testing NosDéputés.fr API...')
  try {
    const response = await fetch('https://www.nosdeputes.fr/deputes/enmandat/json', {
      headers: {
        'User-Agent': 'PolitikCred/1.0',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`❌ API request failed: ${response.status}`)
    } else {
      const data = await response.json()
      const deputyCount = data.deputes?.length || 0
      console.log(`✅ API accessible - ${deputyCount} deputies available`)

      if (deputyCount > 0) {
        const firstDeputy = data.deputes[0].depute
        console.log(`   Sample: ${firstDeputy.nom} (${firstDeputy.parti_ratt_financier})`)
      }
    }
  } catch (err) {
    console.log('❌ API error:', err)
  }

  // Test 6: Check table schema
  console.log('\n6️⃣ Checking Table Schema...')
  try {
    const { data, error } = await supabase
      .from('politicians')
      .select('*')
      .limit(0)

    if (error) {
      console.log('❌ Schema check failed:', error.message)
    } else {
      console.log('✅ Table exists and is accessible')
    }
  } catch (err) {
    console.log('❌ Schema error:', err)
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 Diagnostic Summary')
  console.log('='.repeat(70))
  console.log('\nIf you see errors above:')
  console.log('  • RLS policy errors → Check Row Level Security in Supabase')
  console.log('  • Permission errors → Verify SUPABASE_SERVICE_ROLE_KEY')
  console.log('  • Duplicate errors → Politicians already exist')
  console.log('  • Connection errors → Check NEXT_PUBLIC_SUPABASE_URL')
  console.log('\nTo fix RLS issues, run:')
  console.log('  SELECT * FROM pg_policies WHERE tablename = \'politicians\';')
  console.log('  in Supabase SQL Editor')
  console.log()
}

debugDatabase().catch(console.error)
