"use client"

import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
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

export const auth = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user'
        }
      }
    })

    // The user profile will be automatically created by the database trigger
    // But we can also ensure it exists explicitly if needed
    if (data.user && !error) {
      try {
        await supabase.rpc('ensure_user_exists', {
          user_id: data.user.id
        })
      } catch (profileError) {
        console.error('Error ensuring user profile exists:', profileError)
        // Don't fail the signup for this - the trigger should handle it
      }
    }

    return { data, error }
  },

  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  async signOut() {
    return await supabase.auth.signOut()
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch user profile from database to get role
    const { data: profile } = await supabase
      .from('users')
      .select('name, role, is_verified')
      .eq('id', user.id)
      .single()

    return {
      ...user,
      profile
    } as AuthUser
  },

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    return { data, error }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}