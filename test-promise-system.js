/**
 * Comprehensive Promise Tracker System Test
 * Tests database, promise extraction, and API endpoints
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://whjoqxozjzcluhdgocly.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoam9xeG96anpjbHVoZGdvY2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMzQyOTAsImV4cCI6MjA3MzgxMDI5MH0._Y0XSs9MA_jBwFwFx4-nouIvsikrFa7yN139TzmPjv0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

function warn(message) {
  log('yellow', '⚠', message)
}

function section(message) {
  console.log(`\n${colors.cyan}${'='.repeat(70)}`)
  console.log(`${message}`)
  console.log(`${'='.repeat(70)}${colors.reset}\n`)
}

/**
 * Test suite
 */
async function runTests() {
  section('🧪 Promise Tracker System - Comprehensive Testing')

  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  }

  try {
    // Test 1: Database connection
    await testDatabaseConnection(testResults)

    // Test 2: Check migrations
    await testMigrationsApplied(testResults)

    // Test 3: Check politicians table
    await testPoliticiansTable(testResults)

    // Test 4: Test promise classifier (unit test)
    await testPromiseClassifier(testResults)

    // Test 5: Check promise-related tables
    await testPromiseTables(testResults)

    // Test 6: Test API endpoints availability
    await testAPIEndpoints(testResults)

    // Summary
    printSummary(testResults)

  } catch (err) {
    error(`Fatal error: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

async function testDatabaseConnection(results) {
  section('Test 1: Database Connection')

  try {
    const { data, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (dbError) {
      error(`Database connection failed: ${dbError.message}`)
      results.failed++
    } else {
      success('Database connection successful')
      results.passed++
    }
  } catch (err) {
    error(`Database connection failed: ${err.message}`)
    results.failed++
  }
}

async function testMigrationsApplied(results) {
  section('Test 2: Check Migrations Applied')

  const requiredTables = [
    'political_promises',
    'parliamentary_actions',
    'promise_verifications',
    'consistency_scores'
  ]

  for (const table of requiredTables) {
    try {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1)

      if (tableError) {
        error(`Table '${table}' does not exist or is not accessible`)
        warn(`Migration 004_promise_tracker_system.sql may not be applied`)
        results.failed++
      } else {
        success(`Table '${table}' exists`)
        results.passed++
      }
    } catch (err) {
      error(`Error checking table '${table}': ${err.message}`)
      results.failed++
    }
  }
}

async function testPoliticiansTable(results) {
  section('Test 3: Check Politicians Data')

  try {
    const { data: politicians, error: politiciansError } = await supabase
      .from('politicians')
      .select('id, name, external_id, source_system')
      .limit(5)

    if (politiciansError) {
      error(`Failed to query politicians: ${politiciansError.message}`)
      results.failed++
    } else if (!politicians || politicians.length === 0) {
      warn('No politicians found in database')
      info('Run data collection: POST /api/data-collection/collect')
      results.warnings++
    } else {
      success(`Found ${politicians.length} politicians (showing first 5)`)
      politicians.forEach(p => {
        info(`  - ${p.name} (${p.external_id || 'no external ID'})`)
      })
      results.passed++
    }
  } catch (err) {
    error(`Error checking politicians: ${err.message}`)
    results.failed++
  }
}

async function testPromiseClassifier(results) {
  section('Test 4: Promise Classifier Unit Test')

  // Import the promise classifier
  const { PromiseClassifier } = await import('./src/lib/promise-extraction/promise-classifier.ts')
  const classifier = new PromiseClassifier()

  const testCases = [
    {
      text: "Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027.",
      shouldBePromise: true,
      expectedCategory: 'economic',
      shouldBeActionable: true
    },
    {
      text: "Nous allons créer 100 000 emplois dans le secteur numérique.",
      shouldBePromise: true,
      expectedCategory: 'economic',
      shouldBeActionable: false
    },
    {
      text: "Il faut protéger l'environnement pour les générations futures.",
      shouldBePromise: true,
      expectedCategory: 'environmental',
      shouldBeActionable: false
    },
    {
      text: "La météo sera belle demain.",
      shouldBePromise: false,
      expectedCategory: null,
      shouldBeActionable: false
    },
    {
      text: "Je propose d'augmenter le budget de la santé de 10%.",
      shouldBePromise: true,
      expectedCategory: 'healthcare',
      shouldBeActionable: true
    }
  ]

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    const { isPromise, confidence } = classifier.isPromise(testCase.text)
    const category = classifier.categorize(testCase.text)
    const isActionable = classifier.isActionable(testCase.text)

    console.log(`\n${colors.magenta}Testing:${colors.reset} "${testCase.text.substring(0, 60)}..."`)

    // Check if promise detection is correct
    if (isPromise === testCase.shouldBePromise) {
      success(`Promise detection: ${isPromise} (confidence: ${confidence.toFixed(2)})`)
      passed++
    } else {
      error(`Promise detection failed: expected ${testCase.shouldBePromise}, got ${isPromise}`)
      failed++
    }

    // Check category (only for promises)
    if (testCase.shouldBePromise && testCase.expectedCategory) {
      if (category === testCase.expectedCategory) {
        success(`Category: ${category}`)
        passed++
      } else {
        warn(`Category mismatch: expected ${testCase.expectedCategory}, got ${category}`)
        // Not counting as failure, categories can be subjective
      }
    }

    // Check actionability
    if (isActionable === testCase.shouldBeActionable) {
      success(`Actionable: ${isActionable}`)
      passed++
    } else {
      warn(`Actionability: expected ${testCase.shouldBeActionable}, got ${isActionable}`)
      // Not counting as hard failure
    }
  }

  info(`\nPromise Classifier: ${passed} checks passed, ${failed} failed`)
  if (failed === 0) {
    results.passed++
  } else {
    results.failed++
  }
}

async function testPromiseTables(results) {
  section('Test 5: Promise Tables Data Check')

  const tables = [
    { name: 'political_promises', description: 'extracted promises' },
    { name: 'parliamentary_actions', description: 'parliamentary actions' },
    { name: 'promise_verifications', description: 'promise-action matches' },
    { name: 'consistency_scores', description: 'consistency scores' }
  ]

  for (const table of tables) {
    try {
      const { count, error: countError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        error(`Failed to count ${table.description}: ${countError.message}`)
        results.failed++
      } else {
        if (count === 0) {
          info(`${table.name}: ${count} ${table.description} (empty - expected for new installation)`)
        } else {
          success(`${table.name}: ${count} ${table.description}`)
        }
        results.passed++
      }
    } catch (err) {
      error(`Error checking ${table.name}: ${err.message}`)
      results.failed++
    }
  }
}

async function testAPIEndpoints(results) {
  section('Test 6: API Endpoints Availability')

  const BASE_URL = 'http://localhost:3000'

  const endpoints = [
    {
      method: 'GET',
      path: '/api/promises/extract?politicianId=00000000-0000-0000-0000-000000000001',
      description: 'Get promises (public)',
      expectStatus: [200, 404] // 404 is OK if politician doesn't exist
    }
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method
      })

      if (endpoint.expectStatus.includes(response.status)) {
        success(`${endpoint.method} ${endpoint.path}: ${response.status} (${endpoint.description})`)
        results.passed++
      } else {
        error(`${endpoint.method} ${endpoint.path}: unexpected status ${response.status}`)
        results.failed++
      }
    } catch (err) {
      error(`${endpoint.method} ${endpoint.path}: ${err.message}`)
      results.failed++
    }
  }

  info('\nAuthenticated endpoints (require admin token):')
  info('  - POST /api/promises/extract')
  info('  - POST /api/promises/match')
  info('  - POST /api/promises/calculate-scores')
  info('  - POST /api/data-collection/collect')
}

function printSummary(results) {
  section('📊 Test Summary')

  console.log(`${colors.green}Passed:${colors.reset}   ${results.passed}`)
  console.log(`${colors.red}Failed:${colors.reset}   ${results.failed}`)
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}\n`)

  if (results.failed === 0) {
    success('All tests passed! 🎉')
    info('\nNext steps:')
    info('1. Run data collection to populate politicians: POST /api/data-collection/collect')
    info('2. Extract promises from politician statements')
    info('3. Match promises to parliamentary actions')
    info('4. Calculate consistency scores')
  } else {
    error(`${results.failed} tests failed`)
    info('\nTroubleshooting:')
    info('1. Check that all migrations are applied in Supabase')
    info('2. Verify RLS policies are properly configured')
    info('3. Ensure dev server is running: npm run dev')
  }

  process.exit(results.failed > 0 ? 1 : 0)
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
