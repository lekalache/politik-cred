/**
 * Promise Tracker API Testing Script
 * Tests all promise tracker endpoints with realistic data
 */

const BASE_URL = 'http://localhost:3000'

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, prefix, message) {
  console.log(`${colors[color]}${prefix}${colors.reset} ${message}`)
}

function success(message) {
  log('green', '✓', message)
}

function error(message) {
  log('red', '✗', message)
}

function info(message) {
  log('blue', 'ℹ', message)
}

function section(message) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`)
  console.log(`${message}`)
  console.log(`${'='.repeat(60)}${colors.reset}\n`)
}

// Test data
const testData = {
  // Sample French political promises
  promiseTexts: {
    macron: `Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027.
      Nous allons créer 100 000 emplois dans le secteur numérique.
      Je propose d'augmenter le budget de la santé de 10%.
      Nous devons protéger l'environnement pour les générations futures.
      Il faut investir dans l'éducation et la formation professionnelle.`,

    lePen: `Je promets de réduire l'immigration illégale de 80%.
      Nous allons voter contre toute nouvelle réglementation européenne.
      Je m'engage à baisser la TVA sur l'énergie à 5.5%.
      Nous proposons d'interdire le port du voile dans l'espace public.
      Je vais créer un référendum sur la souveraineté nationale.`,

    melenchon: `Nous nous engageons à augmenter le SMIC de 200 euros par mois.
      Je propose de nationaliser les autoroutes et EDF.
      Nous allons instaurer la retraite à 60 ans pour tous.
      Je m'engage à sortir de l'OTAN d'ici la fin du mandat.
      Nous ferons une 6ème République avec une assemblée constituante.`
  },

  // Parliamentary actions (for matching)
  parliamentaryActions: [
    {
      title: "Projet de loi de finances - Baisse d'impôt",
      description: "Vote pour la réduction des impôts de 4 milliards d'euros",
      vote: 'pour',
      date: '2024-12-15'
    },
    {
      title: "Amendement protection sociale",
      description: "Augmentation du budget santé de 8%",
      vote: 'pour',
      date: '2024-11-20'
    },
    {
      title: "Loi immigration",
      description: "Renforcement des contrôles aux frontières",
      vote: 'contre',
      date: '2024-10-05'
    },
    {
      title: "Réforme retraites",
      description: "Maintien de l'âge légal à 64 ans",
      vote: 'abstention',
      date: '2024-09-12'
    }
  ]
}

// Mock authentication token (you'll need to replace this with a real admin token)
let authToken = null

/**
 * Test suite
 */
async function runTests() {
  section('🧪 Promise Tracker API Testing Suite')

  try {
    // Test 1: Health check
    await testHealthCheck()

    // Test 2: Check database for politicians
    await testGetPoliticians()

    // Test 3: Test promise extraction (requires admin auth)
    info('Note: Promise extraction requires admin authentication')
    info('Skipping authenticated tests for now - see manual testing section below')

    // Test 4: Test promise retrieval (public endpoint)
    await testGetPromises()

    section('📋 Manual Testing Instructions')
    console.log('To test authenticated endpoints, you need to:')
    console.log('1. Login as admin user via the web interface')
    console.log('2. Get your auth token from browser DevTools (localStorage)')
    console.log('3. Use curl commands below:\n')

    printCurlExamples()

  } catch (err) {
    error(`Test suite failed: ${err.message}`)
    console.error(err)
  }
}

async function testHealthCheck() {
  section('Test 1: Server Health Check')

  try {
    const response = await fetch(`${BASE_URL}/api/health`)

    if (response.ok) {
      success('Server is responding')
    } else {
      info(`Server returned status ${response.status} (health endpoint may not exist, checking main page...)`)

      // Try main page
      const mainResponse = await fetch(BASE_URL)
      if (mainResponse.ok) {
        success('Server is running (main page accessible)')
      }
    }
  } catch (err) {
    error(`Server is not accessible: ${err.message}`)
    throw err
  }
}

async function testGetPoliticians() {
  section('Test 2: Check Database for Politicians')

  try {
    // This assumes there's an API endpoint to get politicians
    // If not, we'll need to check via Supabase directly
    const response = await fetch(`${BASE_URL}/api/politicians`)

    if (response.ok) {
      const data = await response.json()
      success(`Found ${data.length || 0} politicians in database`)

      if (data.length > 0) {
        info(`Sample politician: ${data[0].name} (ID: ${data[0].id})`)
      } else {
        info('No politicians found - you may need to run data collection first')
      }
    } else {
      info('Politicians API endpoint not found or returned error')
      info('You may need to run: POST /api/data-collection/collect')
    }
  } catch (err) {
    info(`Could not fetch politicians: ${err.message}`)
  }
}

async function testGetPromises() {
  section('Test 3: Get Promises (Public Endpoint)')

  try {
    // Try to get promises for a test politician ID
    const testPoliticianId = '00000000-0000-0000-0000-000000000001'
    const response = await fetch(
      `${BASE_URL}/api/promises/extract?politicianId=${testPoliticianId}`
    )

    if (response.ok) {
      const data = await response.json()
      success('Promises endpoint is accessible')
      console.log(JSON.stringify(data, null, 2))
    } else if (response.status === 404) {
      info('No promises found for test politician ID (expected for new installation)')
    } else {
      error(`Unexpected response: ${response.status}`)
    }
  } catch (err) {
    error(`Failed to get promises: ${err.message}`)
  }
}

function printCurlExamples() {
  console.log(colors.yellow)

  console.log('# 1. Extract promises from text (requires admin auth):')
  console.log(`curl -X POST ${BASE_URL}/api/promises/extract \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -d '{
    "politicianId": "POLITICIAN_UUID",
    "text": "Je m'"'"'engage à réduire les impôts de 5 milliards d'"'"'euros d'"'"'ici 2027.",
    "sourceUrl": "https://example.com/campaign",
    "sourceType": "campaign_site",
    "date": "2024-01-15T10:00:00Z"
  }'`)

  console.log('\n# 2. Match promises to parliamentary actions (requires admin auth):')
  console.log(`curl -X POST ${BASE_URL}/api/promises/match \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -d '{
    "politicianId": "POLITICIAN_UUID",
    "minConfidence": 0.6
  }'`)

  console.log('\n# 3. Calculate consistency scores (requires admin auth):')
  console.log(`curl -X POST ${BASE_URL}/api/promises/calculate-scores \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -d '{
    "politicianId": "POLITICIAN_UUID"
  }'`)

  console.log('\n# 4. Collect data from Assemblée Nationale (requires admin auth):')
  console.log(`curl -X POST ${BASE_URL}/api/data-collection/collect \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -d '{
    "type": "deputies",
    "limit": 10
  }'`)

  console.log('\n# 5. Get promises for a politician (public):')
  console.log(`curl ${BASE_URL}/api/promises/extract?politicianId=POLITICIAN_UUID`)

  console.log(colors.reset)
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
