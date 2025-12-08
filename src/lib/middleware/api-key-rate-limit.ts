/**
 * API Key Rate Limiting Middleware
 *
 * Implements per-key rate limiting using a sliding window algorithm
 * with separate limits for minute/hour/day windows and tiered access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiKeyContext, ApiKeyHandler } from './api-key'

// Use service role for rate limit operations
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
 * Tier default rate limits
 */
const TIER_RATE_LIMITS = {
  free: {
    minute: 10,
    hour: 100,
    day: 1000
  },
  standard: {
    minute: 60,
    hour: 1000,
    day: 10000
  },
  premium: {
    minute: 120,
    hour: 5000,
    day: 50000
  },
  enterprise: {
    minute: 300,
    hour: 20000,
    day: 200000
  }
} as const

type WindowType = 'minute' | 'hour' | 'day'

interface RateLimitWindow {
  windowType: WindowType
  windowStart: Date
  limit: number
}

/**
 * Calculate window start time for a given window type
 */
function getWindowStart(windowType: WindowType, now: Date = new Date()): Date {
  const start = new Date(now)

  switch (windowType) {
    case 'minute':
      start.setSeconds(0, 0)
      break
    case 'hour':
      start.setMinutes(0, 0, 0)
      break
    case 'day':
      start.setHours(0, 0, 0, 0)
      break
  }

  return start
}

/**
 * Get rate limits for an API key (custom or tier defaults)
 */
async function getKeyRateLimits(
  keyId: string,
  tier: string
): Promise<{ minute: number; hour: number; day: number }> {
  try {
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('rate_limit_minute, rate_limit_hour, rate_limit_day')
      .eq('id', keyId)
      .single()

    if (error || !keyData) {
      // Fallback to tier defaults
      return TIER_RATE_LIMITS[tier as keyof typeof TIER_RATE_LIMITS] || TIER_RATE_LIMITS.free
    }

    // Use custom limits if set, otherwise use tier defaults
    const tierDefaults = TIER_RATE_LIMITS[tier as keyof typeof TIER_RATE_LIMITS] || TIER_RATE_LIMITS.free

    return {
      minute: keyData.rate_limit_minute ?? tierDefaults.minute,
      hour: keyData.rate_limit_hour ?? tierDefaults.hour,
      day: keyData.rate_limit_day ?? tierDefaults.day
    }
  } catch (error) {
    console.error('Error fetching rate limits:', error)
    // Fallback to tier defaults on error
    return TIER_RATE_LIMITS[tier as keyof typeof TIER_RATE_LIMITS] || TIER_RATE_LIMITS.free
  }
}

/**
 * Get current request count for a window
 */
async function getWindowCount(
  keyId: string,
  windowType: WindowType,
  windowStart: Date
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('api_key_id', keyId)
      .eq('window_type', windowType)
      .eq('window_start', windowStart.toISOString())
      .single()

    if (error || !data) {
      return 0
    }

    return data.request_count
  } catch (error) {
    console.error('Error fetching window count:', error)
    return 0
  }
}

/**
 * Increment window counter (upsert)
 */
async function incrementWindowCount(
  keyId: string,
  windowType: WindowType,
  windowStart: Date
): Promise<void> {
  try {
    // Try to increment existing record
    const { data: existing } = await supabase
      .from('api_rate_limits')
      .select('id, request_count')
      .eq('api_key_id', keyId)
      .eq('window_type', windowType)
      .eq('window_start', windowStart.toISOString())
      .single()

    if (existing) {
      // Update existing record
      await supabase
        .from('api_rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('id', existing.id)
    } else {
      // Insert new record
      await supabase.from('api_rate_limits').insert({
        api_key_id: keyId,
        window_type: windowType,
        window_start: windowStart.toISOString(),
        request_count: 1
      })
    }
  } catch (error) {
    console.error('Error incrementing window count:', error)
  }
}

/**
 * Calculate time until window resets
 */
function getWindowResetTime(windowType: WindowType, windowStart: Date): Date {
  const reset = new Date(windowStart)

  switch (windowType) {
    case 'minute':
      reset.setMinutes(reset.getMinutes() + 1)
      break
    case 'hour':
      reset.setHours(reset.getHours() + 1)
      break
    case 'day':
      reset.setDate(reset.getDate() + 1)
      break
  }

  return reset
}

/**
 * API Key Rate Limiting Middleware
 */
export async function withApiKeyRateLimit(
  request: NextRequest,
  context: ApiKeyContext,
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const now = new Date()
  const windows: RateLimitWindow[] = [
    { windowType: 'minute', windowStart: getWindowStart('minute', now), limit: 0 },
    { windowType: 'hour', windowStart: getWindowStart('hour', now), limit: 0 },
    { windowType: 'day', windowStart: getWindowStart('day', now), limit: 0 }
  ]

  try {
    // Get rate limits for this key
    const limits = await getKeyRateLimits(context.keyId, context.tier)
    windows[0].limit = limits.minute
    windows[1].limit = limits.hour
    windows[2].limit = limits.day

    // Check each window
    for (const window of windows) {
      const currentCount = await getWindowCount(
        context.keyId,
        window.windowType,
        window.windowStart
      )

      // If limit exceeded, return 429
      if (currentCount >= window.limit) {
        const resetTime = getWindowResetTime(window.windowType, window.windowStart)
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for ${window.windowType} window. Please try again later.`,
            limit: window.limit,
            window: window.windowType,
            retryAfter: `${retryAfter}s`,
            resetAt: resetTime.toISOString()
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': window.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.floor(resetTime.getTime() / 1000).toString(),
              'Retry-After': retryAfter.toString()
            }
          }
        )
      }
    }

    // Increment counters for all windows (async, but wait for completion)
    await Promise.all(
      windows.map(window =>
        incrementWindowCount(context.keyId, window.windowType, window.windowStart)
      )
    )

    // Call handler
    const response = await handler()

    // Add rate limit headers (using minute window as primary)
    const minuteCount = await getWindowCount(context.keyId, 'minute', windows[0].windowStart)
    const minuteLimit = windows[0].limit
    const minuteReset = getWindowResetTime('minute', windows[0].windowStart)

    response.headers.set('X-RateLimit-Limit', minuteLimit.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, minuteLimit - minuteCount).toString())
    response.headers.set('X-RateLimit-Reset', Math.floor(minuteReset.getTime() / 1000).toString())

    return response
  } catch (error) {
    console.error('Rate limit middleware error:', error)

    // On error, fail open (allow request but log warning)
    console.warn('Rate limiting failed - allowing request')
    return await handler()
  }
}

/**
 * Compose API key auth + rate limit middleware
 * Convenience function to apply both middlewares in correct order
 */
export function composeApiKeyMiddleware(requiredScopes: string[]) {
  return async (
    request: NextRequest,
    handler: ApiKeyHandler
  ): Promise<NextResponse> => {
    const { withApiKey } = await import('./api-key')

    return withApiKey(request, requiredScopes, async (req, context) => {
      return withApiKeyRateLimit(req, context, () => handler(req, context))
    })
  }
}
