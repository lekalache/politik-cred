import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, password_hash, role, is_verified, reputation_score')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is verified
    if (!user.is_verified) {
      return NextResponse.json(
        { error: 'Please verify your email address before signing in' },
        { status: 403 }
      )
    }

    // Update last active timestamp
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id)

    // Return user data (excluding password_hash)
    const { password_hash, ...safeUser } = user
    const userResponse = {
      ...safeUser,
      user_metadata: {
        name: user.name,
        role: user.role
      },
      profile: {
        name: user.name,
        role: user.role,
        is_verified: user.is_verified
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sign in successful',
      user: userResponse
    })

  } catch (error) {
    console.error('Signin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}