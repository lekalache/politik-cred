'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export default function VerifySuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const router = useRouter()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const verified = searchParams.get('verified')

    // Check if user was successfully verified
    const checkVerification = async () => {
      try {
        if (verified === 'true') {
          setStatus('success')

          // Get user info from URL params
          const userId = searchParams.get('user_id')
          const email = searchParams.get('email')

          if (userId && email) {
            try {
              // Fetch the verified user data and set it in auth
              const { supabase } = await import('@/lib/supabase')
              const { data: userData } = await supabase
                .from('users')
                .select('id, email, name, role, is_verified, reputation_score')
                .eq('id', userId)
                .single()

              if (userData) {
                // Auto-signin the user by setting their data in the auth system
                const { customAuth } = await import('@/lib/custom-auth')
                const userForAuth = {
                  ...userData,
                  user_metadata: {
                    name: userData.name,
                    role: userData.role
                  },
                  profile: {
                    name: userData.name,
                    role: userData.role,
                    is_verified: userData.is_verified
                  }
                }
                customAuth.setUser(userForAuth)
              }
            } catch (error) {
              console.error('Error auto-signing in user:', error)
            }
          }

          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/?welcome=true')
          }, 3000)
        } else {
          // If no verification parameter, show error
          setStatus('error')
        }
      } catch (error) {
        console.error('Verification check error:', error)
        setStatus('error')
      }
    }

    checkVerification()
  }, [router, refreshUser])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {status === 'loading' && (
            <Card className="text-center p-8">
              <CardContent className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <h2 className="text-xl font-semibold">Vérification en cours...</h2>
                <p className="text-gray-600">Patientez quelques instants</p>
              </CardContent>
            </Card>
          )}

          {status === 'success' && (
            <Card className="text-center p-8 border-green-200 bg-green-50">
              <CardContent className="space-y-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <h2 className="text-2xl font-bold text-green-800">Email vérifié avec succès !</h2>
                <p className="text-green-700">
                  Votre compte Politik Cred' est maintenant activé.
                </p>
                <p className="text-sm text-green-600">
                  Vous allez être redirigé vers la page d'accueil...
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/')}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Continuer vers la plateforme
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {status === 'error' && (
            <Card className="text-center p-8 border-red-200 bg-red-50">
              <CardContent className="space-y-4">
                <AlertCircle className="h-16 w-16 text-red-600 mx-auto" />
                <h2 className="text-2xl font-bold text-red-800">Erreur de vérification</h2>
                <p className="text-red-700">
                  Une erreur est survenue lors de la vérification de votre email.
                </p>
                <div className="space-y-2 mt-4">
                  <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Retour à l'accueil
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}