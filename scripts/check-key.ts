
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

async function checkKey(key: string) {
  console.log(`Checking key: ${key}`)
  const keyHash = hashApiKey(key)
  console.log(`Key hash: ${keyHash}`)

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single()

  if (error) {
    console.error('Error finding key:', error.message)
    if (error.code === 'PGRST116') {
      console.log('Key not found in database.')
    }
  } else {
    console.log('Key found!')
    console.log('ID:', data.id)
    console.log('Name:', data.name)
    console.log('Active:', data.is_active)
    console.log('Scopes:', data.scopes)
  }
}

const key = process.argv[2]
if (!key) {
  console.error('Please provide an API key as argument')
  process.exit(1)
}

checkKey(key)
