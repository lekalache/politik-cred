'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export function WelcomeBanner() {
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()

  useEffect(() => {
    // Check for welcome parameter
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      // Remove the parameter from URL
      router.replace('/', { scroll: false })
      // Refresh user data to ensure navigation shows user as logged in
      refreshUser()
      // Hide welcome message after 5 seconds
      setTimeout(() => setShowWelcome(false), 5000)
    }
  }, [searchParams, router, refreshUser])

  if (!showWelcome) return null

  return (
    <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Bienvenue sur Politik Cred' !</h3>
              <p className="text-sm text-green-700">
                Votre compte a été vérifié avec succès.
              </p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-green-600 hover:text-green-800 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}