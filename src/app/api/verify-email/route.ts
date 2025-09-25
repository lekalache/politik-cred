import { NextRequest, NextResponse } from 'next/server'
import { VerificationTokenService } from '@/lib/verification-tokens'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/?error=missing_token', request.url))
    }

    // Verify the token using our custom service
    const result = await VerificationTokenService.verifyToken(token)

    if (!result.success) {
      console.error('Token verification error:', result.error)
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url))
    }

    // Redirect to success page with user info for auto-signin
    const redirectUrl = `/verify-success?verified=true&user_id=${result.user_id}&email=${encodeURIComponent(result.email || '')}`
    return NextResponse.redirect(new URL(redirectUrl, request.url))

  } catch (error) {
    console.error('Verification endpoint error:', error)
    return NextResponse.redirect(new URL('/?error=server_error', request.url))
  }
}