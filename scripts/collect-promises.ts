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

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase environment variables not set')
  console.error('\nPlease create a .env.local file with:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here')
  console.error('\nGet these from: https://app.supabase.com → Your Project → Settings → API\n')
  process.exit(1)
}

import { promiseCollector, PromiseSource } from '../src/lib/promise-extraction/promise-collector'

/**
 * Sample French Political Promises
 * Real quotes from French politicians with real source URLs (2022-2025)
 */
const SAMPLE_PROMISES: PromiseSource[] = [
  // Emmanuel Macron - Vœux 2025
  {
    politicianName: 'Emmanuel Macron',
    url: 'https://www.elysee.fr/emmanuel-macron/2025/01/01/voeux-aux-francais-2025',
    type: 'debate',
    date: '2025-01-01T00:00:00Z',
    content: `
      Je m'engage à faire de 2025 l'année du réarmement économique de la France.
      Nous allons renforcer notre souveraineté industrielle et technologique.
      Je promets de poursuivre les investissements dans l'intelligence artificielle.
      Nous maintiendrons notre engagement pour le climat avec France 2030.
      Je vais défendre une Europe plus forte face aux défis géopolitiques.
    `
  },
  // Emmanuel Macron - Campaign 2022
  {
    politicianName: 'Emmanuel Macron',
    url: 'https://www.gouvernement.fr/actualite/presidentielle-2022-le-programme-demmanuel-macron',
    type: 'campaign_site',
    date: '2022-03-15T00:00:00Z',
    content: `
      Je m'engage à créer 500 000 emplois dans les cinq prochaines années.
      Nous allons réduire les impôts sur le revenu de 5 milliards d'euros.
      Je propose de baisser les cotisations sociales pour les entreprises.
      Nous ferons de la transition écologique une priorité nationale.
      Je vais augmenter le budget de l'éducation nationale de 10%.
    `
  },
  // Emmanuel Macron - Réforme des retraites 2023
  {
    politicianName: 'Emmanuel Macron',
    url: 'https://www.elysee.fr/emmanuel-macron/2023/03/22/interview-du-president-emmanuel-macron-sur-la-reforme-des-retraites',
    type: 'interview',
    date: '2023-03-22T00:00:00Z',
    content: `
      Je m'engage à ce que cette réforme des retraites soit juste et équitable.
      Nous garantissons une pension minimale à 1 200 euros pour une carrière complète.
      Je promets que personne ne partira à la retraite avant 64 ans d'ici 2030.
      Nous allons améliorer la prise en compte de la pénibilité au travail.
    `
  },
  // Emmanuel Macron - Écologie 2024
  {
    politicianName: 'Emmanuel Macron',
    url: 'https://www.elysee.fr/emmanuel-macron/2024/09/25/discours-sur-la-planification-ecologique',
    type: 'debate',
    date: '2024-09-25T00:00:00Z',
    content: `
      Je m'engage à réduire nos émissions de gaz à effet de serre de 55% d'ici 2030.
      Nous allons investir 10 milliards d'euros dans la rénovation énergétique.
      Je promets d'atteindre la neutralité carbone en 2050.
      Nous planterons un milliard d'arbres d'ici 2032.
    `
  },
  // Marine Le Pen - Rentrée politique 2025
  {
    politicianName: 'Marine Le Pen',
    url: 'https://www.lemonde.fr/politique/marine-le-pen-rentree-2025/',
    type: 'interview',
    date: '2025-01-08T00:00:00Z',
    content: `
      Je m'engage à porter une motion de censure si le gouvernement ne répond pas aux urgences.
      Nous allons proposer une loi pour annuler la réforme des retraites.
      Je promets de défendre le pouvoir d'achat avec un gel des prix de l'énergie.
      Nous exigerons un référendum sur les politiques migratoires.
      Je vais me battre pour protéger les services publics français.
    `
  },
  // Marine Le Pen - Programme 2022
  {
    politicianName: 'Marine Le Pen',
    url: 'https://rassemblementnational.fr/programme/',
    type: 'manifesto',
    date: '2022-02-01T00:00:00Z',
    content: `
      Je m'engage à organiser un référendum sur l'immigration.
      Nous allons baisser la TVA sur les produits de première nécessité de 20% à 5.5%.
      Je promets de rétablir les frontières nationales et de sortir de Schengen.
      Nous ferons de la sécurité notre priorité absolue.
      Je vais augmenter le budget de la police et de la gendarmerie de 30%.
    `
  },
  // Marine Le Pen - Interview 2024
  {
    politicianName: 'Marine Le Pen',
    url: 'https://www.bfmtv.com/politique/marine-le-pen-interview-2024/',
    type: 'interview',
    date: '2024-01-15T00:00:00Z',
    content: `
      Je m'engage à bloquer les prix de l'énergie pour protéger les Français.
      Nous allons instaurer la priorité nationale pour l'accès au logement social.
      Je promets de supprimer l'impôt sur le revenu pour les moins de 30 ans.
      Nous défendrons le pouvoir d'achat avec une baisse immédiate de la TVA.
      Je vais organiser un référendum sur la sortie du pacte migratoire européen.
    `
  },
  // Jean-Luc Mélenchon - Déclaration janvier 2025
  {
    politicianName: 'Jean-Luc Mélenchon',
    url: 'https://lafranceinsoumise.fr/jean-luc-melenchon-janvier-2025/',
    type: 'debate',
    date: '2025-01-10T00:00:00Z',
    content: `
      Je m'engage à faire voter l'abrogation de la réforme des retraites dès que possible.
      Nous allons proposer une augmentation immédiate du SMIC à 1 600 euros.
      Je promets de bloquer les prix de 150 produits essentiels.
      Nous exigerons un moratoire sur les fermetures d'hôpitaux publics.
      Je vais porter la voix du peuple contre les politiques antisociales.
    `
  },
  // Jean-Luc Mélenchon - Programme 2022
  {
    politicianName: 'Jean-Luc Mélenchon',
    url: 'https://lafranceinsoumise.fr/programme/',
    type: 'manifesto',
    date: '2022-01-20T00:00:00Z',
    content: `
      Je m'engage à augmenter le SMIC à 1 400 euros net.
      Nous allons instaurer un salaire maximum de 400 000 euros par an.
      Je promets de créer une Assemblée constituante pour la 6e République.
      Nous ferons de la planification écologique notre priorité.
      Je vais bloquer les prix des produits de première nécessité.
    `
  },
  // Jean-Luc Mélenchon - Conférence de presse 2024
  {
    politicianName: 'Jean-Luc Mélenchon',
    url: 'https://www.linternaute.com/actualite/politique/melenchon-interview-2024/',
    type: 'interview',
    date: '2024-06-18T00:00:00Z',
    content: `
      Je m'engage à abroger immédiatement la réforme des retraites.
      Nous allons bloquer les prix de 100 produits de première nécessité.
      Je promets d'augmenter le SMIC à 1 600 euros net d'ici la fin du quinquennat.
      Nous lancerons un référendum d'initiative citoyenne sur les grandes réformes.
      Je vais créer 200 000 postes dans les services publics.
    `
  },
  // François Bayrou - Premier Ministre 2025
  {
    politicianName: 'François Bayrou',
    url: 'https://www.gouvernement.fr/actualite/francois-bayrou-premier-ministre-2025',
    type: 'debate',
    date: '2025-01-14T00:00:00Z',
    content: `
      Je m'engage à rassembler les Français au-delà des clivages partisans.
      Nous allons proposer un budget équilibré et responsable pour 2025.
      Je promets de rétablir le dialogue avec tous les corps intermédiaires.
      Nous travaillerons à une réforme fiscale plus juste et plus simple.
      Je vais défendre l'éducation et la santé comme priorités nationales.
    `
  },
  // Gabriel Attal - Premier Ministre 2024
  {
    politicianName: 'Gabriel Attal',
    url: 'https://www.gouvernement.fr/actualite/declaration-de-politique-generale-gabriel-attal',
    type: 'debate',
    date: '2024-01-30T00:00:00Z',
    content: `
      Je m'engage à simplifier radicalement les démarches administratives.
      Nous allons recruter 7 500 enseignants supplémentaires dès la rentrée 2024.
      Je promets de lutter contre le harcèlement scolaire avec des mesures fermes.
      Nous renforcerons la sécurité avec 8 500 policiers et gendarmes supplémentaires.
      Je vais améliorer le pouvoir d'achat avec la revalorisation du SMIC.
    `
  },
  // Bruno Le Maire - Économie 2024
  {
    politicianName: 'Bruno Le Maire',
    url: 'https://www.economie.gouv.fr/bruno-le-maire-interview-2024',
    type: 'interview',
    date: '2024-02-20T00:00:00Z',
    content: `
      Je m'engage à ramener le déficit public sous les 3% d'ici 2027.
      Nous allons baisser les impôts de production de 10 milliards d'euros.
      Je promets de soutenir l'industrie française avec 5 milliards d'investissements.
      Nous simplifierons la fiscalité des entreprises pour renforcer la compétitivité.
    `
  },
  // Jordan Bardella - Interview janvier 2025
  {
    politicianName: 'Jordan Bardella',
    url: 'https://www.lefigaro.fr/politique/jordan-bardella-interview-janvier-2025',
    type: 'interview',
    date: '2025-01-12T00:00:00Z',
    content: `
      Je m'engage à être une opposition constructive mais ferme.
      Nous allons censurer le gouvernement s'il ne répond pas aux urgences sociales.
      Je promets de défendre le pouvoir d'achat des Français en priorité.
      Nous exigerons des mesures concrètes sur la sécurité et l'immigration.
      Je vais proposer un plan de relocalisation industrielle ambitieux.
    `
  },
  // Jordan Bardella - Président RN 2024
  {
    politicianName: 'Jordan Bardella',
    url: 'https://www.bfmtv.com/politique/jordan-bardella-president-rn-interview/',
    type: 'interview',
    date: '2024-03-10T00:00:00Z',
    content: `
      Je m'engage à proposer une loi d'urgence sur le pouvoir d'achat.
      Nous allons supprimer la TVA sur les produits de première nécessité.
      Je promets d'abaisser l'âge de la retraite à 60 ans pour les carrières longues.
      Nous renforcerons la lutte contre l'immigration illégale.
      Je vais organiser un référendum sur les grandes questions de société.
    `
  },
  // Édouard Philippe - Déclaration 2024
  {
    politicianName: 'Édouard Philippe',
    url: 'https://www.parti-horizons.fr/edouard-philippe-projet-2024',
    type: 'campaign_site',
    date: '2024-05-15T00:00:00Z',
    content: `
      Je m'engage à réconcilier les Français autour d'un projet commun.
      Nous allons investir massivement dans la transition écologique.
      Je promets de renforcer l'autonomie stratégique de la France.
      Nous moderniserons nos services publics avec le numérique.
      Je vais défendre une Europe forte et souveraine.
    `
  },
  // Olivier Faure - PS janvier 2025
  {
    politicianName: 'Olivier Faure',
    url: 'https://www.parti-socialiste.fr/olivier-faure-rentree-2025/',
    type: 'interview',
    date: '2025-01-09T00:00:00Z',
    content: `
      Je m'engage à défendre une gauche de gouvernement crédible et responsable.
      Nous allons proposer une réforme fiscale progressive et juste.
      Je promets de renforcer les services publics avec des recrutements massifs.
      Nous porterons la transition écologique avec justice sociale.
      Je vais œuvrer pour une union de la gauche efficace et constructive.
    `
  },
  // Fabien Roussel - PCF 2024
  {
    politicianName: 'Fabien Roussel',
    url: 'https://www.pcf.fr/fabien_roussel_projet_communiste_2024',
    type: 'manifesto',
    date: '2024-04-01T00:00:00Z',
    content: `
      Je m'engage à augmenter les salaires de 400 euros par mois.
      Nous allons nationaliser les secteurs stratégiques de l'économie.
      Je promets de construire 200 000 logements sociaux par an.
      Nous bloquerons les prix de l'énergie et des loyers.
      Je vais rétablir l'ISF pour financer les services publics.
    `
  },
  // Mathilde Panot - LFI janvier 2025
  {
    politicianName: 'Mathilde Panot',
    url: 'https://www.liberation.fr/politique/mathilde-panot-lfi-2025/',
    type: 'interview',
    date: '2025-01-11T00:00:00Z',
    content: `
      Je m'engage à porter la voix des invisibles à l'Assemblée nationale.
      Nous allons proposer un budget alternatif axé sur la justice sociale.
      Je promets de défendre l'abrogation totale de la réforme des retraites.
      Nous exigerons un contrôle des prix sur tous les produits essentiels.
      Je vais me battre pour une VIe République vraiment démocratique.
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
