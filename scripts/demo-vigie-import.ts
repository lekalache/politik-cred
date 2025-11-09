#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/**
 * DEMO: Import a Vigie du mensonge promise
 *
 * This demonstrates the new multi-source verification system.
 * In production, you'd scrape data from vigiedumensonge.fr
 */

async function demoVigieImport() {
  console.log('🎯 DEMO: Vigie du mensonge Import\n')

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

  // Example: Find Emmanuel Macron in database
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name')
    .eq('name', 'Emmanuel Macron')
    .single()

  if (!politicians) {
    console.log('⚠️  Emmanuel Macron not found in database')
    return
  }

  console.log(`✅ Found politician: ${politicians.name} (${politicians.id})`)

  // Example Vigie promise data (in reality, this would come from scraping)
  const vigiePromiseExample = {
    politician_id: politicians.id,
    promise_text: "Je promets de réformer les retraites pour garantir l'équilibre du système",
    promise_date: '2022-04-10T00:00:00Z',
    context: 'Débat présidentiel 2022 - France 2',
    source_url: 'https://www.elysee.fr/debat-presidentiel-2022',

    // NEW FIELDS from Migration 007
    source_platform: 'vigie_du_mensonge' as const,
    external_id: 'vigie_promise_12345',  // Would be Vigie's internal ID
    external_url: 'https://www.vigiedumensonge.fr/promesse/12345',

    category: 'social',
    verification_status: 'broken' as const
  }

  console.log('\n📝 Example Vigie Promise:')
  console.log(`   Text: "${vigiePromiseExample.promise_text.substring(0, 60)}..."`)
  console.log(`   Source Platform: ${vigiePromiseExample.source_platform}`)
  console.log(`   External URL: ${vigiePromiseExample.external_url}`)
  console.log(`   External ID: ${vigiePromiseExample.external_id}`)

  console.log('\n💡 To import this promise, you would run:')
  console.log(`
  const { data, error } = await supabase
    .from('political_promises')
    .insert({
      politician_id: '${politicians.id}',
      promise_text: "...",
      source_platform: 'vigie_du_mensonge',
      external_id: 'vigie_promise_12345',
      external_url: 'https://www.vigiedumensonge.fr/promesse/12345',
      // ... other fields
    })
  `)

  console.log('\n📊 Example: Adding Vigie community verification')
  console.log(`
  const { data, error } = await supabase
    .from('promise_verifications')
    .insert({
      promise_id: promiseId,
      verification_source: 'vigie_community',
      community_votes_count: 512,
      community_confidence: 0.89,
      verification_status: 'broken',
      notes: 'Verified by Vigie community with high confidence'
    })
  `)

  console.log('\n🔍 Checking for duplicate Vigie promises:')
  console.log(`
  const { data: existing } = await supabase
    .from('political_promises')
    .select('*')
    .eq('external_id', 'vigie_promise_12345')
    .eq('source_platform', 'vigie_du_mensonge')
    .single()

  if (existing) {
    console.log('⚠️  Promise already imported, skipping...')
  }
  `)

  console.log('\n📈 Query promises with multi-source verification:')
  console.log(`
  const { data } = await supabase
    .from('promises_with_sources')
    .select('*')
    .eq('politician_name', 'Emmanuel Macron')

  // Results include:
  // - vigie_verifications (count)
  // - ai_verifications (count)
  // - parliamentary_verifications (count)
  // - max_confidence (highest confidence score)
  `)

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║  🎉 MULTI-SOURCE SYSTEM READY                            ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('\n✅ Available source platforms:')
  console.log("   • 'politik_cred' (our AI)")
  console.log("   • 'vigie_du_mensonge' (community fact-checking)")
  console.log("   • 'assemblee_nationale' (official parliamentary data)")
  console.log("   • 'user_submitted' (user contributions)")
  console.log("   • 'other' (other sources)")

  console.log('\n✅ Available verification sources:')
  console.log("   • 'ai_assisted' (our semantic matching)")
  console.log("   • 'vigie_community' (Vigie votes)")
  console.log("   • 'manual_review' (human review)")
  console.log("   • 'parliamentary_match' (matched to actual votes)")
  console.log("   • 'user_contributed' (user contributions)")

  console.log('\n📚 Next Steps:')
  console.log('   1. Contact Vigie team for partnership')
  console.log('   2. Manual import 10-20 test promises')
  console.log('   3. Build automated scraper')
  console.log('   4. Display VigieBadge on promise cards')
}

demoVigieImport().catch(console.error)
