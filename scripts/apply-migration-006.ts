#!/usr/bin/env tsx
/**
 * Apply Migration 006 Instructions
 * Fixes the RLS policy to allow public read access to all promises
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('🔧 Migration 006: Fix Promise Read Policy')
console.log('='.repeat(60))
console.log()
console.log('This migration needs to be applied manually in your Supabase dashboard.')
console.log()
console.log('📋 Steps:')
console.log('1. Open Supabase SQL Editor:')
console.log('   https://app.supabase.com → Your Project → SQL Editor')
console.log()
console.log('2. Create a new query and paste the following SQL:')
console.log()
console.log('='.repeat(60))

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/006_fix_promise_read_policy.sql'),
  'utf-8'
)

console.log(migration)
console.log('='.repeat(60))
console.log()
console.log('3. Click "Run" to execute the migration')
console.log()
console.log('4. After running, test by refreshing your /promises page')
console.log()
console.log('✅ This will allow anyone (even unauthenticated users) to read all promises.')
console.log('   This is appropriate for a public transparency platform.')
console.log()
