#!/usr/bin/env tsx
/**
 * Check Database Status
 * Shows what data is currently in the database
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

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

async function checkStatus() {
  console.log('\n📊 Database Status Report')
  console.log('='.repeat(70))

  // Count all tables
  const tables = [
    { name: 'politicians', label: 'Politicians' },
    { name: 'political_promises', label: 'Political Promises' },
    { name: 'parliamentary_actions', label: 'Parliamentary Actions' },
    { name: 'promise_verifications', label: 'Promise Verifications' },
    { name: 'consistency_scores', label: 'Consistency Scores' },
    { name: 'articles', label: 'News Articles' }
  ]

  console.log('\n📈 Record Counts:\n')

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ${table.label}: ❌ Error - ${error.message}`)
      } else {
        console.log(`   ${table.label}: ${count || 0}`)
      }
    } catch (err) {
      console.log(`   ${table.label}: ❌ Error`)
    }
  }

  // Show sample politicians
  console.log('\n👥 Sample Politicians (first 20):\n')
  const { data: politicians, error: polError } = await supabase
    .from('politicians')
    .select('id, name, party, position, external_id')
    .order('name', { ascending: true })
    .limit(20)

  if (polError) {
    console.log('   ❌ Error:', polError.message)
  } else if (politicians && politicians.length > 0) {
    politicians.forEach((p: any, idx: number) => {
      console.log(`   ${idx + 1}. ${p.name}`)
      console.log(`      Party: ${p.party || 'N/A'}`)
      console.log(`      Position: ${p.position || 'N/A'}`)
      console.log(`      External ID: ${p.external_id || 'N/A'}`)
      console.log()
    })
  } else {
    console.log('   (No politicians found)\n')
  }

  // Show promises breakdown
  console.log('📝 Promises by Source:\n')
  const { data: promisesBySource } = await supabase
    .from('political_promises')
    .select('source_platform')

  if (promisesBySource && promisesBySource.length > 0) {
    const counts: Record<string, number> = {}
    promisesBySource.forEach((p: any) => {
      const platform = p.source_platform || 'unknown'
      counts[platform] = (counts[platform] || 0) + 1
    })

    Object.entries(counts).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count}`)
    })
  } else {
    console.log('   (No promises found)')
  }

  // Show top politicians by promise count
  console.log('\n🏆 Top Politicians by Promise Count:\n')
  const { data: politiciansWithPromises } = await supabase
    .rpc('get_politicians_with_promise_counts', {})
    .limit(10)

  // If RPC doesn't exist, do it manually
  const { data: allPoliticians } = await supabase
    .from('politicians')
    .select('id, name')

  if (allPoliticians) {
    const promiseCounts = await Promise.all(
      allPoliticians.slice(0, 10).map(async (p: any) => {
        const { count } = await supabase
          .from('political_promises')
          .select('*', { count: 'exact', head: true })
          .eq('politician_id', p.id)

        return { name: p.name, count: count || 0 }
      })
    )

    promiseCounts
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)
      .forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name}: ${p.count} promises`)
      })

    if (promiseCounts.every(p => p.count === 0)) {
      console.log('   (No promises linked to politicians yet)')
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Status check complete')
  console.log('='.repeat(70))
  console.log()
}

checkStatus().catch(console.error)
