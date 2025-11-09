#!/usr/bin/env tsx
/**
 * Environment Variables Checker
 * Validates that all required environment variables are set
 */

import dotenv from 'dotenv'
import path from 'path'

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface EnvCheck {
  name: string
  value: string | undefined
  required: boolean
  description: string
}

const requiredVars: EnvCheck[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    required: true,
    description: 'Your Supabase project URL'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    required: true,
    description: 'Your Supabase anonymous/public key'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: process.env.SUPABASE_SERVICE_ROLE_KEY,
    required: false,
    description: 'Your Supabase service role key (for scripts)'
  }
]

function checkEnvironment() {
  console.log('🔍 Checking Environment Variables')
  console.log('=' .repeat(60))
  console.log()

  let hasErrors = false
  let hasWarnings = false

  for (const check of requiredVars) {
    const isSet = check.value && check.value !== '' && check.value !== 'YOUR_SUPABASE_ANON_KEY_HERE'
    const status = isSet ? '✓' : (check.required ? '✗' : '⚠️')

    console.log(`${status} ${check.name}`)
    console.log(`   ${check.description}`)

    if (isSet) {
      const displayValue = check.value!.length > 50
        ? check.value!.substring(0, 40) + '...'
        : check.value!
      console.log(`   Value: ${displayValue}`)
    } else {
      console.log(`   Status: NOT SET`)
      if (check.required) {
        hasErrors = true
      } else {
        hasWarnings = true
      }
    }
    console.log()
  }

  console.log('=' .repeat(60))

  if (hasErrors) {
    console.log('\n❌ MISSING REQUIRED VARIABLES\n')
    console.log('You need to set up your Supabase credentials to use the scripts.\n')
    console.log('Option 1: Create a .env.local file:')
    console.log('   1. Get your credentials from: https://app.supabase.com')
    console.log('   2. Go to your project → Settings → API')
    console.log('   3. Create .env.local with:\n')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here\n')
    console.log('Option 2: Set environment variables directly:')
    console.log('   export NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
    console.log('   export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
    console.log('   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here\n')
    process.exit(1)
  }

  if (hasWarnings) {
    console.log('\n⚠️  OPTIONAL VARIABLES NOT SET\n')
    console.log('Some optional variables are not set. The scripts may have limited functionality.')
    console.log()
  }

  if (!hasErrors && !hasWarnings) {
    console.log('\n✅ All environment variables are properly configured!\n')
  }
}

checkEnvironment()
