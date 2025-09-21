#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const politicians = [
  {
    name: "Emmanuel Macron",
    first_name: "Emmanuel",
    last_name: "Macron",
    party: "Renaissance",
    position: "Président de la République",
    constituency: "France",
    bio: "Président de la République française depuis 2017, ancien ministre de l'Économie.",
    birth_date: "1977-12-21",
    gender: "M",
    political_orientation: "center",
    education: "ENA, Sciences Po Paris",
    career_history: "Banquier d'affaires, Ministre de l'Économie (2014-2016)",
    key_policies: ["Transformation numérique", "Réforme du marché du travail", "Europe"],
    achievements: ["Élection présidentielle 2017", "Réforme du Code du travail", "Plan de relance post-COVID"],
    controversies: ["Gilets jaunes", "Réforme des retraites"],
    social_media: {
      "twitter": "https://twitter.com/EmmanuelMacron",
      "facebook": "https://www.facebook.com/EmmanuelMacron"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Marine Le Pen",
    first_name: "Marine",
    last_name: "Le Pen",
    party: "Rassemblement National",
    position: "Députée du Pas-de-Calais",
    constituency: "Pas-de-Calais",
    bio: "Présidente du Rassemblement National, députée, candidate à l'élection présidentielle 2022.",
    birth_date: "1968-08-05",
    gender: "F",
    political_orientation: "right",
    education: "Université Paris II Panthéon-Assas",
    career_history: "Avocate, Présidente du FN/RN depuis 2011",
    key_policies: ["Immigration", "Sécurité", "Souveraineté nationale"],
    achievements: ["Qualification second tour présidentielle 2017 et 2022", "Présidence du RN"],
    controversies: ["Positions sur l'immigration", "Relations avec la Russie"],
    social_media: {
      "twitter": "https://twitter.com/MLP_officiel"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Jean-Luc Mélenchon",
    first_name: "Jean-Luc",
    last_name: "Mélenchon",
    party: "La France Insoumise",
    position: "Député des Bouches-du-Rhône",
    constituency: "Bouches-du-Rhône",
    bio: "Leader de La France Insoumise, député, ancien ministre délégué.",
    birth_date: "1951-08-19",
    gender: "M",
    political_orientation: "left",
    education: "Université de Franche-Comté",
    career_history: "Enseignant, Ministre délégué (2000-2002), Sénateur, Député européen",
    key_policies: ["Écologie", "Justice sociale", "VIe République"],
    achievements: ["Création de LFI", "Résultats électoraux 2017 et 2022"],
    controversies: ["Perquisitions 2018", "Positions sur certains régimes"],
    social_media: {
      "twitter": "https://twitter.com/JLMelenchon",
      "youtube": "https://www.youtube.com/user/PlaceauPeuple"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Valérie Pécresse",
    first_name: "Valérie",
    last_name: "Pécresse",
    party: "Les Républicains",
    position: "Présidente de la région Île-de-France",
    constituency: "Île-de-France",
    bio: "Présidente de la région Île-de-France, ancienne ministre, candidate présidentielle 2022.",
    birth_date: "1967-07-14",
    gender: "F",
    political_orientation: "center-right",
    education: "HEC Paris, ENA",
    career_history: "Ministre de l'Enseignement supérieur (2007-2011), Ministre du Budget (2011-2012)",
    key_policies: ["Éducation", "Transports", "Sécurité"],
    achievements: ["Présidence région IDF", "Candidature présidentielle 2022"],
    controversies: ["Gestion des transports franciliens"],
    social_media: {
      "twitter": "https://twitter.com/vpecresse"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Éric Zemmour",
    first_name: "Éric",
    last_name: "Zemmour",
    party: "Reconquête",
    position: "Président de Reconquête",
    constituency: null,
    bio: "Journaliste, polémiste, fondateur du parti Reconquête, candidat présidentiel 2022.",
    birth_date: "1958-08-31",
    gender: "M",
    political_orientation: "right",
    education: "Sciences Po Paris",
    career_history: "Journaliste au Figaro, chroniqueur TV et radio",
    key_policies: ["Immigration", "Identité française", "Ordre public"],
    achievements: ["Création de Reconquête", "Candidature présidentielle 2022"],
    controversies: ["Propos sur l'immigration", "Condamnations judiciaires"],
    social_media: {
      "twitter": "https://twitter.com/ZemmourEric"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Yannick Jadot",
    first_name: "Yannick",
    last_name: "Jadot",
    party: "Europe Écologie Les Verts",
    position: "Député européen",
    constituency: "Européenne",
    bio: "Député européen, candidat présidentiel EELV 2022, spécialiste des questions environnementales.",
    birth_date: "1967-07-27",
    gender: "M",
    political_orientation: "center-left",
    education: "Université Paris-Dauphine",
    career_history: "Militant associatif, Directeur de campagne Greenpeace, Député européen",
    key_policies: ["Transition écologique", "Énergies renouvelables", "Agriculture bio"],
    achievements: ["Candidature présidentielle 2022", "Action au Parlement européen"],
    controversies: ["Tensions internes EELV"],
    social_media: {
      "twitter": "https://twitter.com/yjadot"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Olivier Faure",
    first_name: "Olivier",
    last_name: "Faure",
    party: "Parti Socialiste",
    position: "Premier secrétaire du PS",
    constituency: "Seine-et-Marne",
    bio: "Premier secrétaire du Parti socialiste, député de Seine-et-Marne.",
    birth_date: "1968-08-18",
    gender: "M",
    political_orientation: "left",
    education: "Université Paris X Nanterre",
    career_history: "Attaché parlementaire, Député depuis 2012",
    key_policies: ["Justice sociale", "Services publics", "Écologie"],
    achievements: ["Direction du PS", "Député depuis 2012"],
    controversies: ["Gestion des alliances à gauche"],
    social_media: {
      "twitter": "https://twitter.com/faureolivier"
    },
    verification_status: "verified",
    is_active: true
  },
  {
    name: "Bruno Le Maire",
    first_name: "Bruno",
    last_name: "Le Maire",
    party: "Renaissance",
    position: "Ministre de l'Économie",
    constituency: null,
    bio: "Ministre de l'Économie, des Finances et de la Souveraineté industrielle et numérique.",
    birth_date: "1969-04-15",
    gender: "M",
    political_orientation: "center",
    education: "ENA, Sciences Po Paris",
    career_history: "Diplomate, Ministre de l'Agriculture (2009-2012), Ministre de l'Économie (2017-)",
    key_policies: ["Relance économique", "Industrie", "Numérique"],
    achievements: ["Gestion crise COVID", "Plan de relance"],
    controversies: ["Taxation des GAFA"],
    verification_status: "verified",
    is_active: true
  }
]

async function populatePoliticians() {
  console.log('🚀 Starting politician data population...')

  try {
    // Check if politicians table exists and has data
    const { data: existingPoliticians, error: checkError } = await supabase
      .from('politicians')
      .select('id, name')
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking politicians table:', checkError)
      console.log('Make sure you have run the database schema first!')
      return
    }

    if (existingPoliticians && existingPoliticians.length > 0) {
      console.log('✅ Politicians table already contains data. Skipping population.')
      console.log('   Found politician:', existingPoliticians[0].name)
      return
    }

    // Insert politicians
    console.log(`📝 Inserting ${politicians.length} politicians...`)

    const { data, error } = await supabase
      .from('politicians')
      .insert(politicians)
      .select()

    if (error) {
      console.error('❌ Error inserting politicians:', error)
      return
    }

    console.log(`✅ Successfully inserted ${data.length} politicians!`)
    console.log('Politicians added:')
    data.forEach(politician => {
      console.log(`   - ${politician.name} (${politician.party})`)
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the population script
populatePoliticians()
  .then(() => {
    console.log('🎉 Population script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })