import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // In a more complex setup, you might want to:
    // 1. Invalidate server-side sessions
    // 2. Clear HTTP-only cookies
    // 3. Update last_active timestamp

    // For now, we just return success since the client handles the logout
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    })

  } catch (error) {
    console.error('Signout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}