#!/usr/bin/env tsx
/**
 * Batch Import from Vigie du Mensonge
 *
 * Imports pre-configured Vigie entries from JSON file
 *
 * Usage:
 *   npm run vigie-batch
 *   or
 *   tsx scripts/vigie-batch-import.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

interface VigieEntry {
  entryId: string
  politician: string
  promiseText: string
  date: string
  category: string
  outcome: string
  sourceType: string
  votes?: number
  confidence?: number
}

async function importBatch() {
  console.log('\n📦 Vigie du Mensonge - Batch Import')
  console.log('='.repeat(70))

  // Load entries from JSON
  const dataPath = resolve(__dirname, 'vigie-batch-import-data.json')
  const entries: VigieEntry[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  console.log(`\n✅ Loaded ${entries.length} entries from file\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const entry of entries) {
    console.log(`\n📥 Processing Entry ${entry.entryId}: ${entry.politician}`)
    console.log(`   "${entry.promiseText.substring(0, 60)}..."`)

    try {
      // Find politician
      const { data: politicians } = await supabase
        .from('politicians')
        .select('id, name, party')
        .ilike('name', `%${entry.politician}%`)
        .limit(1)

      if (!politicians || politicians.length === 0) {
        console.log(`   ❌ Politician not found: ${entry.politician}`)
        errors++
        continue
      }

      const politician = politicians[0]
      console.log(`   ✓ Found: ${politician.name} (${politician.party})`)

      // Check for duplicates
      const { data: existing } = await supabase
        .from('political_promises')
        .select('id')
        .eq('external_id', `vigie_${entry.entryId}`)
        .single()

      if (existing) {
        console.log(`   ⚠️  Already imported (skipping)`)
        skipped++
        continue
      }

      // Insert promise
      const { data: promise, error: promiseError } = await supabase
        .from('political_promises')
        .insert({
          politician_id: politician.id,
          promise_text: entry.promiseText,
          promise_date: entry.date,
          source_platform: 'vigie_du_mensonge',
          source_type: entry.sourceType,
          external_id: `vigie_${entry.entryId}`,
          external_url: `https://www.vigiedumensonge.fr/e/${entry.entryId}`,
          source_url: `https://www.vigiedumensonge.fr/e/${entry.entryId}`,
          category: entry.category,
          verification_status: 'verified',
          extraction_method: 'manual',  // Valid: manual, ai_extracted, scraped, user_submitted
          confidence_score: 1.0,
          is_actionable: true,
          context: `Vigie du mensonge entry ${entry.entryId}`
        })
        .select()
        .single()

      if (promiseError) {
        console.log(`   ❌ Insert failed: ${promiseError.message}`)
        errors++
        continue
      }

      console.log(`   ✓ Promise imported (ID: ${promise.id})`)

      // Add verification
      const { error: verifyError } = await supabase
        .from('promise_verifications')
        .insert({
          promise_id: promise.id,
          action_id: null,
          match_type: entry.outcome,
          match_confidence: entry.confidence || 0.95,
          verification_method: 'manual_review',
          explanation: `Vigie du mensonge community verification (Entry ${entry.entryId})`,
          verified_at: new Date().toISOString(),
          verification_source: 'vigie_community',
          community_votes_count: entry.votes || null,
          community_confidence: entry.confidence || null
        })

      if (verifyError) {
        console.log(`   ⚠️  Verification failed: ${verifyError.message}`)
      } else {
        console.log(`   ✓ Verification added (${entry.votes} votes, ${(entry.confidence || 0) * 100}% confidence)`)
      }

      imported++
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error) {
      console.log(`   ❌ Error:`, error)
      errors++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 Batch Import Summary')
  console.log('='.repeat(70))
  console.log(`Total entries:  ${entries.length}`)
  console.log(`Imported:       ${imported} ✅`)
  console.log(`Skipped:        ${skipped} ⚠️`)
  console.log(`Errors:         ${errors} ❌`)
  console.log('='.repeat(70))

  if (imported > 0) {
    console.log('\n🎉 Import successful!')
    console.log('\nView results:')
    console.log('  • Admin panel: http://localhost:3000/admin')
    console.log('  • Promises page: http://localhost:3000/promises')
    console.log('\nCheck database:')
    console.log('  SELECT COUNT(*) FROM political_promises WHERE source_platform = \'vigie_du_mensonge\';')
  }

  console.log()
}

importBatch().catch(console.error)
