#!/usr/bin/env tsx
/**
 * Seed Politicians Script
 * Seeds the database with French politicians
 *
 * Usage:
 *   npm run seed-politicians
 *   or
 *   tsx scripts/seed-politicians.ts
 */

import { supabase } from '../src/lib/supabase'

interface PoliticianData {
  name: string
  party: string
  position: string
  bio?: string
  image_url?: string
}

/**
 * French Politicians Database
 * Real French political figures
 */
const FRENCH_POLITICIANS: PoliticianData[] = [
  {
    name: 'Emmanuel Macron',
    party: 'Renaissance (ex-LREM)',
    position: 'Président de la République',
    bio: 'Président de la République française depuis 2017, ancien ministre de l\'Économie.'
  },
  {
    name: 'Marine Le Pen',
    party: 'Rassemblement National',
    position: 'Député',
    bio: 'Présidente du Rassemblement National, députée du Pas-de-Calais.'
  },
  {
    name: 'Jean-Luc Mélenchon',
    party: 'La France Insoumise',
    position: 'Député',
    bio: 'Fondateur de La France Insoumise, député des Bouches-du-Rhône.'
  },
  {
    name: 'Valérie Pécresse',
    party: 'Les Républicains',
    position: 'Présidente de région',
    bio: 'Présidente de la région Île-de-France, ancienne ministre.'
  },
  {
    name: 'Éric Zemmour',
    party: 'Reconquête',
    position: 'Président de parti',
    bio: 'Président du parti Reconquête, ancien journaliste et essayiste.'
  },
  {
    name: 'Yannick Jadot',
    party: 'Europe Écologie Les Verts',
    position: 'Député européen',
    bio: 'Député européen, ancien candidat à l\'élection présidentielle.'
  },
  {
    name: 'Fabien Roussel',
    party: 'Parti Communiste Français',
    position: 'Député',
    bio: 'Secrétaire national du PCF, député du Nord.'
  },
  {
    name: 'Édouard Philippe',
    party: 'Horizons',
    position: 'Maire',
    bio: 'Ancien Premier ministre, maire du Havre, président du parti Horizons.'
  },
  {
    name: 'Bruno Le Maire',
    party: 'Renaissance',
    position: 'Ministre',
    bio: 'Ministre de l\'Économie et des Finances.'
  },
  {
    name: 'Gérald Darmanin',
    party: 'Renaissance',
    position: 'Ministre',
    bio: 'Ministre de l\'Intérieur et des Outre-mer.'
  }
]

/**
 * Seed politicians into database
 */
async function seedPoliticians() {
  console.log('🇫🇷 Seeding French Politicians')
  console.log('=' .repeat(60))
  console.log()

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const politician of FRENCH_POLITICIANS) {
    try {
      // Check if politician already exists
      const { data: existing } = await supabase
        .from('politicians')
        .select('id')
        .eq('name', politician.name)
        .single()

      if (existing) {
        console.log(`   ⚠️  ${politician.name} already exists, updating...`)

        const { error } = await supabase
          .from('politicians')
          .update({
            party: politician.party,
            position: politician.position,
            bio: politician.bio,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error(`   ❌ Error updating ${politician.name}:`, error.message)
          errors++
        } else {
          console.log(`   ✓ Updated: ${politician.name}`)
          updated++
        }
      } else {
        // Insert new politician
        const { error } = await supabase.from('politicians').insert({
          name: politician.name,
          party: politician.party,
          position: politician.position,
          bio: politician.bio,
          image_url: politician.image_url || null,
          credibility_score: 50, // Default starting score
          total_votes: 0,
          positive_votes: 0,
          negative_votes: 0
        })

        if (error) {
          console.error(`   ❌ Error inserting ${politician.name}:`, error.message)
          errors++
        } else {
          console.log(`   ✓ Inserted: ${politician.name} (${politician.party})`)
          inserted++
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${politician.name}:`, error)
      errors++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Seeding Summary')
  console.log('=' .repeat(60))
  console.log(`Total politicians: ${FRENCH_POLITICIANS.length}`)
  console.log(`Inserted:          ${inserted}`)
  console.log(`Updated:           ${updated}`)
  console.log(`Errors:            ${errors}`)
  console.log()
  console.log('✅ Politician seeding completed!')
}

// Run the script
seedPoliticians()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
