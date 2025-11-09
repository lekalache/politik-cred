#!/usr/bin/env tsx
/**
 * Clear Promises Script
 * Removes all promises from the database (useful for re-seeding with updated data)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Create Supabase client with service role key (to bypass RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearPromises() {
  console.log('🗑️  Clearing All Promises from Database')
  console.log('='.repeat(60))
  console.log()

  try {
    // First, get a count
    const { count, error: countError } = await supabase
      .from('political_promises')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    console.log(`Found ${count || 0} promises in database`)
    console.log()

    if (!count || count === 0) {
      console.log('✅ No promises to clear!')
      return
    }

    // Delete all promises
    console.log('Deleting all promises...')
    const { error: deleteError } = await supabase
      .from('political_promises')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using a condition that's always true)

    if (deleteError) {
      throw deleteError
    }

    console.log(`✅ Successfully deleted ${count} promises!`)
    console.log()
    console.log('💡 Run "npm run collect-promises" to re-populate with updated data')

  } catch (error) {
    console.error('\n❌ Error clearing promises:', error)
    process.exit(1)
  }
}

clearPromises()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
