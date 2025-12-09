/**
 * API Key Authentication Middleware
 *
 * Provides secure API key-based authentication for external integrations
 * and AI orchestrators. Supports scoped permissions and comprehensive
 * audit logging.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Use service role for API key operations (bypasses RLS)
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

export interface ApiKeyContext {
  keyId: string
  keyName: string
  tier: 'free' | 'standard' | 'premium' | 'enterprise'
  scopes: string[]
  metadata?: Record<string, any>
}

export type ApiKeyHandler = (
  request: NextRequest,
  context: ApiKeyContext
) => Promise<NextResponse> | NextResponse

/**
 * Extract API key from request headers
 * Supports both Authorization: Bearer and X-API-Key headers
 */
function extractApiKey(request: NextRequest): string | null {
  // Try Authorization: Bearer sk_xxx
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  // Try X-API-Key: sk_xxx
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader.trim()
  }

  return null
}

/**
 * Validate API key format
 */
function validateApiKeyFormat(key: string): boolean {
  // Format: sk_(live|test)_[32+ alphanumeric characters]
  const pattern = /^sk_(live|test)_[a-zA-Z0-9_-]{32,}$/
  return pattern.test(key)
}

/**
 * Hash API key with SHA-256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Check if scopes satisfy requirements (supports wildcards)
 */
function checkScopes(keyScopes: string[], requiredScopes: string[]): boolean {
  for (const requiredScope of requiredScopes) {
    let scopeMatched = false

    for (const keyScope of keyScopes) {
      // Exact match
      if (keyScope === requiredScope) {
        scopeMatched = true
        break
      }

      // Wildcard match: read:* matches read:anything
      if (keyScope.endsWith(':*')) {
        const prefix = keyScope.slice(0, -1) // Remove *
        if (requiredScope.startsWith(prefix)) {
          scopeMatched = true
          break
        }
      }

      // Admin wildcard: admin:* grants everything
      if (keyScope === 'admin:*') {
        scopeMatched = true
        break
      }
    }

    // If this required scope wasn't matched, return false
    if (!scopeMatched) {
      return false
    }
  }

  return true
}

/**
 * Check if client IP is allowed (if IP whitelist is configured)
 */
function checkIpWhitelist(clientIp: string, allowedIps: string[] | null): boolean {
  // If no whitelist configured, allow all IPs
  if (!allowedIps || allowedIps.length === 0) {
    return true
  }

  // Check if client IP is in whitelist
  return allowedIps.includes(clientIp)
}

/**
 * Log API usage asynchronously (non-blocking)
 */
async function logApiUsage(params: {
  apiKeyId: string
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  ipAddress: string
  userAgent: string | null
  errorMessage?: string
  rateLimitHit?: boolean
  rateLimitRemaining?: number
}): Promise<void> {
  try {
    await supabase.from('api_usage_logs').insert({
      api_key_id: params.apiKeyId,
      request_id: params.requestId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      error_message: params.errorMessage,
      rate_limit_hit: params.rateLimitHit || false,
      rate_limit_remaining: params.rateLimitRemaining
    })
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to log API usage:', error)
  }
}

/**
 * Update API key last used metadata
 */
async function updateKeyLastUsed(keyId: string, ipAddress: string): Promise<void> {
  try {
    // Note: total_requests counter is incremented via database trigger
    // We only update last_used_at and last_used_ip here
    await supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        last_used_ip: ipAddress
      })
      .eq('id', keyId)
  } catch (error) {
    console.error('Failed to update key last used:', error)
  }
}

/**
 * Main API key authentication middleware
 */
export async function withApiKey(
  request: NextRequest,
  requiredScopes: string[],
  handler: ApiKeyHandler
): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const endpoint = new URL(request.url).pathname
  const method = request.method
  const clientIp = getClientIp(request)
  const userAgent = request.headers.get('user-agent')

  try {
    // Step 1: Extract API key
    const apiKey = extractApiKey(request)

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Missing API key',
          code: 'MISSING_API_KEY',
          message: 'API key must be provided via Authorization: Bearer header or X-API-Key header'
        },
        { status: 401 }
      )
    }

    // Step 2: Validate format
    if (!validateApiKeyFormat(apiKey)) {
      return NextResponse.json(
        {
          error: 'Invalid API key format',
          code: 'INVALID_API_KEY_FORMAT',
          message: 'API key must be in format: sk_(live|test)_[32+ characters]'
        },
        { status: 401 }
      )
    }

    // Step 3: Hash and lookup key
    const keyHash = hashApiKey(apiKey)

    // DEBUG LOGGING - REMOVE AFTER FIXING
    console.log(`[API Key Debug] Key Prefix: ${apiKey.substring(0, 10)}...`)
    console.log(`[API Key Debug] Generated Hash: ${keyHash}`)

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single()

    if (keyError) {
      console.error(`[API Key Debug] DB Error: ${JSON.stringify(keyError)}`)
    }
    if (!keyData) {
      console.error(`[API Key Debug] Key not found in DB for hash: ${keyHash}`)
    }
    // END DEBUG LOGGING

    if (keyError || !keyData) {
      return NextResponse.json(
        {
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
          message: 'The provided API key does not exist or has been revoked'
        },
        { status: 401 }
      )
    }

    // Step 4: Check if key is active
    if (!keyData.is_active) {
      return NextResponse.json(
        {
          error: 'API key inactive',
          code: 'API_KEY_INACTIVE',
          message: 'This API key has been deactivated'
        },
        { status: 403 }
      )
    }

    // Step 5: Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: 'API key expired',
          code: 'API_KEY_EXPIRED',
          message: `This API key expired on ${keyData.expires_at}`
        },
        { status: 403 }
      )
    }

    // Step 6: Check IP whitelist
    if (!checkIpWhitelist(clientIp, keyData.allowed_ips)) {
      return NextResponse.json(
        {
          error: 'IP address not allowed',
          code: 'IP_NOT_ALLOWED',
          message: 'Your IP address is not in the whitelist for this API key'
        },
        { status: 403 }
      )
    }

    // Step 7: Check scopes
    if (!checkScopes(keyData.scopes, requiredScopes)) {
      return NextResponse.json(
        {
          error: 'Insufficient scopes',
          code: 'INSUFFICIENT_SCOPES',
          message: `This API key does not have the required scopes: ${requiredScopes.join(', ')}`,
          requiredScopes,
          keyScopes: keyData.scopes
        },
        { status: 403 }
      )
    }

    // Step 8: Build context
    const context: ApiKeyContext = {
      keyId: keyData.id,
      keyName: keyData.name,
      tier: keyData.tier,
      scopes: keyData.scopes,
      metadata: keyData.metadata
    }

    // Step 9: Update last used (async, non-blocking)
    updateKeyLastUsed(keyData.id, clientIp).catch(console.error)

    // Step 10: Call handler
    const response = await handler(request, context)

    // Step 11: Add custom headers
    response.headers.set('X-Request-ID', requestId)
    response.headers.set('X-API-Key-Name', keyData.name)
    response.headers.set('X-API-Tier', keyData.tier)

    // Step 12: Log usage (async, non-blocking)
    const responseTimeMs = Date.now() - startTime
    logApiUsage({
      apiKeyId: keyData.id,
      requestId,
      endpoint,
      method,
      statusCode: response.status,
      responseTimeMs,
      ipAddress: clientIp,
      userAgent
    }).catch(console.error)

    return response
  } catch (error) {
    console.error('API key authentication error:', error)

    const responseTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Authentication failed',
        code: 'AUTHENTICATION_ERROR',
        message: 'An error occurred during authentication',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * Convenience wrapper for admin-only API key operations
 */
export async function withAdminApiKey(
  request: NextRequest,
  handler: ApiKeyHandler
): Promise<NextResponse> {
  return withApiKey(request, ['admin:*'], handler)
}
