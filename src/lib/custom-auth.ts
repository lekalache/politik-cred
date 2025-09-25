'use client'

import { supabase } from './supabase'

export interface CustomUser {
  id: string
  email: string
  name: string
  role: 'user' | 'moderator' | 'admin'
  is_verified: boolean
  reputation_score: number
  user_metadata?: {
    name?: string
    role?: 'user' | 'moderator' | 'admin'
  }
  profile?: {
    name: string
    role: 'user' | 'moderator' | 'admin'
    is_verified: boolean
  }
}

class CustomAuthService {
  private currentUser: CustomUser | null = null
  private listeners: ((user: CustomUser | null) => void)[] = []

  async signIn(email: string, password: string): Promise<{ data?: { user: CustomUser }, error?: { message: string } }> {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()

      if (!response.ok) {
        return { error: { message: result.error || 'Sign in failed' } }
      }

      // Set user and notify listeners
      this.currentUser = result.user
      this.notifyListeners(this.currentUser)

      // Store in localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser))

      return { data: { user: this.currentUser } }
    } catch (error) {
      return { error: { message: 'Network error' } }
    }
  }

  async signUp(email: string, password: string, name: string): Promise<{ data?: any, error?: { message: string } }> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name })
      })

      const result = await response.json()

      if (!response.ok) {
        return { error: { message: result.error || 'Sign up failed' } }
      }

      return { data: result }
    } catch (error) {
      return { error: { message: 'Network error' } }
    }
  }

  async signOut(): Promise<{ error?: { message: string } }> {
    try {
      // Clear user state
      this.currentUser = null
      this.notifyListeners(null)

      // Clear localStorage
      localStorage.removeItem('auth_user')

      // Optionally call server to clear server-side session
      await fetch('/api/auth/signout', { method: 'POST' })

      return {}
    } catch (error) {
      return { error: { message: 'Sign out failed' } }
    }
  }

  async getCurrentUser(): Promise<CustomUser | null> {
    // If we already have a user in memory, return it
    if (this.currentUser) {
      return this.currentUser
    }

    // Try to get from localStorage
    try {
      const stored = localStorage.getItem('auth_user')
      if (stored) {
        this.currentUser = JSON.parse(stored)
        return this.currentUser
      }
    } catch (error) {
      console.error('Error parsing stored user:', error)
      localStorage.removeItem('auth_user')
    }

    return null
  }

  // Method to refresh user data (useful after verification)
  async refreshUser(): Promise<CustomUser | null> {
    const stored = localStorage.getItem('auth_user')
    if (!stored) return null

    try {
      const userData = JSON.parse(stored)
      // Fetch latest user data from database
      const { data } = await supabase
        .from('users')
        .select('id, email, name, role, is_verified, reputation_score')
        .eq('id', userData.id)
        .single()

      if (data) {
        const refreshedUser: CustomUser = {
          ...data,
          user_metadata: {
            name: data.name,
            role: data.role
          },
          profile: {
            name: data.name,
            role: data.role,
            is_verified: data.is_verified
          }
        }

        this.currentUser = refreshedUser
        localStorage.setItem('auth_user', JSON.stringify(refreshedUser))
        this.notifyListeners(refreshedUser)
        return refreshedUser
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }

    return null
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: CustomUser | null) => void) {
    this.listeners.push(callback)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  private notifyListeners(user: CustomUser | null) {
    this.listeners.forEach(listener => listener(user))
  }

  // Method to set user after verification
  setUser(user: CustomUser) {
    this.currentUser = user
    localStorage.setItem('auth_user', JSON.stringify(user))
    this.notifyListeners(user)
  }
}

export const customAuth = new CustomAuthService()

// For backward compatibility with existing code
export const auth = {
  signIn: customAuth.signIn.bind(customAuth),
  signUp: customAuth.signUp.bind(customAuth),
  signOut: customAuth.signOut.bind(customAuth),
  getCurrentUser: customAuth.getCurrentUser.bind(customAuth),
  onAuthStateChange: (callback: any) => {
    const unsubscribe = customAuth.onAuthStateChange(callback)
    return { data: { subscription: { unsubscribe } } }
  }
}