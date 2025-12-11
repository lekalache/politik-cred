/**
 * Debug politician access - check RLS and permissions
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create both clients
const anonClient = createClient(supabaseUrl, anonKey)
const serviceClient = createClient(supabaseUrl, serviceKey)

async function debugAccess() {
  console.log('\n🔍 DEBUGGING POLITICIAN ACCESS\n')
  console.log('='.repeat(80))

  const testId = 'e7969a5b-532e-4ad9-85b1-0554e0106d40' // Olivier Faure

  // Test 1: Service role access
  console.log('\n1. Testing with SERVICE ROLE KEY (admin access):')
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('politicians')
    .select('*')
    .eq('id', testId)
    .single()

  if (serviceError) {
    console.log('❌ Service role ERROR:', serviceError)
  } else {
    console.log('✅ Service role SUCCESS - Politician found:', serviceData?.name)
  }

  // Test 2: Anon key access (what the client uses)
  console.log('\n2. Testing with ANON KEY (public/client access):')
  const { data: anonData, error: anonError } = await anonClient
    .from('politicians')
    .select('*')
    .eq('id', testId)
    .single()

  if (anonError) {
    console.log('❌ Anon key ERROR:', anonError)
    console.log('   This is why the profile page fails!')
  } else {
    console.log('✅ Anon key SUCCESS - Politician found:', anonData?.name)
  }

  // Test 3: Check RLS policies
  console.log('\n3. Checking RLS policies on politicians table:')
  const { data: policies, error: policyError } = await serviceClient
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'politicians')

  if (policyError) {
    console.log('⚠️  Could not fetch policies (this is normal)')
  } else if (policies && policies.length > 0) {
    console.log(`Found ${policies.length} RLS policies:`)
    policies.forEach((policy: any) => {
      console.log(`   - ${policy.policyname}: ${policy.cmd}`)
    })
  } else {
    console.log('⚠️  No RLS policies found')
  }

  // Test 4: Try to list all politicians with anon
  console.log('\n4. Testing SELECT * with anon key (no filters):')
  const { data: allData, error: allError, count } = await anonClient
    .from('politicians')
    .select('*', { count: 'exact' })
    .limit(5)

  if (allError) {
    console.log('❌ Cannot list politicians:', allError)
  } else {
    console.log(`✅ Can list politicians: ${count} total, fetched ${allData?.length}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 DIAGNOSIS:\n')

  if (serviceError && anonError) {
    console.log('❌ CRITICAL: Both service and anon keys fail - database issue!')
  } else if (anonError && !serviceError) {
    console.log('⚠️  ISSUE: RLS is blocking anon access')
    console.log('   FIX: Need to add SELECT policy for anon users\n')
    console.log('   Run this SQL in Supabase:')
    console.log('   ' + '-'.repeat(70))
    console.log(`
   CREATE POLICY "Allow public read access to politicians"
   ON politicians
   FOR SELECT
   TO anon, authenticated
   USING (true);
    `)
    console.log('   ' + '-'.repeat(70))
  } else if (!anonError && !serviceError) {
    console.log('✅ Both keys work - RLS is configured correctly!')
    console.log('   The profile page should work...')
    console.log('   Check browser console for client-side errors')
  }

  console.log()
}

debugAccess()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
