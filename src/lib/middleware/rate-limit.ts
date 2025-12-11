/**
 * Rate Limiting Middleware
 * Prevents API abuse and DOS attacks
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (use Redis for production multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Get rate limit key from request
 * Uses IP address + endpoint for granular rate limiting
 */
function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const endpoint = new URL(request.url).pathname

  return `${ip}:${endpoint}`
}

/**
 * Clean up expired entries (run periodically)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Rate limiting middleware
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  // Check for cron secret bypass
  const authHeader = request.headers.get('authorization')
  if (
    authHeader?.startsWith('Bearer ') &&
    process.env.CRON_SECRET_TOKEN &&
    authHeader.substring(7) === process.env.CRON_SECRET_TOKEN
  ) {
    return await handler()
  }

  const key = getRateLimitKey(request)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, entry)
  }

  // Increment request count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

    return NextResponse.json(
      {
        error: config.message || 'Rate limit exceeded',
        retryAfter: `${retryAfter}s`,
        limit: config.maxRequests,
        window: `${config.windowMs / 1000}s`
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': retryAfter.toString()
        }
      }
    )
  }

  // Add rate limit headers to response
  const response = await handler()

  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set(
    'X-RateLimit-Remaining',
    (config.maxRequests - entry.count).toString()
  )
  response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())

  return response
}

/**
 * Preset configurations for common use cases
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute (for expensive operations)
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many requests. Please try again in a minute.'
  },

  // Moderate: 30 requests per minute (for normal API operations)
  moderate: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Too many requests. Please slow down.'
  },

  // Relaxed: 100 requests per minute (for read-only operations)
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests. Please wait before retrying.'
  },

  // Data collection: 1 request per 5 minutes (very expensive operations)
  dataCollection: {
    windowMs: 5 * 60 * 1000,
    maxRequests: 1,
    message: 'Data collection can only be triggered once every 5 minutes.'
  }
}
