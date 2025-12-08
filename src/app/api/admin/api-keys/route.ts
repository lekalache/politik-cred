/**
 * Admin API: API Key Management
 * GET /api/admin/api-keys - List all API keys with usage stats
 * POST /api/admin/api-keys - Create new API key
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  ApiKeyCreationSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'
import crypto from 'crypto'

// Use service role for admin operations
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

/**
 * Generate secure API key
 */
function generateApiKey(prefix: 'sk_live' | 'sk_test' = 'sk_live'): string {
  const randomBytes = crypto.randomBytes(24)
  return `${prefix}_${randomBytes.toString('base64url')}`
}

/**
 * Hash API key with SHA-256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * GET /api/admin/api-keys
 * List all API keys with usage statistics
 */
export async function GET(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.relaxed, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Fetch all API keys (exclude sensitive key_hash)
        const { data: keys, error: keysError } = await supabase
          .from('api_keys')
          .select(
            `
            id,
            key_prefix,
            name,
            tier,
            scopes,
            is_active,
            expires_at,
            allowed_ips,
            created_by,
            last_used_at,
            last_used_ip,
            total_requests,
            rate_limit_minute,
            rate_limit_hour,
            rate_limit_day,
            created_at,
            updated_at
          `
          )
          .order('created_at', { ascending: false })

        if (keysError) throw keysError

        // Fetch usage statistics for each key
        const keysWithStats = await Promise.all(
          (keys || []).map(async key => {
            // Get usage logs count and recent activity
            const { count: totalRequests, error: logsError } = await supabase
              .from('api_usage_logs')
              .select('*', { count: 'exact', head: true })
              .eq('api_key_id', key.id)

            // Get success/error counts for last 30 days
            const { data: recentLogs } = await supabase
              .from('api_usage_logs')
              .select('status_code')
              .eq('api_key_id', key.id)
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

            const successCount =
              recentLogs?.filter(log => log.status_code >= 200 && log.status_code < 300)
                .length || 0
            const errorCount =
              recentLogs?.filter(log => log.status_code >= 400).length || 0

            return {
              ...key,
              usage: {
                total_requests: totalRequests || 0,
                success_requests_30d: successCount,
                error_requests_30d: errorCount,
                error_rate_30d:
                  successCount + errorCount > 0
                    ? (errorCount / (successCount + errorCount)) * 100
                    : 0
              }
            }
          })
        )

        return NextResponse.json({
          success: true,
          data: keysWithStats,
          meta: {
            total: keysWithStats.length,
            active: keysWithStats.filter(k => k.is_active).length,
            inactive: keysWithStats.filter(k => !k.is_active).length
          }
        })
      } catch (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json(
          {
            error: 'Failed to fetch API keys',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

/**
 * POST /api/admin/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimitPresets.moderate, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(ApiKeyCreationSchema, body)

        if (!validation.success) {
          return NextResponse.json(formatValidationErrors(validation.errors), {
            status: 400
          })
        }

        const { name, tier, scopes, expires_at, allowed_ips, metadata } = validation.data

        // Validate scopes exist
        const { data: validScopes, error: scopesError } = await supabase
          .from('api_key_scopes')
          .select('scope')

        if (scopesError) throw scopesError

        const validScopeNames = new Set(validScopes?.map(s => s.scope) || [])

        // Check if all requested scopes are valid (excluding wildcards)
        for (const scope of scopes) {
          if (!scope.endsWith(':*') && !validScopeNames.has(scope)) {
            return NextResponse.json(
              {
                error: 'Invalid scope',
                message: `Scope '${scope}' does not exist`,
                validScopes: Array.from(validScopeNames)
              },
              { status: 400 }
            )
          }
        }

        // Generate API key
        const apiKey = generateApiKey('sk_live')
        const keyHash = hashApiKey(apiKey)
        const keyPrefix = apiKey.substring(0, 16)

        // Create key in database
        const { data: newKey, error: createError } = await supabase
          .from('api_keys')
          .insert({
            key_hash: keyHash,
            key_prefix: keyPrefix,
            name,
            tier,
            scopes,
            is_active: true,
            expires_at,
            allowed_ips,
            created_by: authContext.user.id,
            metadata
          })
          .select()
          .single()

        if (createError) throw createError

        console.log(
          `API key created: ${name} (${tier}) by ${authContext.user.email}`
        )

        // Return full key ONLY once (never stored in database)
        return NextResponse.json(
          {
            success: true,
            message: 'API key created successfully',
            data: {
              ...newKey,
              api_key: apiKey // ONLY shown once
            },
            warning:
              '⚠️ SAVE THIS KEY NOW! It will not be shown again and cannot be recovered.'
          },
          { status: 201 }
        )
      } catch (error) {
        console.error('Error creating API key:', error)
        return NextResponse.json(
          {
            error: 'Failed to create API key',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}
