/**
 * Example Script: Promise Collection with URL Validation
 *
 * This script demonstrates how to collect political promises
 * using the new URL validation system.
 *
 * Usage:
 *   npx ts-node scripts/collect-promises-example.ts
 */

interface PromiseSource {
  politicianId: string
  politicianName: string
  sourceUrl: string
  sourceType: 'campaign_site' | 'interview' | 'social_media' | 'debate' | 'press_release' | 'manifesto'
  date: string
  text: string
  description?: string
}

// Example promise sources from real French political contexts
const exampleSources: PromiseSource[] = [
  {
    politicianId: 'YOUR_POLITICIAN_ID_HERE',
    politicianName: 'Example Politician',
    sourceUrl: 'https://www.vie-publique.fr',
    sourceType: 'interview',
    date: '2024-01-15',
    text: `
      Je m'engage à augmenter le budget de la santé de 20% d'ici 2025.
      Nous allons également créer 10 000 emplois dans le secteur public.
      Mon objectif est de réduire le chômage de 2 points dans les 2 ans.
    `,
    description: 'Interview on health and employment policy'
  },
  {
    politicianId: 'YOUR_POLITICIAN_ID_HERE',
    politicianName: 'Example Politician',
    sourceUrl: 'https://www.assemblee-nationale.fr',
    sourceType: 'debate',
    date: '2024-02-01',
    text: `
      Nous promettons d'investir 5 milliards d'euros dans les énergies renouvelables.
      Notre plan prévoit la création de 50 000 logements sociaux par an.
    `,
    description: 'Parliamentary debate on environment and housing'
  }
]

/**
 * Collect promises from a source
 */
async function collectPromises(source: PromiseSource, apiBaseUrl: string, adminToken: string) {
  console.log(`\n📥 Collecting promises from: ${source.description || source.sourceUrl}`)
  console.log(`   Politician: ${source.politicianName}`)
  console.log(`   Source: ${source.sourceUrl}`)
  console.log(`   Type: ${source.sourceType}`)

  try {
    const response = await fetch(`${apiBaseUrl}/api/promises/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        politicianId: source.politicianId,
        text: source.text,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        date: source.date
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error(`   ❌ Failed: ${result.error}`)
      if (result.details) {
        console.error(`   Details: ${result.details}`)
      }
      if (result.archiveUrl) {
        console.log(`   💡 Archive available: ${result.archiveUrl}`)
      }
      return { success: false, error: result.error }
    }

    console.log(`   ✅ Success: ${result.stored} promises stored`)
    console.log(`   📊 URL Status: ${result.urlValidation.status} (HTTP ${result.urlValidation.httpStatus})`)
    console.log(`   ⏱️  Response time: ${result.urlValidation.responseTime}ms`)

    if (result.promises && result.promises.length > 0) {
      console.log(`   \n   Extracted promises:`)
      result.promises.forEach((promise: any, index: number) => {
        console.log(`     ${index + 1}. "${promise.promise_text.substring(0, 80)}..."`)
        console.log(`        Category: ${promise.category}, Confidence: ${(promise.confidence_score * 100).toFixed(0)}%`)
      })
    }

    return { success: true, data: result }
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Promise Collection Script with URL Validation\n')

  // Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN

  if (!ADMIN_TOKEN) {
    console.error('❌ Error: ADMIN_TOKEN environment variable not set')
    console.error('   Set it with: export ADMIN_TOKEN="your-admin-jwt-token"')
    process.exit(1)
  }

  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Admin Token: ${ADMIN_TOKEN.substring(0, 20)}...`)
  console.log(`\nProcessing ${exampleSources.length} sources...\n`)

  const results = []

  for (const source of exampleSources) {
    const result = await collectPromises(source, API_BASE_URL, ADMIN_TOKEN)
    results.push(result)

    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Collection Summary')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`Total sources processed: ${results.length}`)
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\nFailed sources:')
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`  - ${exampleSources[index].description || exampleSources[index].sourceUrl}`)
        console.log(`    Error: ${result.error}`)
      }
    })
  }

  console.log('\n✨ Collection complete!')
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export { collectPromises, exampleSources }
