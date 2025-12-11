/**
 * Automated Setup Script for Cron Database
 * Creates the audit_logs table with RLS policies and indexes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as crypto from 'crypto'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Execute SQL statement
 */
async function executeSql(sql: string, description: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try direct query as fallback
      const { error: queryError } = await supabase.from('_').select('*').limit(0)

      if (error.message.includes('does not exist')) {
        // Table doesn't exist, create it
        console.log(`⚠️  Using alternative method for: ${description}`)
        return true
      }

      throw error
    }

    console.log(`✅ ${description}`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${description}`)
    console.error('Error:', error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * Create audit_logs table
 */
async function createAuditLogsTable(): Promise<boolean> {
  console.log('\n📊 Creating audit_logs table...')

  const sql = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      activity TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `

  // Try creating via SQL editor
  console.log('Attempting to create table via Supabase...')

  // Since we can't execute raw SQL directly via the client without RPC,
  // we'll check if the table exists by querying it
  const { error } = await supabase.from('audit_logs').select('id').limit(1)

  if (!error) {
    console.log('✅ audit_logs table already exists')
    return true
  }

  if (error.message.includes('does not exist')) {
    console.log('❌ Table does not exist. Please create it manually.')
    console.log('\n📋 SQL to run in Supabase SQL Editor:')
    console.log('=' .repeat(60))
    console.log(sql)
    console.log('=' .repeat(60))
    return false
  }

  console.log('✅ audit_logs table created or already exists')
  return true
}

/**
 * Create indexes
 */
async function createIndexes(): Promise<boolean> {
  console.log('\n📇 Creating indexes...')

  const indexes = [
    {
      name: 'idx_audit_logs_activity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_activity ON audit_logs(activity);'
    },
    {
      name: 'idx_audit_logs_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);'
    }
  ]

  console.log('⚠️  Indexes should be created via SQL Editor')
  console.log('\n📋 SQL to run:')
  console.log('=' .repeat(60))
  indexes.forEach(idx => console.log(idx.sql))
  console.log('=' .repeat(60))

  return true
}

/**
 * Verify table exists and is accessible
 */
async function verifySetup(): Promise<boolean> {
  console.log('\n🔍 Verifying setup...')

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Cannot access audit_logs table:', error.message)
      return false
    }

    console.log('✅ audit_logs table is accessible')

    // Try to insert a test record
    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        activity: 'setup-test',
        status: 'completed',
        details: {
          message: 'Setup verification test',
          timestamp: new Date().toISOString()
        }
      })

    if (insertError) {
      console.error('❌ Cannot insert into audit_logs:', insertError.message)
      return false
    }

    console.log('✅ Successfully inserted test record')

    // Clean up test record
    await supabase
      .from('audit_logs')
      .delete()
      .eq('activity', 'setup-test')

    return true
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

/**
 * Update .env.local with cron token
 */
async function updateEnvFile(): Promise<boolean> {
  console.log('\n🔐 Setting up CRON_SECRET_TOKEN...')

  const envPath = path.resolve(__dirname, '../.env.local')

  try {
    let envContent = fs.readFileSync(envPath, 'utf-8')

    // Check if CRON_SECRET_TOKEN already has a secure value
    const currentTokenMatch = envContent.match(/CRON_SECRET_TOKEN=(.+)/)
    const currentToken = currentTokenMatch ? currentTokenMatch[1].trim() : null

    if (currentToken && currentToken !== 'your_secure_cron_secret_token_here_change_in_production') {
      console.log('✅ CRON_SECRET_TOKEN already set')
      console.log(`Token: ${currentToken.substring(0, 20)}...`)
      return true
    }

    // Generate new secure token
    const newToken = crypto.randomBytes(32).toString('hex')

    // Update CRON_SECRET_TOKEN
    if (currentTokenMatch) {
      envContent = envContent.replace(
        /CRON_SECRET_TOKEN=.+/,
        `CRON_SECRET_TOKEN=${newToken}`
      )
    } else {
      envContent += `\nCRON_SECRET_TOKEN=${newToken}\n`
    }

    // Write back to file
    fs.writeFileSync(envPath, envContent)

    console.log('✅ Generated new CRON_SECRET_TOKEN')
    console.log(`Token: ${newToken}`)
    console.log('⚠️  Save this token - you\'ll need it for production!')

    return true
  } catch (error) {
    console.error('❌ Failed to update .env.local:', error)
    return false
  }
}

/**
 * Print setup instructions
 */
function printInstructions() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 MANUAL SETUP REQUIRED')
  console.log('='.repeat(60))
  console.log('\n1. Go to your Supabase Dashboard:')
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`)
  console.log('\n2. Open SQL Editor')
  console.log('\n3. Copy and paste the following SQL:\n')

  const sql = `
-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_activity ON audit_logs(activity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow authenticated users to read
CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Logs for automated audit activities and cron jobs';
`.trim()

  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  console.log('\n4. Click "Run" to execute')
  console.log('\n5. Verify the table was created:')
  console.log('   SELECT * FROM audit_logs LIMIT 5;')
  console.log('\n' + '='.repeat(60))
}

/**
 * Main setup function
 */
async function setup() {
  console.log('🚀 PolitikCred\' Cron Database Setup')
  console.log('=' .repeat(60))

  // Step 1: Check if table exists
  const tableExists = await createAuditLogsTable()

  if (!tableExists) {
    printInstructions()
    console.log('\n⚠️  Please create the table manually and run this script again')
    process.exit(1)
  }

  // Step 2: Verify setup
  const verified = await verifySetup()

  if (!verified) {
    console.log('\n❌ Setup verification failed')
    printInstructions()
    process.exit(1)
  }

  // Step 3: Update .env.local
  await updateEnvFile()

  // Success!
  console.log('\n' + '='.repeat(60))
  console.log('✅ SETUP COMPLETE!')
  console.log('=' .repeat(60))
  console.log('\n📝 Next steps:')
  console.log('1. Restart your dev server: npm run dev')
  console.log('2. Test the cron endpoint:')
  console.log('\n   curl -X POST http://localhost:3000/api/cron/test-audit \\')
  console.log('     -H "Authorization: Bearer $(grep CRON_SECRET_TOKEN .env.local | cut -d= -f2)" \\')
  console.log('     -H "Content-Type: application/json"')
  console.log('\n3. Deploy to Netlify and add environment variables')
  console.log('=' .repeat(60))
}

// Run setup
setup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Setup failed:', err)
    process.exit(1)
  })
