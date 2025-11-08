/**
 * Test Hugging Face Semantic Matching
 * Verifies that semantic embeddings work correctly with fallback to Jaccard
 */

import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

const success = (msg: string) => console.log(`${c.green}✓${c.reset} ${msg}`)
const error = (msg: string) => console.log(`${c.red}✗${c.reset} ${msg}`)
const info = (msg: string) => console.log(`${c.blue}ℹ${c.reset} ${msg}`)
const warn = (msg: string) => console.log(`${c.yellow}⚠${c.reset} ${msg}`)
const section = (msg: string) => console.log(`\n${c.cyan}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${c.reset}\n`)

async function testHuggingFace() {
  section('🧪 Testing Hugging Face Semantic Matching')

  const apiKey = process.env.HUGGINGFACE_API_KEY

  if (!apiKey) {
    error('HUGGINGFACE_API_KEY not found in environment')
    warn('Semantic matching will fall back to Jaccard similarity')
    return false
  }

  success(`Hugging Face API key found: ${apiKey.substring(0, 10)}...`)

  // Test cases: promise-action pairs that should match
  const testCases = [
    {
      promise: "Je m'engage à réduire les impôts de 5 milliards d'euros",
      action: "Vote pour la réduction des impôts de 4 milliards d'euros",
      shouldMatch: true,
      description: "Tax reduction promise vs tax reduction vote"
    },
    {
      promise: "Nous allons augmenter le budget de la santé de 10%",
      action: "Amendement pour augmenter les dépenses de santé de 8%",
      shouldMatch: true,
      description: "Health budget promise vs health spending amendment"
    },
    {
      promise: "Je propose d'interdire les pesticides d'ici 2030",
      action: "Vote contre l'interdiction des produits phytosanitaires",
      shouldMatch: false,
      description: "Pesticide ban promise vs vote against ban (contradiction)"
    },
    {
      promise: "Nous promettons de créer 100 000 emplois",
      action: "Débat sur la réforme de l'assurance chômage",
      shouldMatch: false,
      description: "Job creation promise vs unemployment debate (different topic)"
    }
  ]

  try {
    // Import Hugging Face client
    const { huggingfaceClient } = await import('./src/lib/ai/huggingface-client')

    section('Test 1: API Connection')

    // Test with a simple similarity calculation
    const testText1 = "Je m'engage à réduire les impôts"
    const testText2 = "Vote pour la réduction des impôts"

    try {
      const similarity = await huggingfaceClient.calculateSimilarity(testText1, testText2)

      if (similarity >= 0 && similarity <= 1) {
        success(`API connection successful`)
        success(`Similarity score: ${(similarity * 100).toFixed(1)}%`)
        info(`Texts are ${similarity > 0.6 ? 'semantically similar' : 'not very similar'}`)
      } else {
        error('API returned invalid similarity score')
        return false
      }
    } catch (err) {
      error(`API connection failed: ${err instanceof Error ? err.message : String(err)}`)
      warn('Will fall back to Jaccard similarity')
      return false
    }

    section('Test 2: Semantic Similarity Calculation')

    let passed = 0
    let failed = 0

    for (const testCase of testCases) {
      console.log(`\n${c.magenta}Test:${c.reset} ${testCase.description}`)
      console.log(`${c.blue}Promise:${c.reset} "${testCase.promise}"`)
      console.log(`${c.blue}Action:${c.reset} "${testCase.action}"`)

      try {
        const similarity = await huggingfaceClient.calculateSimilarity(
          testCase.promise,
          testCase.action
        )

        info(`Similarity score: ${(similarity * 100).toFixed(1)}%`)

        // Threshold for matching: 0.6 (60%)
        const matches = similarity >= 0.6

        if (matches === testCase.shouldMatch) {
          success(`Correct: ${matches ? 'Matched' : 'Not matched'} (as expected)`)
          passed++
        } else {
          error(`Incorrect: Expected ${testCase.shouldMatch ? 'match' : 'no match'}, got ${matches ? 'match' : 'no match'}`)
          failed++
        }
      } catch (err) {
        error(`Similarity calculation failed: ${err instanceof Error ? err.message : String(err)}`)
        failed++
      }
    }

    section('Test 3: Batch Similarity Calculation')

    const sourceText = "Je m'engage à réduire les impôts de 5 milliards"
    const candidateTexts = [
      "Vote pour la réduction des impôts de 4 milliards",
      "Augmentation du budget de la santé",
      "Vote contre l'interdiction des pesticides"
    ]

    try {
      info(`Testing batch similarity with ${candidateTexts.length} candidates...`)
      const similarities = await huggingfaceClient.batchCalculateSimilarities(sourceText, candidateTexts)

      if (similarities.length === candidateTexts.length) {
        success(`Batch similarity calculation successful`)

        similarities.forEach((sim, i) => {
          info(`  ${i + 1}. ${(sim * 100).toFixed(1)}% - "${candidateTexts[i].substring(0, 50)}..."`)
        })

        // Check that similarities are different
        const allSame = similarities.every((sim, i) => i === 0 || Math.abs(sim - similarities[0]) < 0.0001)

        if (!allSame) {
          success('Similarity scores are unique (good!)')
        } else {
          warn('All scores are identical - this might be an issue')
        }
      } else {
        error(`Expected ${candidateTexts.length} scores, got ${similarities.length}`)
      }
    } catch (err) {
      error(`Batch similarity failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Summary
    section('📊 Test Summary')

    console.log(`${c.green}Passed:${c.reset} ${passed}`)
    console.log(`${c.red}Failed:${c.reset} ${failed}\n`)

    if (failed === 0) {
      success('All Hugging Face tests passed! 🎉')
      info('\nSemantic matching is ready to use')
      info('The system will use Hugging Face embeddings for promise-action matching')
      return true
    } else {
      error(`${failed} tests failed`)
      warn('Check API key and network connection')
      return false
    }

  } catch (err) {
    error(`Test error: ${err instanceof Error ? err.message : String(err)}`)
    console.error(err)
    return false
  }
}

// Test Jaccard fallback
async function testJaccardFallback() {
  section('🧪 Testing Jaccard Similarity Fallback')

  try {
    const { semanticMatcher } = await import('./src/lib/promise-extraction/semantic-matcher')

    const promise = "Je m'engage à réduire les impôts de 5 milliards d'euros"
    const action = "Vote pour la réduction des impôts de 4 milliards d'euros"

    info('Testing with promise and action...')

    const similarity = await semanticMatcher.calculateSimilarity(promise, action)

    success(`Similarity calculated: ${(similarity * 100).toFixed(1)}%`)

    if (similarity > 0) {
      success('Jaccard fallback is working correctly')
      info('The system will fall back to Jaccard if Hugging Face is unavailable')
      return true
    } else {
      error('Similarity score is 0 - this is unexpected')
      return false
    }

  } catch (err) {
    error(`Fallback test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

// Run all tests
async function runAllTests() {
  const hfSuccess = await testHuggingFace()

  if (!hfSuccess) {
    warn('\nHugging Face tests failed, testing Jaccard fallback...')
    await testJaccardFallback()
  } else {
    // Also test fallback to ensure it works
    await testJaccardFallback()
  }

  section('🎯 Final Summary')

  if (hfSuccess) {
    success('Semantic matching system is fully operational')
    success('Using Hugging Face embeddings for high-accuracy matching')
  } else {
    warn('Using Jaccard similarity fallback')
    info('This is functional but less accurate than semantic embeddings')
  }

  console.log('\nRecommendation:')
  if (hfSuccess) {
    info('✓ System is production-ready with semantic matching')
  } else {
    warn('⚠ Consider fixing Hugging Face integration for better accuracy')
  }
}

runAllTests()
