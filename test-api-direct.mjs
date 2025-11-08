/**
 * Direct API Testing - Promise Tracker
 * Tests API endpoints with real HTTP requests
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://whjoqxozjzcluhdgocly.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoam9xeG96anpjbHVoZGdvY2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMzQyOTAsImV4cCI6MjA3MzgxMDI5MH0._Y0XSs9MA_jBwFwFx4-nouIvsikrFa7yN139TzmPjv0'
const BASE_URL = 'http://localhost:3000'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const success = (msg) => console.log(`${c.green}✓${c.reset} ${msg}`)
const error = (msg) => console.log(`${c.red}✗${c.reset} ${msg}`)
const info = (msg) => console.log(`${c.blue}ℹ${c.reset} ${msg}`)
const section = (msg) => console.log(`\n${c.cyan}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${c.reset}\n`)

async function runTests() {
  section('🧪 Promise Tracker - Direct API Testing')

  try {
    // Step 1: Get a politician to test with
    const politician = await getPolitician()
    if (!politician) {
      error('No politician found to test with')
      return
    }

    // Step 2: Test GET promises endpoint (public)
    await testGetPromises(politician.id)

    // Step 3: Test promise classifier logic via API
    await testPromiseExtraction(politician)

    // Step 4: Show next steps
    printNextSteps(politician)

  } catch (err) {
    error(`Test failed: ${err.message}`)
    console.error(err)
  }
}

async function getPolitician() {
  section('Step 1: Get Test Politician')

  const { data, error: err } = await supabase
    .from('politicians')
    .select('id, name, party')
    .limit(1)
    .single()

  if (err || !data) {
    error('No politicians found in database')
    info('You need to run: POST /api/data-collection/collect first')
    return null
  }

  success(`Using politician: ${data.name} (${data.party || 'no party'})`)
  info(`Politician ID: ${data.id}`)

  return data
}

async function testGetPromises(politicianId) {
  section('Step 2: Test GET Promises Endpoint')

  const url = `${BASE_URL}/api/promises/extract?politicianId=${politicianId}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (response.ok) {
      success('GET /api/promises/extract - Working')
      info(`Status: ${response.status}`)
      info(`Response: ${JSON.stringify(data, null, 2)}`)

      if (data.summary) {
        info(`Total promises: ${data.summary.total}`)
        info(`Pending: ${data.summary.pending}`)
        info(`Verified: ${data.summary.verified}`)
        info(`Actionable: ${data.summary.actionable}`)
      }
    } else {
      error(`GET /api/promises/extract - Failed (${response.status})`)
      console.log(data)
    }
  } catch (err) {
    error(`GET /api/promises/extract - Error: ${err.message}`)
  }
}

async function testPromiseExtraction(politician) {
  section('Step 3: Test Promise Extraction Logic')

  info('Testing promise extraction with sample French political text...')

  const samplePromises = [
    {
      text: "Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027",
      expected: { isPromise: true, category: 'economic', actionable: true }
    },
    {
      text: "Nous allons créer 100 000 emplois dans le secteur numérique",
      expected: { isPromise: true, category: 'economic', actionable: false }
    },
    {
      text: "Je propose d'augmenter le budget de la santé de 10%",
      expected: { isPromise: true, category: 'healthcare', actionable: true }
    }
  ]

  info('\nSample promises that would be extracted:')
  samplePromises.forEach((p, i) => {
    console.log(`\n  ${i + 1}. "${p.text}"`)
    info(`     Expected: Promise=${p.expected.isPromise}, Category=${p.expected.category}, Actionable=${p.expected.actionable}`)
  })

  info('\nTo actually extract these, you need admin authentication:')
  info(`POST ${BASE_URL}/api/promises/extract`)
}

function printNextSteps(politician) {
  section('📝 Next Steps - Manual Testing with Admin Auth')

  console.log('To test the full promise tracker workflow:\n')

  console.log('1. Extract promises from politician statements:')
  console.log(c.yellow)
  console.log(`curl -X POST ${BASE_URL}/api/promises/extract \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "politicianId": "${politician.id}",
    "text": "Je m'"'"'engage à réduire les impôts de 5 milliards d'"'"'euros d'"'"'ici 2027. Nous allons créer 100 000 emplois dans le secteur numérique.",
    "sourceUrl": "https://example.com/interview",
    "sourceType": "interview",
    "date": "2024-01-15T10:00:00Z"
  }'`)

  console.log('\n2. Collect parliamentary data:')
  console.log(`curl -X POST ${BASE_URL}/api/data-collection/collect \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "type": "deputies",
    "limit": 10
  }'`)

  console.log('\n3. Match promises to actions:')
  console.log(`curl -X POST ${BASE_URL}/api/promises/match \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "politicianId": "${politician.id}",
    "minConfidence": 0.6
  }'`)

  console.log('\n4. Calculate consistency scores:')
  console.log(`curl -X POST ${BASE_URL}/api/promises/calculate-scores \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "politicianId": "${politician.id}"
  }'`)

  console.log(c.reset)

  section('🔐 Getting Admin Token')
  info('1. Open http://localhost:3000 in your browser')
  info('2. Login with an admin account')
  info('3. Open Developer Tools > Application > Local Storage')
  info('4. Find and copy the auth token')
  info('5. Use it in the Authorization header above')
}

// Run
runTests()
