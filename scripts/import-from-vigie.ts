#!/usr/bin/env tsx
/**
 * Vigie du Mensonge Importer
 *
 * Imports political lies and promises from vigiedumensonge.fr
 *
 * Usage:
 *   # Manual import with prompts
 *   npm run import-vigie
 *
 *   # Import specific entry
 *   tsx scripts/import-from-vigie.ts --entry=116
 *
 *   # Batch import from list
 *   tsx scripts/import-from-vigie.ts --batch=entries.json
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import * as cheerio from 'cheerio'

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

/**
 * Fetch Vigie entry details
 */
async function fetchVigieEntry(entryId: string): Promise<any> {
  try {
    const url = `https://www.vigiedumensonge.fr/e/${entryId}`
    console.log(`\n🔍 Fetching ${url}...`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract Title
    const title = $('h1').text().trim() || 'Unknown'

    // Extract Quote
    const quote = $('blockquote').text().trim().replace(/^"|"$|^\s*«|»\s*$/g, '').trim()

    // Extract Context/Facts
    // The structure seems to be "Les faits :" followed by text
    let context = ''
    $('div').each((_, el) => {
      const text = $(el).text()
      if (text.includes('Les faits :')) {
        context = $(el).find('p').text().trim()
      }
    })

    // Fallback context extraction if specific div not found
    if (!context) {
      const factsHeader = $('span.font-medium:contains("Les faits :")')
      if (factsHeader.length) {
        context = factsHeader.next().text().trim()
      }
    }

    // Extract Date
    // Look for "Date : YYYY-MM-DD" or similar pattern in the text
    let date = new Date().toISOString().split('T')[0]
    const dateMatch = html.match(/Date\s*:\s*(\d{1,2}\s+[a-zA-Zéû]+\s+\d{4})/i)
    if (dateMatch) {
      // Convert French date to ISO if possible, or just keep it as string for now and let user confirm
      // Simple mapping for months
      const months: { [key: string]: string } = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06',
        'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
      }
      const dateParts = dateMatch[1].split(/\s+/)
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0')
        const month = months[dateParts[1].toLowerCase()] || '01'
        const year = dateParts[2]
        date = `${year}-${month}-${day}`
      }
    }

    // Extract Politician Name from Title
    // Common patterns: "M.Le Pen", "Macron", "G. Darmanin"
    let politicianName = ''
    if (title.includes('M.Le Pen') || title.includes('Marine Le Pen')) politicianName = 'Marine Le Pen'
    else if (title.includes('Macron') || title.includes('E. Macron')) politicianName = 'Emmanuel Macron'
    else if (title.includes('Darmanin')) politicianName = 'Gérald Darmanin'
    else if (title.includes('Retailleau')) politicianName = 'Bruno Retailleau'
    else if (title.includes('Mélenchon')) politicianName = 'Jean-Luc Mélenchon'
    else if (title.includes('Attal')) politicianName = 'Gabriel Attal'
    else if (title.includes('Bardella')) politicianName = 'Jordan Bardella'

    return {
      id: entryId,
      url,
      title,
      quote,
      context,
      date,
      politicianName
    }
  } catch (error) {
    console.error(`❌ Failed to fetch entry ${entryId}:`, error)
    return null
  }
}

/**
 * Find politician by name
 */
async function findPolitician(name: string): Promise<any> {
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name, party')
    .ilike('name', `%${name}%`)
    .limit(5)

  return politicians
}

/**
 * Interactive manual import
 */
async function manualImport() {
  console.log('\n📝 Manual Vigie du Mensonge Import')
  console.log('='.repeat(70))
  console.log('\nExample entry URLs:')
  console.log('  https://www.vigiedumensonge.fr/e/116 (Marine Le Pen)')
  console.log('  https://www.vigiedumensonge.fr/e/205 (Macron)')
  console.log('  https://www.vigiedumensonge.fr/e/207 (Bruno Retailleau)')
  console.log()

  // Step 1: Get Vigie entry ID
  const args = process.argv.slice(2)
  const entryArg = args.find(arg => arg.startsWith('--entry='))
  let entryId = entryArg ? entryArg.split('=')[1] : null

  if (!entryId) {
    entryId = await question('Enter Vigie entry ID (e.g., 116): ')
  }

  if (!entryId) {
    console.log('❌ No entry ID provided')
    rl.close()
    return
  }

  const vigieData = await fetchVigieEntry(entryId)

  if (!vigieData) {
    rl.close()
    return
  }

  console.log(`\n✅ Entry: ${vigieData.title}`)
  if (vigieData.quote) console.log(`   Quote: "${vigieData.quote.substring(0, 50)}..."`)
  if (vigieData.date) console.log(`   Date: ${vigieData.date}`)

  // Step 2: Get politician name
  console.log('\n--- Politician Information ---')

  let politicianName = vigieData.politicianName
  if (!politicianName) {
    politicianName = await question('Politician name (e.g., Marine Le Pen): ')
  } else {
    // Confirm auto-detected name
    const confirmName = await question(`Politician detected: ${politicianName}. Press Enter to confirm or type new name: `)
    if (confirmName.trim()) politicianName = confirmName.trim()
  }

  if (!politicianName) {
    console.log('❌ No politician name provided')
    rl.close()
    return
  }

  // Search for politician
  const politicians = await findPolitician(politicianName)

  if (!politicians || politicians.length === 0) {
    console.log(`\n❌ No politician found matching "${politicianName}"`)
    console.log('Available politicians:')

    const { data: allPols } = await supabase
      .from('politicians')
      .select('name, party')
      .order('name')
      .limit(10)

    allPols?.forEach((p: any) => {
      console.log(`   • ${p.name} (${p.party})`)
    })

    rl.close()
    return
  }

  let politician
  if (politicians.length === 1) {
    politician = politicians[0]
    console.log(`\n✅ Auto-selected: ${politician.name} (${politician.party})`)
  } else {
    console.log('\n✅ Found politicians:')
    politicians.forEach((p: any, idx: number) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.party})`)
    })

    const politicianChoice = await question(`Select politician (1-${politicians.length}): `)
    politician = politicians[parseInt(politicianChoice) - 1]
  }

  if (!politician) {
    console.log('❌ Invalid selection')
    rl.close()
    return
  }

  // Step 3: Get promise/statement details
  console.log('\n--- Promise/Statement Details ---')

  const defaultPromiseText = vigieData.quote || vigieData.title
  console.log(`Suggested Text: "${defaultPromiseText}"`)
  const promiseText = await question('Promise text (Press Enter to use suggested): ')
  const finalPromiseText = promiseText.trim() || defaultPromiseText

  console.log(`\nSuggested Date: ${vigieData.date}`)
  const promiseDate = await question('Promise date (YYYY-MM-DD, or press Enter to use suggested): ')
  const finalDate = promiseDate.trim() || vigieData.date

  console.log('\n💡 Categories: healthcare, economic, social, security, education, environmental, justice, immigration, foreign_policy, other')
  const category = await question('Category (or press Enter for "other"): ')
  const finalCategory = category.trim() || 'other'

  console.log('\n💡 Promise outcome: kept, broken, partial, misleading (will be used in verification)')
  const outcome = await question('Promise outcome (or press Enter for "broken"): ')
  const finalOutcome = outcome.trim() || 'broken'

  console.log('\n💡 Source type: interview, debate, social_media, press_release, campaign_site, manifesto, other')
  const sourceType = await question('Source type (or press Enter for "other"): ')
  const finalSourceType = sourceType.trim() || 'other'

  // Optional: community data
  console.log('\n--- Community Verification (optional) ---')
  const votesStr = await question('Community votes count (or press Enter to skip): ')
  const confidenceStr = await question('Community confidence 0-1 (e.g., 0.89, or press Enter to skip): ')

  // Step 4: Insert into database
  console.log('\n--- Importing to Database ---')

  try {
    // Insert promise
    const { data: promise, error: promiseError } = await supabase
      .from('political_promises')
      .insert({
        politician_id: politician.id,
        promise_text: finalPromiseText,
        promise_date: finalDate,
        source_platform: 'vigie_du_mensonge',
        source_type: finalSourceType,
        external_id: `vigie_${vigieData.id}`,
        external_url: vigieData.url,
        source_url: vigieData.url,
        category: finalCategory,
        verification_status: 'verified',  // Vigie entries are pre-verified
        extraction_method: 'manual',  // Valid: manual, ai_extracted, scraped, user_submitted
        confidence_score: 1.0,
        is_actionable: true,
        context: vigieData.context || vigieData.title
      })
      .select()
      .single()

    if (promiseError) {
      if (promiseError.message.includes('duplicate')) {
        console.log('\n⚠️  This Vigie entry was already imported!')
        console.log('   External ID:', `vigie_${vigieData.id}`)
      } else {
        throw promiseError
      }
      rl.close()
      return
    }

    console.log(`\n✅ Promise imported!`)
    console.log(`   ID: ${promise.id}`)

    // Always add verification record for Vigie entries
    const { error: verifyError } = await supabase
      .from('promise_verifications')
      .insert({
        promise_id: promise.id,
        action_id: null,  // No specific parliamentary action yet
        match_type: finalOutcome,  // kept, broken, partial, etc.
        match_confidence: confidenceStr ? parseFloat(confidenceStr) : 0.95,
        verification_method: 'manual_review',
        explanation: `Vigie du mensonge community verification: ${vigieData.title}`,
        verified_at: new Date().toISOString(),
        verification_source: 'vigie_community',
        community_votes_count: votesStr ? parseInt(votesStr) : null,
        community_confidence: confidenceStr ? parseFloat(confidenceStr) : null
      })

    if (verifyError) {
      console.log(`\n⚠️  Failed to add community verification: ${verifyError.message}`)
    } else {
      console.log(`✅ Community verification added!`)
    }

    console.log('\n🎉 Import complete!')
    console.log(`\nView in admin: http://localhost:3000/admin`)
    console.log(`Vigie URL: ${vigieData.url}`)

  } catch (error) {
    console.error('\n❌ Import failed:', error)
  }

  rl.close()
}

/**
 * Batch import helper
 */
async function batchImportGuide() {
  console.log('\n📦 Batch Import from Vigie du Mensonge')
  console.log('='.repeat(70))
  console.log('\n🎯 Recommended Entries to Import:')
  console.log('\nMacron (Emmanuel):')
  console.log('  • Entry 205: "ne prétend ne jamais avoir légitimé Didier Raoult"')
  console.log('  • Entry 208: "utilise un slogan d\'extrême droite"')
  console.log('    URL: https://www.vigiedumensonge.fr/e/205')

  console.log('\nMarine Le Pen:')
  console.log('  • Entry 116: "nombre d\'homicides multiplié par quatre"')
  console.log('    URL: https://www.vigiedumensonge.fr/e/116')

  console.log('\nBruno Retailleau:')
  console.log('  • Entry 207: "lien entre délinquance et immigration"')
  console.log('    URL: https://www.vigiedumensonge.fr/e/207')

  console.log('\nGérald Darmanin:')
  console.log('  • Entry 37: "Utilisation d\'armes de guerre à Sainte Soline"')
  console.log('    URL: https://www.vigiedumensonge.fr/e/37')

  console.log('\n\n💡 To import these:')
  console.log('   Run this script multiple times, entering each entry ID')
  console.log('   Or visit each URL manually and copy the details')
  console.log()
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nVigie du Mensonge Importer')
    console.log('\nUsage:')
    console.log('  tsx scripts/import-from-vigie.ts          # Interactive import')
    console.log('  tsx scripts/import-from-vigie.ts --batch  # Show recommended entries')
    console.log()
    return
  }

  if (args.includes('--batch')) {
    await batchImportGuide()
    return
  }

  await manualImport()
}

main().catch(console.error)
