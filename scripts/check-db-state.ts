/**
 * Check database state
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${serviceRoleKey ? 'SET' : 'NOT SET'}`)

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('📊 Checking database state...\n')

  try {
    console.log('Using: service_role key')

    // Get total politicians
    const { count: total, error: totalError } = await db
      .from('politicians')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.log(`Error getting total: ${totalError.message}`)
    }
    console.log(`Total politicians: ${total}`)

    // Get deputies count
    const { count: deputies } = await db
      .from('politicians')
      .select('*', { count: 'exact', head: true })
      .eq('position', 'Député')

    console.log(`Deputies: ${deputies}`)

    // Get senators count
    const { count: senators } = await db
      .from('politicians')
      .select('*', { count: 'exact', head: true })
      .eq('position', 'Sénateur')

    console.log(`Senators: ${senators}`)

    // Sample some deputies
    const { data: sampleDeputies } = await db
      .from('politicians')
      .select('first_name, last_name, name')
      .eq('position', 'Député')
      .limit(10)

    console.log('\nSample Deputies:')
    for (const d of sampleDeputies || []) {
      console.log(`  - ${d.first_name} ${d.last_name} (full: ${d.name})`)
    }

    // Check specific test names
    const testNames = [
      ['Astrid', 'Panosyan-Bouvet'],
      ['Antoine', 'Armand'],
      ['Xavier', 'Breton'],
      ['Marine', 'Le Pen'],
      ['Jean-Luc', 'Mélenchon'],
    ]

    console.log('\nTest name lookups:')
    for (const [first, last] of testNames) {
      const { data: exact } = await db
        .from('politicians')
        .select('id, first_name, last_name')
        .ilike('last_name', last)
        .ilike('first_name', first)
        .limit(3)

      if (exact && exact.length > 0) {
        console.log(`  ✅ ${first} ${last}: found ${exact.length} matches`)
        for (const m of exact) {
          console.log(`     -> ${m.first_name} ${m.last_name}`)
        }
      } else {
        // Try just last name
        const { data: lastOnly } = await db
          .from('politicians')
          .select('id, first_name, last_name')
          .ilike('last_name', last)
          .limit(3)

        if (lastOnly && lastOnly.length > 0) {
          console.log(`  ⚠️ ${first} ${last}: ${lastOnly.length} by last name only`)
          for (const m of lastOnly) {
            console.log(`     -> ${m.first_name} ${m.last_name}`)
          }
        } else {
          console.log(`  ❌ ${first} ${last}: no matches`)
        }
      }
    }

    // Check parliamentary actions
    const { count: actions } = await db
      .from('parliamentary_actions')
      .select('*', { count: 'exact', head: true })

    console.log(`\nParliamentary actions: ${actions}`)

  } catch (error) {
    console.error('Error:', error)
  }
}

main()
