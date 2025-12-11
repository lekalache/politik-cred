"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AuthDialog } from '@/components/auth/auth-dialog'
import { useAuth } from '@/components/auth/auth-provider'
import {
  Shield,
  User,
  LogOut,
  Settings,
  UserCheck,
  Menu,
  X
} from 'lucide-react'

export function Navigation() {
  const { user, signOut, loading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setAuthDialogOpen(true)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
  }

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo POLITIKCRED */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img
              src="/assets/logo/logo-isolated.png"
              alt="POLITIKCRED Logo"
              className="h-8 w-auto"
            />
            <div>
              <h1>
              <span className="text-xl font-bold text-[#1E3A8A]">
                Politik
              </span>
              <span className="text-xl font-bold text-[#DC2626]">
                Cred'
              </span>
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <a href="/score" className="text-gray-600 hover:text-gray-900 transition-colors">
                Classement
              </a>
              <span className="text-gray-300">|</span>
              <a href="/promises" className="text-gray-600 hover:text-gray-900 transition-colors">
                Promesses
              </a>
              <span className="text-gray-300">|</span>
              <a href="/transparency" className="text-gray-600 hover:text-gray-900 transition-colors">
                Transparence
              </a>
            </div>
            <Badge variant="outline" className="bg-[#DC2626] text-white border-[#DC2626]">
              Beta
            </Badge>

            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Bonjour, {user.user_metadata?.name || user.email}
                </span>
                {user.user_metadata?.role === 'admin' && (
                  <>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                    <a
                      href="/admin"
                      className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      Dashboard
                    </a>
                  </>
                )}
                {user.user_metadata?.role === 'moderator' && (
                  <>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Modérateur
                    </Badge>
                    <a
                      href="/admin"
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Modération
                    </a>
                  </>
                )}
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {user.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={handleSignOut}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleAuthClick('signin')}
                  size="sm"
                  variant="outline"
                >
                  Se connecter
                </Button>
                <Button
                  onClick={() => handleAuthClick('signup')}
                  size="sm"
                  className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                >
                  Créer un compte
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="sm"
              variant="outline"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <div className="space-y-3">
              <Badge variant="outline" className="bg-[#DC2626] text-white border-[#DC2626] block w-fit">
                Beta
              </Badge>

              {/* Mobile Navigation Links */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <a
                  href="/score"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Classement
                </a>
                <a
                  href="/promises"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Promesses
                </a>
                <a
                  href="/transparency"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Transparence
                </a>
              </div>

              {loading ? (
                <div className="text-sm text-gray-600">Chargement...</div>
              ) : user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {user.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-900">
                      {user.user_metadata?.name || user.email}
                    </span>
                  </div>

                  {(user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'moderator') && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 block w-fit">
                      {user.user_metadata.role === 'admin' ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Modérateur
                        </>
                      )}
                    </Badge>
                  )}

                  {user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'moderator' && (
                    <a
                      href="/mes-votes"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Mes Votes
                    </a>
                  )}

                  <Button
                    onClick={handleSignOut}
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleAuthClick('signin')}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Se connecter
                  </Button>
                  <Button
                    onClick={() => handleAuthClick('signup')}
                    size="sm"
                    className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                  >
                    Créer un compte
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        defaultMode={authMode}
      />
    </header>
  )
}