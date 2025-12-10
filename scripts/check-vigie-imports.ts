#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkVigie() {
  console.log('\n👁️  Vigie du Mensonge Import Verification')
  console.log('='.repeat(70))

  const { data: promises } = await supabase
    .from('political_promises')
    .select(`
      id,
      promise_text,
      category,
      verification_status,
      external_url,
      politicians (name, party)
    `)
    .eq('source_platform', 'vigie_du_mensonge')

  if (!promises || promises.length === 0) {
    console.log('\n❌ No Vigie promises found')
    return
  }

  console.log(`\n✅ Found ${promises.length} Vigie promises:\n`)

  for (const p of promises) {
    console.log(`📝 ${(p as any).politicians.name} (${(p as any).politicians.party})`)
    console.log(`   "${p.promise_text.substring(0, 80)}..."`)
    console.log(`   Category: ${p.category}`)
    console.log(`   Status: ${p.verification_status}`)
    console.log(`   Vigie URL: ${p.external_url}`)
    console.log()
  }

  const { data: verifications } = await supabase
    .from('promise_verifications')
    .select('*')
    .eq('verification_source', 'vigie_community')

  console.log(`✅ Found ${verifications?.length || 0} community verifications`)

  if (verifications && verifications.length > 0) {
    console.log('\n📊 Community Verification Details:\n')
    verifications.forEach((v: any) => {
      console.log(`   • ${v.match_type} - ${v.community_votes_count} votes - ${(v.community_confidence * 100).toFixed(0)}% confidence`)
    })
  }

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Vigie import successful!')
  console.log('='.repeat(70))
  console.log()
}

checkVigie()
