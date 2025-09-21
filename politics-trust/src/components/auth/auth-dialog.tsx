"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from './auth-provider'
import { AlertCircle, CheckCircle, User, Mail, Lock } from 'lucide-react'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

export function AuthDialog({ open, onClose, defaultMode = 'signin' }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  // Sync internal mode with defaultMode prop when it changes
  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas')
          return
        }

        if (formData.password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères')
          return
        }

        const { error } = await signUp(formData.email, formData.password, formData.name)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Compte créé avec succès! Vérifiez votre email pour confirmer votre compte.')
        }
      } else {
        const { error } = await signIn(formData.email, formData.password)
        if (error) {
          setError('Email ou mot de passe incorrect')
        } else {
          setSuccess('Connexion réussie!')
          setTimeout(() => {
            onClose()
            resetForm()
          }, 1000)
        }
      }
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    })
    setError(null)
    setSuccess(null)
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{success}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Nom complet</span>
              </Label>
              <input
                id="name"
                type="text"
                required={mode === 'signup'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jean Dupont"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </Label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="jean.dupont@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span>Mot de passe</span>
            </Label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Confirmer le mot de passe</span>
              </Label>
              <input
                id="confirmPassword"
                type="password"
                required={mode === 'signup'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          )}

          {mode === 'signup' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-xs text-blue-800">
                  En créant un compte, vous acceptez de respecter nos conditions d'utilisation
                  et de fournir des informations exactes lors de vos votes.
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Chargement...' : (mode === 'signin' ? 'Se connecter' : 'Créer le compte')}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {mode === 'signin'
              ? "Pas de compte ? Créer un compte"
              : "Déjà un compte ? Se connecter"
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}