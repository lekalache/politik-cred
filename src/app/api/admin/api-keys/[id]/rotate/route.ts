/**
 * Admin API: API Key Rotation
 * POST /api/admin/api-keys/[id]/rotate - Rotate API key
 *
 * Creates a new key with identical permissions and sets the old key
 * to expire in 7 days (grace period).
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
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
 * POST /api/admin/api-keys/[id]/rotate
 * Rotate API key (generate new key, set old to expire)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRateLimit(request, RateLimitPresets.strict, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        const { id } = params

        // Validate ID format
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          return NextResponse.json(
            { error: 'Invalid API key ID format' },
            { status: 400 }
          )
        }

        // Fetch existing key
        const { data: oldKey, error: fetchError } = await supabase
          .from('api_keys')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError || !oldKey) {
          return NextResponse.json(
            { error: 'API key not found' },
            { status: 404 }
          )
        }

        // Check if key is already expired or inactive
        if (!oldKey.is_active) {
          return NextResponse.json(
            {
              error: 'Cannot rotate inactive key',
              message: 'The API key is already inactive and cannot be rotated'
            },
            { status: 400 }
          )
        }

        // Generate new API key
        const newApiKey = generateApiKey('sk_live')
        const newKeyHash = hashApiKey(newApiKey)
        const newKeyPrefix = newApiKey.substring(0, 16)

        // Set old key to expire in 7 days (grace period)
        const gracePeriodExpiry = new Date()
        gracePeriodExpiry.setDate(gracePeriodExpiry.getDate() + 7)

        // Update old key with expiration
        const { error: updateOldError } = await supabase
          .from('api_keys')
          .update({
            expires_at: gracePeriodExpiry.toISOString(),
            metadata: {
              ...oldKey.metadata,
              rotated_at: new Date().toISOString(),
              rotation_reason: 'Key rotation requested by admin'
            }
          })
          .eq('id', id)

        if (updateOldError) throw updateOldError

        // Create new key with same permissions
        const { data: newKey, error: createError } = await supabase
          .from('api_keys')
          .insert({
            key_hash: newKeyHash,
            key_prefix: newKeyPrefix,
            name: `${oldKey.name} (Rotated ${new Date().toISOString().split('T')[0]})`,
            tier: oldKey.tier,
            scopes: oldKey.scopes,
            is_active: true,
            allowed_ips: oldKey.allowed_ips,
            rate_limit_minute: oldKey.rate_limit_minute,
            rate_limit_hour: oldKey.rate_limit_hour,
            rate_limit_day: oldKey.rate_limit_day,
            created_by: authContext.user.id,
            metadata: {
              ...oldKey.metadata,
              rotated_from: id,
              original_key_name: oldKey.name
            }
          })
          .select()
          .single()

        if (createError) throw createError

        console.log(
          `API key rotated: ${oldKey.name} -> ${newKey.name} by ${authContext.user.email}`
        )

        return NextResponse.json({
          success: true,
          message: 'API key rotated successfully',
          data: {
            old_key: {
              id: oldKey.id,
              name: oldKey.name,
              expires_at: gracePeriodExpiry.toISOString(),
              grace_period_days: 7
            },
            new_key: {
              ...newKey,
              api_key: newApiKey // ONLY shown once
            }
          },
          warning:
            '⚠️ SAVE THE NEW KEY NOW! It will not be shown again. The old key will expire in 7 days.'
        })
      } catch (error) {
        console.error('Error rotating API key:', error)
        return NextResponse.json(
          {
            error: 'Failed to rotate API key',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}
