const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration - Using anon key for demo (in production, use service role key)
const supabaseUrl = 'https://whjoqxozjzcluhdgocly.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoam9xeG96anpjbHVoZGdvY2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0OTc2NzEsImV4cCI6MjA1MDA3MzY3MX0.aWKYmVlYwgZrVDu4Vxj4cWDqWQf7Qj4Zz3Ux8KmNVTk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function importPoliticians() {
  try {
    // Read politicians data
    const politiciansData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../politicians.json'), 'utf8')
    )

    console.log(`Found ${politiciansData.length} politicians to import`)

    // Clear existing politicians (optional - remove if you want to keep existing data)
    console.log('Clearing existing politicians...')
    await supabase.from('politicians').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Transform and insert politicians
    const politiciansToInsert = politiciansData.map(politician => {
      const fullName = `${politician.firstname} ${politician.name}`.trim()

      // Determine party and position based on known data
      let party = null
      let position = null
      let bio = null

      // Add specific data for current active politicians
      if (politician.isActive) {
        if (fullName === 'Emmanuel Macron') {
          party = 'Renaissance'
          position = 'Président de la République'
          bio = 'Président de la République française depuis 2017'
        } else if (fullName === 'Michel Barnier') {
          party = 'Les Républicains'
          position = 'Premier ministre'
          bio = 'Premier ministre français depuis septembre 2024'
        } else if (fullName === 'Marine Le Pen') {
          party = 'Rassemblement National'
          position = 'Députée'
          bio = 'Présidente du Rassemblement National'
        } else if (fullName === 'Jean-Luc Mélenchon') {
          party = 'La France Insoumise'
          position = 'Député'
          bio = 'Fondateur de La France Insoumise'
        } else if (fullName === 'Bruno Retailleau') {
          party = 'Les Républicains'
          position = 'Ministre de l\'Intérieur'
          bio = 'Ministre de l\'Intérieur depuis septembre 2024'
        } else if (fullName.includes('Gérald Darmanin')) {
          party = 'Renaissance'
          position = 'Ancien Ministre de l\'Intérieur'
          bio = 'Ancien Ministre de l\'Intérieur'
        } else {
          position = politician.isActive ? 'Personnalité politique active' : 'Personnalité politique'
          bio = `${fullName} - Personnalité politique française`
        }
      } else {
        // Historical figures
        if (fullName.includes('de Gaulle')) {
          position = 'Ancien Président de la République'
          bio = 'Général et homme d\'État français, Président de la République (1959-1969)'
        } else if (fullName.includes('Mitterrand')) {
          position = 'Ancien Président de la République'
          bio = 'Président de la République française (1981-1995)'
        } else if (fullName.includes('Chirac')) {
          position = 'Ancien Président de la République'
          bio = 'Président de la République française (1995-2007)'
        } else if (fullName.includes('Sarkozy')) {
          position = 'Ancien Président de la République'
          bio = 'Président de la République française (2007-2012)'
        } else if (fullName.includes('Hollande')) {
          position = 'Ancien Président de la République'
          bio = 'Président de la République française (2012-2017)'
        } else {
          position = 'Personnalité politique historique'
          bio = `${fullName} - Figure historique de la politique française`
        }
      }

      return {
        name: fullName,
        party,
        position,
        bio,
        credibility_score: 100, // Starting score
        total_votes: 0
      }
    })

    // Remove duplicates based on name
    const uniquePoliticians = politiciansToInsert.filter((politician, index, self) =>
      index === self.findIndex(p => p.name === politician.name)
    )

    console.log(`Inserting ${uniquePoliticians.length} unique politicians...`)

    // Insert in batches to avoid timeout
    const batchSize = 50
    for (let i = 0; i < uniquePoliticians.length; i += batchSize) {
      const batch = uniquePoliticians.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from('politicians')
        .insert(batch)

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        continue
      }

      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} politicians)`)
    }

    console.log('Import completed successfully!')

    // Verify import
    const { data: count, error: countError } = await supabase
      .from('politicians')
      .select('id', { count: 'exact' })

    if (!countError) {
      console.log(`Total politicians in database: ${count.length}`)
    }

  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

// Run the import
importPoliticians()