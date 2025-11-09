'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PromiseSubmissionDialog } from '@/components/promises/promise-submission-dialog'
import { PromiseCard } from '@/components/promises/promise-card'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  TrendingUp,
  FileText,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Promise {
  id: string
  politician_id: string
  promise_text: string
  promise_date: string
  category: string
  source_url: string
  source_type: string
  extraction_method: string
  confidence_score: number
  verification_status: string
  is_actionable: boolean
  created_at: string
  politician?: {
    name: string
    party: string
  }
}

interface Stats {
  total: number
  pending: number
  verified: number
  actionable: number
}

export default function PromisesPage() {
  const { user } = useAuth()
  const role = user?.role || null
  const [promises, setPromises] = useState<Promise[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, verified: 0, actionable: 0 })
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)

  useEffect(() => {
    fetchPromises()
  }, [activeFilter, selectedCategory])

  const fetchPromises = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('political_promises')
        .select(`
          *,
          politician:politicians(name, party)
        `)
        .order('promise_date', { ascending: false })

      // Apply filters
      if (activeFilter !== 'all') {
        query = query.eq('verification_status', activeFilter)
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setPromises(data || [])

      // Calculate stats
      const allPromises = data || []
      setStats({
        total: allPromises.length,
        pending: allPromises.filter(p => p.verification_status === 'pending').length,
        verified: allPromises.filter(p => p.verification_status === 'verified').length,
        actionable: allPromises.filter(p => p.is_actionable).length
      })
    } catch (error) {
      console.error('Error fetching promises:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPromises = promises

  const categories = [
    { value: 'all', label: 'Toutes' },
    { value: 'economic', label: 'Économie' },
    { value: 'social', label: 'Social' },
    { value: 'environmental', label: 'Environnement' },
    { value: 'security', label: 'Sécurité' },
    { value: 'healthcare', label: 'Santé' },
    { value: 'education', label: 'Éducation' },
    { value: 'justice', label: 'Justice' },
    { value: 'immigration', label: 'Immigration' },
    { value: 'foreign_policy', label: 'International' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Suivi des Promesses
                </h1>
              </div>
              <p className="mt-2 text-gray-600">
                Suivez et vérifiez les promesses politiques avec des preuves parlementaires
              </p>
            </div>
            {role === 'admin' && (
              <Button
                onClick={() => setShowSubmissionDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une Promesse
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Promesses
              </CardTitle>
              <FileText className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                Toutes catégories confondues
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En Attente
              </CardTitle>
              <Clock className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">
                Non encore vérifiées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vérifiées
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-xs text-gray-500 mt-1">
                Avec preuves confirmées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vérifiables
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.actionable}</div>
              <p className="text-xs text-gray-500 mt-1">
                Peuvent être vérifiées
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <CardTitle>Filtres</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Statut
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('all')}
                  >
                    Toutes
                  </Button>
                  <Button
                    variant={activeFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('pending')}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    En Attente
                  </Button>
                  <Button
                    variant={activeFilter === 'verified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('verified')}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Vérifiées
                  </Button>
                  <Button
                    variant={activeFilter === 'actionable' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('actionable')}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Vérifiables
                  </Button>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Catégorie
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat.value}
                      variant={selectedCategory === cat.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.value)}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Comment ça marche :</strong> Les promesses sont extraites automatiquement
            des déclarations politiques et confrontées aux actions parlementaires réelles
            (votes, amendements, propositions de loi). Le système utilise l'IA sémantique
            pour détecter les correspondances entre promesses et actions.
          </AlertDescription>
        </Alert>

        {/* Promises List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPromises.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune promesse trouvée
              </h3>
              <p className="text-gray-500 mb-4">
                {activeFilter !== 'all' || selectedCategory !== 'all'
                  ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                  : 'Aucune promesse n\'a encore été ajoutée au système.'}
              </p>
              {role === 'admin' && (
                <Button
                  onClick={() => setShowSubmissionDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter la Première Promesse
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPromises.map((promise) => (
              <PromiseCard
                key={promise.id}
                promise={promise}
                onUpdate={fetchPromises}
                userRole={role}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submission Dialog */}
      <PromiseSubmissionDialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
        onSuccess={fetchPromises}
      />

      {/* Footer */}
      <Footer />
    </div>
  )
}
