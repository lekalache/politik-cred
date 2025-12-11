/**
 * Check what data we have to extract promises from for the 59 remaining politicians
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkExtractionOptions() {
  console.log('\n🔍 CHECKING PROMISE EXTRACTION OPTIONS\n')
  console.log('='.repeat(80))

  // 1. Get politicians without promises
  const { data: withPromises } = await supabase
    .from('political_promises')
    .select('politician_id')

  const idsWithPromises = new Set(withPromises?.map(p => p.politician_id) || [])

  const { data: allPoliticians } = await supabase
    .from('politicians')
    .select('id, name, party, bio, position')

  const withoutPromises = allPoliticians?.filter(p => !idsWithPromises.has(p.id)) || []

  console.log(`\n📊 Politicians without promises: ${withoutPromises.length}\n`)

  // 2. Check what data we have
  console.log('Sample of politicians WITHOUT promises:\n')
  withoutPromises.slice(0, 10).forEach((pol, i) => {
    console.log(`${i + 1}. ${pol.name}`)
    console.log(`   Party: ${pol.party || 'Unknown'}`)
    console.log(`   Position: ${pol.position || 'Unknown'}`)
    console.log(`   Bio available: ${pol.bio ? 'Yes (' + pol.bio.length + ' chars)' : 'No'}`)
    console.log()
  })

  // 3. Check news articles
  const { count: newsCount } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📰 News articles in database: ${newsCount || 0}`)

  // 4. Check if bios contain promise-like text
  const politiciansWithBios = withoutPromises.filter(p => p.bio && p.bio.length > 50)
  console.log(`\n📝 Politicians with substantial bios: ${politiciansWithBios.length}/${withoutPromises.length}`)

  // 5. Suggest extraction sources
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 OPTIONS FOR PROMISE EXTRACTION:\n')

  console.log('1. **From Bios** (Quick win)')
  console.log(`   - ${politiciansWithBios.length} politicians have bios we can extract from`)
  console.log('   - Can run promise extraction on existing bio text')
  console.log('   - Limited data but better than nothing\n')

  console.log('2. **From News API** (Medium effort)')
  console.log('   - Collect recent news articles about each politician')
  console.log('   - Extract promises from quotes and statements')
  console.log('   - More comprehensive but requires API calls\n')

  console.log('3. **From Vigie du Mensonge** (Recommended)')
  console.log('   - Import existing verified promises from vigiedumensonge.fr')
  console.log('   - High quality, already fact-checked')
  console.log('   - Schema support already in place (migration 007)\n')

  console.log('4. **Manual Input** (Not scalable)')
  console.log('   - Manually add promises with sources')
  console.log('   - Good for high-priority politicians only\n')

  console.log('='.repeat(80))
  console.log('\n🎯 RECOMMENDED APPROACH:\n')
  console.log('Phase 1: Extract from bios (quick - 5 minutes)')
  console.log('Phase 2: Collect news for top 30 politicians (1-2 hours)')
  console.log('Phase 3: Import from Vigie du Mensonge (best quality)')
  console.log()
}

checkExtractionOptions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
