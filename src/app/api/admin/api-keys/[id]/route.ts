/**
 * Admin API: Individual API Key Management
 * PATCH /api/admin/api-keys/[id] - Update API key
 * DELETE /api/admin/api-keys/[id] - Revoke API key
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/middleware/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'
import {
  ApiKeyUpdateSchema,
  validateRequest,
  formatValidationErrors
} from '@/lib/validation/schemas'

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
 * PATCH /api/admin/api-keys/[id]
 * Update API key metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withRateLimit(request, RateLimitPresets.moderate, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Validate ID format
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          return NextResponse.json(
            { error: 'Invalid API key ID format' },
            { status: 400 }
          )
        }

        // Check if key exists
        const { data: existingKey, error: fetchError } = await supabase
          .from('api_keys')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError || !existingKey) {
          return NextResponse.json(
            { error: 'API key not found' },
            { status: 404 }
          )
        }

        // Parse and validate request body
        const body = await req.json()
        const validation = await validateRequest(ApiKeyUpdateSchema, body)

        if (!validation.success) {
          return NextResponse.json(formatValidationErrors(validation.errors), {
            status: 400
          })
        }

        const updateData = validation.data

        // If scopes are being updated, validate them
        if (updateData.scopes) {
          const { data: validScopes, error: scopesError } = await supabase
            .from('api_key_scopes')
            .select('scope')

          if (scopesError) throw scopesError

          const validScopeNames = new Set(validScopes?.map(s => s.scope) || [])

          for (const scope of updateData.scopes) {
            if (!scope.endsWith(':*') && !validScopeNames.has(scope)) {
              return NextResponse.json(
                {
                  error: 'Invalid scope',
                  message: `Scope '${scope}' does not exist`
                },
                { status: 400 }
              )
            }
          }
        }

        // Update API key
        const { data: updatedKey, error: updateError } = await supabase
          .from('api_keys')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError

        console.log(
          `API key updated: ${existingKey.name} by ${authContext.user.email}`
        )

        return NextResponse.json({
          success: true,
          message: 'API key updated successfully',
          data: updatedKey
        })
      } catch (error) {
        console.error('Error updating API key:', error)
        return NextResponse.json(
          {
            error: 'Failed to update API key',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}

/**
 * DELETE /api/admin/api-keys/[id]
 * Revoke (deactivate) API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withRateLimit(request, RateLimitPresets.moderate, async () => {
    return withAdminAuth(request, async (req, authContext) => {
      try {
        // Validate ID format
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          return NextResponse.json(
            { error: 'Invalid API key ID format' },
            { status: 400 }
          )
        }

        // Check if key exists
        const { data: existingKey, error: fetchError } = await supabase
          .from('api_keys')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError || !existingKey) {
          return NextResponse.json(
            { error: 'API key not found' },
            { status: 404 }
          )
        }

        // Deactivate the key (don't actually delete for audit purposes)
        const { data: revokedKey, error: revokeError } = await supabase
          .from('api_keys')
          .update({ is_active: false })
          .eq('id', id)
          .select()
          .single()

        if (revokeError) throw revokeError

        console.log(
          `API key revoked: ${existingKey.name} by ${authContext.user.email}`
        )

        return NextResponse.json({
          success: true,
          message: 'API key revoked successfully',
          data: revokedKey
        })
      } catch (error) {
        console.error('Error revoking API key:', error)
        return NextResponse.json(
          {
            error: 'Failed to revoke API key',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    })
  })
}
