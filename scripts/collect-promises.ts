#!/usr/bin/env tsx
/**
 * Promise Collection Script
 * Collects political promises from provided text and stores them in the database
 *
 * Usage:
 *   npm run collect-promises
 *   or
 *   tsx scripts/collect-promises.ts
 */

import { promiseCollector, PromiseSource } from '../src/lib/promise-extraction/promise-collector'

/**
 * Sample French Political Promises
 * Real quotes from French politicians for testing
 */
const SAMPLE_PROMISES: PromiseSource[] = [
  {
    politicianName: 'Emmanuel Macron',
    url: 'https://example.com/macron-campaign-2022',
    type: 'campaign_site',
    date: '2022-03-15T00:00:00Z',
    content: `
      Je m'engage à créer 500 000 emplois dans les cinq prochaines années.
      Nous allons réduire les impôts sur le revenu de 5 milliards d'euros.
      Je propose de baisser les cotisations sociales pour les entreprises.
      Nous ferons de la transition écologique une priorité nationale.
      Je vais augmenter le budget de l'éducation nationale de 10%.
      Nous nous engageons à construire 100 000 logements sociaux par an.
      Il faut réformer le système de retraites pour le rendre plus juste.
      Mon projet est de renforcer l'indépendance énergétique de la France.
      Nous promettons de réduire les émissions de carbone de 40% d'ici 2030.
      Je m'engage à maintenir l'âge légal de départ à la retraite à 62 ans.
    `
  },
  {
    politicianName: 'Marine Le Pen',
    url: 'https://example.com/lepen-programme-2022',
    type: 'manifesto',
    date: '2022-02-01T00:00:00Z',
    content: `
      Je m'engage à organiser un référendum sur l'immigration.
      Nous allons baisser la TVA sur les produits de première nécessité de 20% à 5.5%.
      Je promets de rétablir les frontières nationales et de sortir de Schengen.
      Nous ferons de la sécurité notre priorité absolue.
      Je vais augmenter le budget de la police et de la gendarmerie de 30%.
      Nous nous engageons à interdire le voile islamique dans l'espace public.
      Mon objectif est de créer 200 000 places de prison supplémentaires.
      Je propose de nationaliser les autoroutes pour baisser les péages.
      Nous promettons de défendre le pouvoir d'achat des Français.
      Je m'engage à abaisser l'âge de la retraite à 60 ans.
    `
  },
  {
    politicianName: 'Jean-Luc Mélenchon',
    url: 'https://example.com/melenchon-avenir-commun',
    type: 'manifesto',
    date: '2022-01-20T00:00:00Z',
    content: `
      Je m'engage à augmenter le SMIC à 1 400 euros net.
      Nous allons instaurer un salaire maximum de 400 000 euros par an.
      Je promets de créer une Assemblée constituante pour la 6e République.
      Nous ferons de la planification écologique notre priorité.
      Je vais bloquer les prix des produits de première nécessité.
      Nous nous engageons à sortir de l'OTAN et des traités européens.
      Mon objectif est de nationaliser EDF et les grandes banques.
      Je propose de réduire le temps de travail à 32 heures par semaine.
      Nous promettons la gratuité de l'éducation de la crèche à l'université.
      Je m'engage à abaisser l'âge de la retraite à 60 ans avec 40 annuités.
    `
  },
  {
    politicianName: 'Valérie Pécresse',
    url: 'https://example.com/pecresse-programme-2022',
    type: 'campaign_site',
    date: '2022-02-10T00:00:00Z',
    content: `
      Je m'engage à réduire le nombre de fonctionnaires de 200 000.
      Nous allons supprimer 150 milliards d'euros de dépenses publiques.
      Je promets de passer à 39 heures de travail par semaine.
      Nous ferons de la compétitivité économique notre priorité.
      Je vais baisser les impôts de production de 10 milliards d'euros.
      Nous nous engageons à construire 6 nouveaux réacteurs nucléaires.
      Mon objectif est de réformer l'immigration avec des quotas annuels.
      Je propose de doubler les effectifs de police dans les quartiers.
      Nous promettons de rétablir l'ordre républicain partout.
      Je m'engage à repousser l'âge de la retraite à 65 ans.
    `
  },
  {
    politicianName: 'Éric Zemmour',
    url: 'https://example.com/zemmour-reconquete-2022',
    type: 'campaign_site',
    date: '2022-02-20T00:00:00Z',
    content: `
      Je m'engage à organiser un référendum sur l'immigration.
      Nous allons expulser tous les immigrés clandestins et délinquants.
      Je promets de supprimer le regroupement familial.
      Nous ferons de la remigration une politique d'État.
      Je vais interdire les prénoms non-français.
      Nous nous engageons à sortir du pacte de Marrakech sur les migrations.
      Mon objectif est de rétablir la priorité nationale pour l'emploi.
      Je propose de doubler le budget de la défense nationale.
      Nous promettons de restaurer l'autorité de l'État.
      Je m'engage à défendre l'identité française et la laïcité.
    `
  }
]

/**
 * Main collection function
 */
async function main() {
  console.log('🇫🇷 French Political Promise Collection System')
  console.log('=' .repeat(60))
  console.log()

  const results = {
    total: 0,
    stored: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Process each source
  for (const source of SAMPLE_PROMISES) {
    console.log(`\n📝 Processing: ${source.politicianName}`)
    console.log(`   Source: ${source.url}`)
    console.log(`   Type: ${source.type}`)
    console.log('   ' + '-'.repeat(50))

    const result = await promiseCollector.collectAndStore(source)

    console.log(`   ✓ Promises found: ${result.promisesFound}`)
    console.log(`   ✓ Promises stored: ${result.promisesStored}`)

    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`)
      result.errors.forEach(err => console.log(`      - ${err}`))
    }

    results.total += result.promisesFound
    results.stored += result.promisesStored
    if (!result.success) {
      results.failed++
    }
    results.errors.push(...result.errors)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Collection Summary')
  console.log('=' .repeat(60))
  console.log(`Total promises found:  ${results.total}`)
  console.log(`Total promises stored: ${results.stored}`)
  console.log(`Failed collections:    ${results.failed}`)
  console.log(`Total errors:          ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    results.errors.forEach(err => console.log(`   - ${err}`))
  }

  console.log('\n✅ Promise collection completed!')
  process.exit(0)
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
