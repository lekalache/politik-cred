"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { customAuth, CustomUser } from '@/lib/custom-auth'

interface AuthContextType {
  user: CustomUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, name: string) => Promise<any>
  signOut: () => Promise<any>
  refreshUser: () => Promise<CustomUser | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    customAuth.getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const unsubscribe = customAuth.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const refreshUser = async () => {
    const refreshedUser = await customAuth.refreshUser()
    setUser(refreshedUser)
    return refreshedUser
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: customAuth.signIn.bind(customAuth),
        signUp: customAuth.signUp.bind(customAuth),
        signOut: customAuth.signOut.bind(customAuth),
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}