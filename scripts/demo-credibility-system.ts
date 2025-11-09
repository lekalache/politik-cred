#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'
import { CredibilityScorer } from '../src/lib/credibility/credibility-scorer'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/**
 * Demo: Credibility Scoring System
 *
 * Shows how credibility scores change based on promise verification.
 * Demonstrates legally careful language.
 */

async function demoCredibilitySystem() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                                                                  ║')
  console.log('║           DEMO: CREDIBILITY SCORING SYSTEM                       ║')
  console.log('║                                                                  ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log()

  console.log('🎯 How It Works:')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log()
  console.log('1. Politicians start with a baseline score of 50/100')
  console.log('2. When promises are verified:')
  console.log('   • Promise kept      → +3 to +7 points (depending on sources)')
  console.log('   • Promise broken    → -5 to -11 points')
  console.log('   • Promise partial   → +1 to +2 points')
  console.log('3. Multi-source verification increases impact (1.25x - 1.5x)')
  console.log('4. Confidence level affects final score (0-1 multiplier)')
  console.log('5. All changes tracked with full audit trail')
  console.log()

  console.log('📊 Example Scenarios:')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log()

  // Scenario 1: Promise broken (single source)
  console.log('Scenario 1: Promise Broken (single source - AI only)')
  console.log('─────────────────────────────────────────────────────')
  const change1 = CredibilityScorer.calculateScoreChange(
    'broken',
    ['ai_assisted'],
    0.85,
    'medium'
  )
  const desc1 = CredibilityScorer.generateDescription(
    'broken',
    'Je promets de ne pas augmenter les impôts',
    ['ai_assisted']
  )
  console.log(`Score change: ${change1.toFixed(2)} points`)
  console.log(`Description: "${desc1}"`)
  console.log(`Starting score: 50.00 → New score: ${(50 + change1).toFixed(2)}`)
  console.log()

  // Scenario 2: Promise broken (triple verification)
  console.log('Scenario 2: Promise Broken (triple verification)')
  console.log('─────────────────────────────────────────────────────')
  const change2 = CredibilityScorer.calculateScoreChange(
    'broken',
    ['ai_assisted', 'vigie_community', 'parliamentary_match'],
    0.92,
    'critical'
  )
  const desc2 = CredibilityScorer.generateDescription(
    'broken',
    'Je promets de ne pas augmenter les impôts',
    ['ai_assisted', 'vigie_community', 'parliamentary_match']
  )
  console.log(`Score change: ${change2.toFixed(2)} points`)
  console.log(`Description: "${desc2}"`)
  console.log(`Starting score: 50.00 → New score: ${(50 + change2).toFixed(2)}`)
  console.log(`Impact: ${((change2 / change1) * 100).toFixed(0)}% stronger (multi-source + high confidence)`)
  console.log()

  // Scenario 3: Promise kept (double verification)
  console.log('Scenario 3: Promise Kept (double verification)')
  console.log('─────────────────────────────────────────────────────')
  const change3 = CredibilityScorer.calculateScoreChange(
    'kept',
    ['ai_assisted', 'parliamentary_match'],
    0.88,
    'high'
  )
  const desc3 = CredibilityScorer.generateDescription(
    'kept',
    "Je m'engage à augmenter le budget de l'éducation",
    ['ai_assisted', 'parliamentary_match']
  )
  console.log(`Score change: +${change3.toFixed(2)} points`)
  console.log(`Description: "${desc3}"`)
  console.log(`Starting score: 42.00 → New score: ${(42 + change3).toFixed(2)}`)
  console.log()

  // Scenario 4: Promise partial
  console.log('Scenario 4: Promise Partially Kept')
  console.log('─────────────────────────────────────────────────────')
  const change4 = CredibilityScorer.calculateScoreChange(
    'partial',
    ['ai_assisted', 'vigie_community'],
    0.75,
    'medium'
  )
  const desc4 = CredibilityScorer.generateDescription(
    'partial',
    'Je promets de créer 100,000 emplois',
    ['ai_assisted', 'vigie_community']
  )
  console.log(`Score change: +${change4.toFixed(2)} points`)
  console.log(`Description: "${desc4}"`)
  console.log()

  // Impact comparison table
  console.log('📈 Impact Comparison Table:')
  console.log('─────────────────────────────────────────────────────')
  console.log('│ Status    │ Sources │ Confidence │ Importance │ Change  │')
  console.log('├───────────┼─────────┼────────────┼────────────┼─────────┤')

  const scenarios = [
    {
      status: 'broken' as const,
      sources: ['ai_assisted'] as const,
      confidence: 0.8,
      importance: 'low' as const
    },
    {
      status: 'broken' as const,
      sources: ['ai_assisted', 'vigie_community'] as const,
      confidence: 0.9,
      importance: 'medium' as const
    },
    {
      status: 'broken' as const,
      sources: ['ai_assisted', 'vigie_community', 'parliamentary_match'] as const,
      confidence: 0.95,
      importance: 'critical' as const
    },
    {
      status: 'kept' as const,
      sources: ['ai_assisted'] as const,
      confidence: 0.8,
      importance: 'medium' as const
    },
    {
      status: 'kept' as const,
      sources: ['ai_assisted', 'parliamentary_match'] as const,
      confidence: 0.9,
      importance: 'high' as const
    }
  ]

  scenarios.forEach((scenario) => {
    const change = CredibilityScorer.calculateScoreChange(
      scenario.status,
      [...scenario.sources], // Convert readonly to mutable
      scenario.confidence,
      scenario.importance
    )
    const statusPadded = scenario.status.padEnd(9)
    const sourcesPadded = scenario.sources.length.toString().padStart(7)
    const confidencePadded = (scenario.confidence * 100).toFixed(0).padStart(10) + '%'
    const importancePadded = scenario.importance.padEnd(10)
    const changePadded = (change > 0 ? '+' : '') + change.toFixed(2).padStart(6)

    console.log(
      `│ ${statusPadded} │ ${sourcesPadded} │ ${confidencePadded} │ ${importancePadded} │ ${changePadded} │`
    )
  })
  console.log('└───────────┴─────────┴────────────┴────────────┴─────────┘')
  console.log()

  console.log('⚖️  Legal Language Examples:')
  console.log('─────────────────────────────────────────────────────')
  console.log()
  console.log('✅ CORRECT (factual statements):')
  console.log('   • "Promesse non tenue"')
  console.log('   • "A déclaré X mais a voté Y"')
  console.log('   • "Les faits contredisent la déclaration"')
  console.log('   • "Vérification: actions parlementaires différentes de la promesse"')
  console.log()
  console.log('❌ INCORRECT (character judgments):')
  console.log('   • "Est un menteur"')
  console.log('   • "Ne mérite pas la confiance"')
  console.log('   • "Personne malhonnête"')
  console.log()

  console.log('📊 Score Ranges:')
  console.log('─────────────────────────────────────────────────────')
  console.log('   75-100: Crédibilité élevée    (green)')
  console.log('   60-74:  Bonne crédibilité     (blue)')
  console.log('   40-59:  Crédibilité moyenne   (yellow)')
  console.log('   25-39:  Crédibilité faible    (orange)')
  console.log('   0-24:   Crédibilité très faible (red)')
  console.log()

  console.log('🔍 Multi-Source Verification Benefits:')
  console.log('─────────────────────────────────────────────────────')
  console.log('   1 source:  1.0x impact (base)')
  console.log('   2 sources: 1.25x impact (+25%)')
  console.log('   3+ sources: 1.5x impact (+50%)')
  console.log()
  console.log('   Example: Promise broken with 3 sources = -11.5 points')
  console.log('            (vs -5.0 with 1 source)')
  console.log()

  console.log('📝 Next Steps:')
  console.log('─────────────────────────────────────────────────────')
  console.log('   1. Apply Migration 008 in Supabase')
  console.log('   2. Verify promises for existing politicians')
  console.log('   3. Watch credibility scores update automatically')
  console.log('   4. View history timeline on politician pages')
  console.log()

  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                                                                  ║')
  console.log('║      ✅ CREDIBILITY SYSTEM READY FOR DEPLOYMENT                  ║')
  console.log('║                                                                  ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
}

demoCredibilitySystem().catch(console.error)
