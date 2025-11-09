#!/usr/bin/env tsx
/**
 * Apply Migration 007 Instructions
 * Adds Vigie du mensonge integration support
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('🔧 Migration 007: Vigie du mensonge Integration Support')
console.log('='.repeat(60))
console.log()
console.log('This migration adds support for integrating Vigie du mensonge data.')
console.log()
console.log('📋 Steps:')
console.log('1. Open Supabase SQL Editor:')
console.log('   https://app.supabase.com → Your Project → SQL Editor')
console.log()
console.log('2. Create a new query and paste the following SQL:')
console.log()
console.log('='.repeat(60))

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/007_vigie_integration_support.sql'),
  'utf-8'
)

console.log(migration)
console.log('='.repeat(60))
console.log()
console.log('3. Click "Run" to execute the migration')
console.log()
console.log('📊 What this adds:')
console.log('   • source_platform field (track where promises come from)')
console.log('   • external_id field (deduplicate across platforms)')
console.log('   • verification_source field (AI vs community vs manual)')
console.log('   • community_votes tracking')
console.log('   • vigie_import_jobs table')
console.log('   • promises_with_sources view')
console.log()
console.log('✅ After this migration, you can:')
console.log('   • Import Vigie du mensonge data')
console.log('   • Show multiple verification sources')
console.log('   • Track community vs AI confidence')
console.log('   • Avoid duplicate promises from different sources')
console.log()
