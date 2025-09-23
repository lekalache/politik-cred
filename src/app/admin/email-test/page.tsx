'use client'

import { useState, useEffect } from 'react'
import { EmailSender } from '@/lib/email-sender'
import { useAuth } from '@/components/auth/auth-provider'
import { useRouter } from 'next/navigation'

interface ConfigStatus {
  isComplete: boolean
  warnings: string[]
  suggestions: string[]
}

export default function EmailTestPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null)

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || user.profile?.role !== 'admin')) {
      router.push('/') // Redirect non-admin users
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Check configuration status
    fetch('/api/mailjet-config')
      .then(res => res.json())
      .then(data => setConfigStatus(data))
      .catch(err => console.error('Failed to check config:', err))
  }, [])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  // Show error if not admin
  if (!user || user.profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-600 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès Refusé</h1>
            <p className="text-gray-600 mb-6">
              Cette page est réservée aux administrateurs uniquement.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sendTestEmail = async (type: string) => {
    if (!email) {
      setMessage('Please enter an email address')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      switch (type) {
        case 'welcome':
          await EmailSender.sendWelcomeEmail(email, 'Test User')
          break
        case 'verification':
          await EmailSender.sendEmailVerification(email, 'https://politik-cred.fr/verify?token=test123')
          break
        case 'password-reset':
          await EmailSender.sendPasswordReset(email, 'https://politik-cred.fr/reset?token=test123')
          break
        case 'vote-notification':
          await EmailSender.sendVoteNotification(email, 'Emmanuel Macron', 'negative')
          break
        case 'newsletter':
          await EmailSender.sendNewsletter(
            email,
            'Test Newsletter',
            '<p>Ceci est un test de newsletter Politik Cred\'.</p>'
          )
          break
      }
      setMessage(`${type} email sent successfully!`)
    } catch (error) {
      setMessage(`Error sending email: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Email Testing - Politik Cred'
          </h1>

          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test@example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => sendTestEmail('welcome')}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Send Welcome Email
            </button>

            <button
              onClick={() => sendTestEmail('verification')}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Send Verification Email
            </button>

            <button
              onClick={() => sendTestEmail('password-reset')}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Send Password Reset
            </button>

            <button
              onClick={() => sendTestEmail('vote-notification')}
              disabled={loading}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Send Vote Notification
            </button>

            <button
              onClick={() => sendTestEmail('newsletter')}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Send Newsletter
            </button>
          </div>

          {loading && (
            <div className="text-blue-600 font-medium">
              Sending email...
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-md ${
              message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {configStatus && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-3">Configuration Status</h3>

              {configStatus.isComplete ? (
                <div className="text-green-700 font-medium">
                  ✅ Mailjet configuration is complete and ready!
                </div>
              ) : (
                <div>
                  {configStatus.warnings.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-red-700 font-medium mb-1">Issues:</h4>
                      <ul className="text-red-600 text-sm space-y-1">
                        {configStatus.warnings.map((warning, i) => (
                          <li key={i}>❌ {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {configStatus.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-blue-700 font-medium mb-1">Suggestions:</h4>
                      <ul className="text-blue-600 text-sm space-y-1">
                        {configStatus.suggestions.map((suggestion, i) => (
                          <li key={i}>💡 {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-900 mb-2">Setup Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Sign up for a Mailjet account at <a href="https://mailjet.com" className="text-blue-600">mailjet.com</a></li>
              <li>Get your API Key and Secret Key from the Mailjet dashboard</li>
              <li>Update your .env.local file with your Mailjet credentials</li>
              <li>Configure your sender email and name</li>
              <li>Test the emails using this page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}