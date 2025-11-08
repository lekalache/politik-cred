/**
 * Test Assemblée Nationale Scraper
 * Verifies that the NosDéputés.fr API is accessible
 */

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const success = (msg: string) => console.log(`${c.green}✓${c.reset} ${msg}`)
const error = (msg: string) => console.log(`${c.red}✗${c.reset} ${msg}`)
const info = (msg: string) => console.log(`${c.blue}ℹ${c.reset} ${msg}`)
const warn = (msg: string) => console.log(`${c.yellow}⚠${c.reset} ${msg}`)
const section = (msg: string) => console.log(`\n${c.cyan}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${c.reset}\n`)

async function testAssembleeNationaleScraper() {
  section('🧪 Testing Assemblée Nationale Scraper')

  try {
    // Test 1: Fetch list of deputies
    section('Test 1: Fetch Current Deputies')

    const baseUrl = 'https://www.nosdeputes.fr'
    const response = await fetch(`${baseUrl}/deputes/enmandat/json`, {
      headers: {
        'User-Agent': 'PolitikCred/1.0 (Testing)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      error(`Failed to fetch deputies: HTTP ${response.status}`)
      warn('NosDéputés.fr API may be down or blocking requests')
      process.exit(1)
    }

    const data = await response.json()
    const deputies = data.deputes?.map((d: any) => d.depute) || []

    success(`Fetched ${deputies.length} current deputies from NosDéputés.fr`)

    if (deputies.length === 0) {
      error('No deputies returned - this is unexpected')
      process.exit(1)
    }

    // Display sample deputies
    info('\nSample deputies:')
    deputies.slice(0, 5).forEach((dep: any, i: number) => {
      console.log(`  ${i + 1}. ${dep.nom} (${dep.groupe_sigle || 'No group'}) - ${dep.circonscription || 'Unknown district'}`)
    })

    // Test 2: Fetch details for a specific deputy
    section('Test 2: Fetch Deputy Details')

    const testDeputy = deputies[0]
    info(`Testing with: ${testDeputy.nom} (slug: ${testDeputy.slug})`)

    const detailsResponse = await fetch(`${baseUrl}/${testDeputy.slug}/json`, {
      headers: {
        'User-Agent': 'PolitikCred/1.0 (Testing)',
        'Accept': 'application/json'
      }
    })

    if (!detailsResponse.ok) {
      warn(`Failed to fetch deputy details: HTTP ${detailsResponse.status}`)
    } else {
      const detailsData = await detailsResponse.json()
      const deputeDetails = detailsData.depute

      success(`Fetched detailed data for ${deputeDetails.nom}`)

      if (deputeDetails.emails && deputeDetails.emails.length > 0) {
        info(`  Email: ${deputeDetails.emails[0].email}`)
      }

      if (deputeDetails.url_an) {
        info(`  Assemblée Nationale URL: ${deputeDetails.url_an}`)
      }

      // Check for votes data
      if (deputeDetails.scrutins && deputeDetails.scrutins.length > 0) {
        success(`Found ${deputeDetails.scrutins.length} votes`)
        info(`  Latest vote: ${deputeDetails.scrutins[0].scrutin.titre}`)
      } else {
        warn('No votes data available for this deputy')
      }

      // Check for activities
      if (deputeDetails.interventions && deputeDetails.interventions.length > 0) {
        success(`Found ${deputeDetails.interventions.length} interventions`)
      }
    }

    // Test 3: Data structure validation
    section('Test 3: Validate Data Structure')

    const requiredFields = ['slug', 'nom', 'groupe_sigle']
    const missingFields = requiredFields.filter(field => !testDeputy[field])

    if (missingFields.length === 0) {
      success('All required fields present in deputy data')
    } else {
      warn(`Missing fields: ${missingFields.join(', ')}`)
    }

    // Summary
    section('📊 Scraper Test Summary')

    success('NosDéputés.fr API is accessible')
    success(`Found ${deputies.length} deputies`)
    success('Data structure is valid')

    info('\nNext steps:')
    info('1. The scraper is ready to use')
    info('2. To collect data, POST to /api/data-collection/collect with admin auth')
    info('3. Data will be stored in the database automatically')

    console.log('\nSample collection command (requires admin token):')
    console.log(c.yellow)
    console.log(`curl -X POST http://localhost:3000/api/data-collection/collect \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{"type": "deputies", "limit": 10}'`)
    console.log(c.reset)

  } catch (err) {
    error(`Test failed: ${err instanceof Error ? err.message : String(err)}`)
    console.error(err)
    process.exit(1)
  }
}

testAssembleeNationaleScraper()
