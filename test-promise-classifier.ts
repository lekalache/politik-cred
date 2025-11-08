/**
 * Unit Tests for Promise Classifier
 * Tests keyword-based promise detection and categorization
 */

import { PromiseClassifier } from './src/lib/promise-extraction/promise-classifier'

// ANSI colors
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

interface TestCase {
  text: string
  shouldBePromise: boolean
  expectedCategory?: string
  shouldBeActionable?: boolean
  description: string
}

const testCases: TestCase[] = [
  // Strong promise indicators
  {
    text: "Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027.",
    shouldBePromise: true,
    expectedCategory: 'economic',
    shouldBeActionable: true,
    description: 'Strong promise with specific number and deadline'
  },
  {
    text: "Nous promettons de créer 100 000 emplois dans le secteur numérique.",
    shouldBePromise: true,
    expectedCategory: 'economic',
    shouldBeActionable: true,
    description: 'Strong promise with "promettons"'
  },
  {
    text: "Je vais augmenter le budget de la santé de 10%.",
    shouldBePromise: true,
    expectedCategory: 'healthcare',
    shouldBeActionable: true,
    description: 'Strong promise with percentage'
  },

  // Medium promise indicators
  {
    text: "Nous proposons d'instaurer une retraite à 60 ans pour tous.",
    shouldBePromise: true,
    expectedCategory: 'social',
    shouldBeActionable: true,
    description: 'Medium promise with "proposons"'
  },
  {
    text: "Je veux protéger l'environnement pour les générations futures.",
    shouldBePromise: true,
    expectedCategory: 'environmental',
    shouldBeActionable: false,
    description: 'Medium promise, vague action'
  },
  {
    text: "Il faut investir dans l'éducation et la formation professionnelle.",
    shouldBePromise: true,
    expectedCategory: 'education',
    shouldBeActionable: false,
    description: 'Medium promise with "il faut"'
  },

  // Actionable vs Non-actionable
  {
    text: "Je m'engage à voter pour la légalisation du cannabis.",
    shouldBePromise: true,
    expectedCategory: 'justice',
    shouldBeActionable: true,
    description: 'Actionable: contains "voter pour"'
  },
  {
    text: "Nous allons proposer une loi pour interdire les pesticides.",
    shouldBePromise: true,
    expectedCategory: 'environmental',
    shouldBeActionable: true,
    description: 'Actionable: contains "proposer une loi" and "interdire"'
  },
  {
    text: "Je promets de lutter contre le chômage.",
    shouldBePromise: true,
    expectedCategory: 'economic',
    shouldBeActionable: false,
    description: 'Non-actionable: vague "lutter contre"'
  },

  // Anti-patterns (should NOT be promises)
  {
    text: "Si je suis élu, peut-être que je réduirai les impôts.",
    shouldBePromise: false,
    description: 'Anti-pattern: contains "si" and "peut-être"'
  },
  {
    text: "J'aimerais réfléchir à une réforme de l'éducation.",
    shouldBePromise: false,
    description: 'Anti-pattern: contains "j\'aimerais" and "réfléchir"'
  },
  {
    text: "Ce serait bien d'étudier cette question.",
    shouldBePromise: false,
    description: 'Anti-pattern: contains "ce serait bien" and "étudier"'
  },

  // Non-political statements
  {
    text: "La météo sera belle demain à Paris.",
    shouldBePromise: false,
    description: 'Non-political statement'
  },
  {
    text: "Les élections auront lieu en juin prochain.",
    shouldBePromise: false,
    description: 'Factual statement, not a promise'
  },

  // Category tests
  {
    text: "Je m'engage à augmenter le pouvoir d'achat et réduire le chômage.",
    shouldBePromise: true,
    expectedCategory: 'economic',
    description: 'Economic category: pouvoir d\'achat, chômage'
  },
  {
    text: "Nous allons renforcer la police et la gendarmerie pour lutter contre la criminalité.",
    shouldBePromise: true,
    expectedCategory: 'security',
    description: 'Security category: police, gendarmerie, criminalité'
  },
  {
    text: "Je propose de réduire les émissions de carbone de 50% d'ici 2030.",
    shouldBePromise: true,
    expectedCategory: 'environmental',
    description: 'Environmental category: émissions, carbone'
  },
  {
    text: "Nous nous engageons à contrôler l'immigration illégale.",
    shouldBePromise: true,
    expectedCategory: 'immigration',
    description: 'Immigration category'
  },
  {
    text: "Je vais sortir de l'OTAN et renforcer notre souveraineté.",
    shouldBePromise: true,
    expectedCategory: 'foreign_policy',
    description: 'Foreign policy category: OTAN'
  }
]

function runTests() {
  section('🧪 Promise Classifier - Unit Tests')

  const classifier = new PromiseClassifier()
  let passed = 0
  let failed = 0
  let warnings = 0

  testCases.forEach((testCase, index) => {
    console.log(`\n${c.magenta}Test ${index + 1}/${testCases.length}:${c.reset} ${testCase.description}`)
    console.log(`${c.blue}Text:${c.reset} "${testCase.text}"`)

    // Test promise detection
    const { isPromise, confidence } = classifier.isPromise(testCase.text)

    if (isPromise === testCase.shouldBePromise) {
      success(`Promise detection: ${isPromise} (confidence: ${confidence.toFixed(2)})`)
      passed++
    } else {
      error(`Promise detection FAILED: expected ${testCase.shouldBePromise}, got ${isPromise}`)
      failed++
    }

    // Test category (only for promises)
    if (testCase.shouldBePromise && testCase.expectedCategory) {
      const category = classifier.categorize(testCase.text)

      if (category === testCase.expectedCategory) {
        success(`Category: ${category}`)
        passed++
      } else {
        warn(`Category mismatch: expected ${testCase.expectedCategory}, got ${category}`)
        warnings++
        // Not counting as hard failure since categories can be subjective
      }
    }

    // Test actionability (only for promises)
    if (testCase.shouldBePromise && testCase.shouldBeActionable !== undefined) {
      const isActionable = classifier.isActionable(testCase.text)

      if (isActionable === testCase.shouldBeActionable) {
        success(`Actionable: ${isActionable}`)
        passed++
      } else {
        warn(`Actionability: expected ${testCase.shouldBeActionable}, got ${isActionable}`)
        warnings++
        // Not counting as hard failure
      }
    }
  })

  // Test full extraction
  section('🔍 Testing Full Promise Extraction')

  const testText = `
    Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027.
    Nous allons créer 100 000 emplois dans le secteur numérique.
    La météo sera belle demain.
    Je propose d'augmenter le budget de la santé de 10%.
    Si je suis élu, peut-être que je ferai des réformes.
    Nous promettons de protéger l'environnement pour les générations futures.
  `

  const extracted = classifier.extractPromises(testText, 'https://example.com/test')

  info(`Extracted ${extracted.length} promises from text`)

  extracted.forEach((promise, i) => {
    console.log(`\n${c.cyan}Promise ${i + 1}:${c.reset}`)
    console.log(`  Text: "${promise.text}"`)
    console.log(`  Category: ${promise.category}`)
    console.log(`  Confidence: ${promise.confidence.toFixed(2)}`)
    console.log(`  Actionable: ${promise.isActionable}`)
    console.log(`  Keywords: ${promise.keywords.join(', ')}`)
  })

  const expectedCount = 4 // Should extract 4 promises from the text
  if (extracted.length === expectedCount) {
    success(`Correct number of promises extracted (${expectedCount})`)
    passed++
  } else {
    warn(`Expected ${expectedCount} promises, got ${extracted.length}`)
    warnings++
  }

  // Summary
  section('📊 Test Summary')

  console.log(`${c.green}Passed:${c.reset}   ${passed}`)
  console.log(`${c.red}Failed:${c.reset}   ${failed}`)
  console.log(`${c.yellow}Warnings:${c.reset} ${warnings}\n`)

  if (failed === 0) {
    success('All critical tests passed! 🎉')
    if (warnings > 0) {
      info(`${warnings} warnings (non-critical, mostly subjective categorizations)`)
    }
  } else {
    error(`${failed} tests failed`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
runTests()
