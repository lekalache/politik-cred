import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const id = '5e6fd97a-d325-4175-ab10-17c4159d7f96'
    console.log(`Fetching politician with ID: ${id}`)

    const { data, error } = await supabase
        .from('politicians')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Politician found:', data.name)
    }
}

main()
