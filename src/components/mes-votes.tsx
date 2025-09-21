"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'

interface Vote {
  id: string
  politician_id: string
  vote_type: 'positive' | 'negative'
  points: number
  category: string
  evidence_title: string
  evidence_description: string
  evidence_url: string
  evidence_type: string
  source_credibility: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  politician?: {
    name: string
    image_url: string
    party: string
    position: string
  }
}

interface VoteStats {
  total_votes: number
  approved_votes: number
  rejected_votes: number
  pending_votes: number
  approval_rate: number
}

export function MesVotes() {
  const { user } = useAuth()
  const [votes, setVotes] = useState<Vote[]>([])
  const [stats, setStats] = useState<VoteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (user) {
      loadUserVotes()
      loadUserStats()
    }
  }, [user])

  const loadUserVotes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select(`
          *,
          politician:politicians(name, image_url, party, position)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading votes:', error)
        return
      }

      setVotes(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_vote_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading stats:', error)
        return
      }

      setStats(data || {
        total_votes: 0,
        approved_votes: 0,
        rejected_votes: 0,
        pending_votes: 0,
        approval_rate: 0
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    }

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    }

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status as keyof typeof labels]}</span>
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      integrity: 'Intégrité',
      competence: 'Compétence',
      transparency: 'Transparence',
      consistency: 'Cohérence',
      leadership: 'Leadership',
      other: 'Autre'
    }
    return labels[category as keyof typeof labels] || category
  }

  const filteredVotes = votes.filter(vote => {
    if (filter === 'all') return true
    return vote.status === filter
  })

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h2>
        <p className="text-gray-600">Vous devez être connecté pour voir vos votes.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de vos votes...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Mes Votes</h1>
        <p className="text-gray-600">Suivez l'état de vos contributions à la plateforme</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total des votes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_votes}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-[#1E3A8A]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved_votes}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending_votes}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux d'approbation</p>
                  <p className="text-2xl font-bold text-[#1E3A8A]">{stats.approval_rate}%</p>
                </div>
                <TrendingDown className="w-8 h-8 text-[#1E3A8A]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex space-x-2 mb-6">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'pending', label: 'En attente' },
          { key: 'approved', label: 'Approuvés' },
          { key: 'rejected', label: 'Rejetés' }
        ].map((filterOption) => (
          <Button
            key={filterOption.key}
            variant={filter === filterOption.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filterOption.key as any)}
          >
            {filterOption.label}
          </Button>
        ))}
      </div>

      {/* Votes List */}
      {filteredVotes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Aucun vote soumis' : `Aucun vote ${filter}`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Commencez par voter sur un politicien pour voir vos contributions ici.'
                : `Vous n'avez aucun vote ${filter} pour le moment.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredVotes.map((vote) => (
            <Card key={vote.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {vote.politician?.image_url && (
                      <img
                        src={vote.politician.image_url}
                        alt={vote.politician.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vote.politician?.name || 'Politicien inconnu'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {vote.politician?.position} • {vote.politician?.party}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(vote.status)}
                    {vote.vote_type === 'positive' ? (
                      <ThumbsUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Catégorie</p>
                    <p className="text-sm text-gray-900">{getCategoryLabel(vote.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Impact</p>
                    <p className="text-sm text-gray-900">{vote.points} points</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Type de preuve</p>
                    <p className="text-sm text-gray-900 capitalize">{vote.evidence_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Crédibilité source</p>
                    <p className="text-sm text-gray-900">{vote.source_credibility}/10</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Preuve soumise</h4>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{vote.evidence_title}</p>
                  <p className="text-sm text-gray-700 mb-2">{vote.evidence_description}</p>
                  {vote.evidence_url && (
                    <a
                      href={vote.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-[#1E3A8A] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Voir la source
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    Soumis le {new Date(vote.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  {vote.status === 'approved' && (
                    <div className="text-sm text-green-600 font-medium">
                      +{vote.vote_type === 'positive' ? vote.points : `-${vote.points}`} points crédibilité
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}