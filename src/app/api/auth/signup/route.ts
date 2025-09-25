import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { VerificationTokenService } from '@/lib/verification-tokens'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user in our database directly (not using Supabase Auth to avoid free tier limits)
    const userId = crypto.randomUUID()
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        password_hash: hashedPassword,
        role: 'user',
        is_verified: false,
        created_at: new Date().toISOString()
      })

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Generate verification token
    const { token } = await VerificationTokenService.generateToken(userId, email)

    // Create verification link with dynamic domain detection
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`
    const verificationLink = `${baseUrl}/api/verify-email?token=${token}`

    // Send verification email using server-side function
    try {
      const { sendServerEmail } = await import('@/lib/email-sender')
      await sendServerEmail('email-verification', {
        to: email,
        toName: name,
        verificationLink
      })
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the signup for email errors - user can resend later
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.',
      user: {
        id: userId,
        email,
        name
      }
    })

  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}