import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { user_id, email } = await request.json()

    if (!user_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update user as verified in our users table
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_verified: true })
      .eq('id', user_id)
      .eq('email', email)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User verified successfully'
    })

  } catch (error) {
    console.error('Verify user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}