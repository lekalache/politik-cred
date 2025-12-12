/**
 * Check politician names format in database
 */

import { supabase } from '../src/lib/supabase'

async function main() {
  console.log('📋 Checking politician names in database...\n')

  // Get sample deputies
  const { data: deputies, error } = await supabase
    .from('politicians')
    .select('id, first_name, last_name, name, position')
    .eq('position', 'Député')
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Sample Deputies in Database:')
  for (const d of deputies || []) {
    console.log(`  - ${d.first_name} ${d.last_name} (full: ${d.name})`)
  }

  // Try a specific test match
  const testNames = [
    { prenom: 'Maxime', nom: 'Amblard' },
    { prenom: 'Xavier', nom: 'Breton' },
    { prenom: 'Jean-Luc', nom: 'Mélenchon' },
    { prenom: 'Marine', nom: 'Le Pen' }
  ]

  console.log('\nTest Matching:')
  for (const { prenom, nom } of testNames) {
    // Exact match
    const { data: exact } = await supabase
      .from('politicians')
      .select('id, first_name, last_name')
      .eq('last_name', nom)
      .eq('first_name', prenom)
      .single()

    // Case insensitive
    const { data: ilike } = await supabase
      .from('politicians')
      .select('id, first_name, last_name')
      .ilike('last_name', nom)
      .ilike('first_name', prenom)
      .single()

    console.log(`  ${prenom} ${nom}:`)
    console.log(`    Exact match: ${exact ? `YES (${exact.first_name} ${exact.last_name})` : 'NO'}`)
    console.log(`    Case-insensitive: ${ilike ? `YES (${ilike.first_name} ${ilike.last_name})` : 'NO'}`)
  }

  // Count totals
  const { count: deputyCount } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })
    .eq('position', 'Député')

  const { count: totalCount } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal: ${deputyCount} deputies, ${totalCount} politicians total`)
}

main()
