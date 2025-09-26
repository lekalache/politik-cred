#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Import the politicians data from the expanded script
const { politicians } = require('./import-politicians-expanded')

console.log(`📊 Loaded ${politicians.length} politicians from expanded dataset`)

async function importPoliticiansProduction() {
  console.log('🚀 Starting production politician import (Expanded Dataset)...')
  console.log(`📊 Importing ${politicians.length} politicians with full schema mapping`)

  try {
    // Check if politicians table exists and has data
    const { data: existingPoliticians, error: checkError } = await supabase
      .from('politicians')
      .select('id, name')
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking politicians table:', checkError)
      console.log('💡 Make sure you have applied the custom-auth-schema.sql to your database!')
      return
    }

    if (existingPoliticians && existingPoliticians.length > 0) {
      console.log('⚠️  Politicians table already contains data.')
      console.log('   Found existing politician:', existingPoliticians[0].name)
      console.log('   Choose an option:')
      console.log('   1. Clear existing data and reimport (dangerous)')
      console.log('   2. Skip import (safe)')
      console.log('   3. Add new politicians only (recommended)')
      console.log('')
      console.log('🛑 To proceed safely, manually review existing data first.')
      console.log('💡 Run: SELECT name, party FROM politicians ORDER BY name;')
      return
    }

    // Transform politicians for production schema
    const transformedPoliticians = politicians.map(politician => ({
      // Core identity
      name: politician.name,
      first_name: politician.first_name,
      last_name: politician.last_name,

      // Political info
      party: politician.party,
      position: politician.position,
      constituency: politician.constituency,
      political_orientation: politician.political_orientation,

      // Personal info
      bio: politician.bio,
      birth_date: politician.birth_date,
      gender: politician.gender,
      education: politician.education,
      career_history: politician.career_history,

      // Arrays
      key_policies: politician.key_policies || [],
      achievements: politician.achievements || [],
      controversies: politician.controversies || [],

      // JSON fields
      social_media: politician.social_media || {},
      contact_info: {},
      metadata: {},

      // Scores (all default to 100)
      credibility_score: 100,
      transparency_score: 100,
      consistency_score: 100,
      integrity_score: 100,
      engagement_score: 100,

      // Vote counts (start at 0)
      total_votes: 0,
      positive_votes: 0,
      negative_votes: 0,

      // Status flags
      is_active: politician.is_active !== false,
      verified: politician.verified === true,

      // Timestamps handled by database defaults
    }))

    console.log('📝 Inserting politicians with production schema...')
    console.log('⏳ This may take a moment for large datasets...')

    // Insert in batches of 50 to avoid timeout
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < transformedPoliticians.length; i += batchSize) {
      const batch = transformedPoliticians.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from('politicians')
        .insert(batch)
        .select('id, name, party, position')

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
        continue
      }

      insertedCount += data.length
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} politicians`)
    }

    console.log('')
    console.log(`🎉 Successfully imported ${insertedCount} politicians!`)
    console.log('')
    console.log('📋 Production import summary:')
    console.log(`   • Total politicians: ${insertedCount}`)
    console.log(`   • All scores initialized to 100`)
    console.log(`   • All vote counts initialized to 0`)
    console.log(`   • Verification status preserved`)
    console.log(`   • Social media links included`)
    console.log('')
    console.log('🎯 Production database ready!')
    console.log('💡 Next steps:')
    console.log('   1. Add profile images (image_url field)')
    console.log('   2. Verify data on your website')
    console.log('   3. Test voting functionality')
    console.log('   4. Set up content moderation')

  } catch (error) {
    console.error('💥 Unexpected error during import:', error)
    process.exit(1)
  }
}

// Run the production import
importPoliticiansProduction()
  .then(() => {
    console.log('🏁 Production import script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💀 Script failed:', error)
    process.exit(1)
  })