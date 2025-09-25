import crypto from 'crypto'
import { supabase } from './supabase'

export interface VerificationToken {
  id: string
  user_id: string
  email: string
  token: string
  expires_at: string
  created_at: string
  used: boolean
}

export class VerificationTokenService {
  /**
   * Generate a secure verification token for a user
   */
  static async generateToken(userId: string, email: string): Promise<{ token: string; expires_at: string }> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Store the token in the database
    const { error } = await supabase
      .from('verification_tokens')
      .insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (error) {
      throw new Error('Failed to generate verification token')
    }

    return {
      token,
      expires_at: expiresAt.toISOString()
    }
  }

  /**
   * Verify a token and mark user as verified
   */
  static async verifyToken(token: string): Promise<{ success: boolean; user_id?: string; email?: string; error?: string }> {
    try {
      // Find the token
      const { data: tokenData, error: tokenError } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single()

      if (tokenError || !tokenData) {
        return { success: false, error: 'Invalid or expired token' }
      }

      // Check if token is expired
      if (new Date() > new Date(tokenData.expires_at)) {
        return { success: false, error: 'Token has expired' }
      }

      // Mark token as used
      await supabase
        .from('verification_tokens')
        .update({ used: true })
        .eq('id', tokenData.id)

      // Mark user as verified
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', tokenData.user_id)

      return {
        success: true,
        user_id: tokenData.user_id,
        email: tokenData.email
      }
    } catch (error) {
      console.error('Token verification error:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const { error } = await supabase
      .from('verification_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Failed to cleanup expired tokens:', error)
    }
  }
}