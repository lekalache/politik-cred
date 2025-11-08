/**
 * Authentication Middleware
 * Reusable authentication and authorization checks for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface AuthContext {
  user: {
    id: string
    email?: string
  }
  role: 'user' | 'moderator' | 'admin'
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse> | NextResponse

/**
 * Middleware that verifies authentication and authorization
 */
export async function withAuth(
  request: NextRequest,
  requiredRoles: Array<'user' | 'moderator' | 'admin'> = ['user'],
  handler: AuthenticatedHandler
): Promise<NextResponse> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify user authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get user role from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 }
      )
    }

    // Check if user has required role
    if (!requiredRoles.includes(userProfile.role)) {
      return NextResponse.json(
        {
          error: `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`,
          userRole: userProfile.role
        },
        { status: 403 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user: {
        id: user.id,
        email: user.email
      },
      role: userProfile.role
    }

    // Call the handler with auth context
    return await handler(request, authContext)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Convenience wrapper for admin-only routes
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: AuthenticatedHandler
): Promise<NextResponse> {
  return withAuth(request, ['admin', 'moderator'], handler)
}
