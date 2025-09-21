"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CommentsSystem } from '@/components/comments-system'
import { supabase, SocialMediaInfo, ContactInfo } from '@/lib/supabase'
import {
  User,
  MapPin,
  Calendar,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  BarChart3,
  Users,
  Clock,
  Flag,
  Shield,
  Bookmark
} from 'lucide-react'

interface PoliticianProfile {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  party: string | null
  position: string | null
  constituency: string | null
  image_url: string | null
  bio: string | null
  birth_date: string | null
  gender: string | null
  political_orientation: string | null
  social_media: SocialMediaInfo | null
  contact_info: ContactInfo | null
  education: string | null
  career_history: string | null
  key_policies: string[]
  controversies: string[]
  achievements: string[]
  credibility_score: number
  total_votes: number
  positive_votes: number
  negative_votes: number
  trending_score: number
  is_active: boolean
  verification_status: string
  created_at: string
  updated_at: string
}

interface Vote {
  id: string
  vote_type: 'positive' | 'negative'
  points: number
  category: string
  evidence_title: string
  evidence_description: string
  evidence_url: string | null
  evidence_type: string
  status: string
  created_at: string
  user?: {
    name: string | null
    reputation_score: number
  }
}

export function PoliticianProfile({ politicianId }: { politicianId: string }) {
  const [politician, setPolitician] = useState<PoliticianProfile | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'votes' | 'comments' | 'timeline' | 'analysis'>('overview')
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    fetchPoliticianData()
  }, [politicianId])

  const fetchPoliticianData = async () => {
    try {
      setLoading(true)

      // Fetch politician profile
      const { data: politicianData, error: politicianError } = await supabase
        .from('politicians')
        .select('*')
        .eq('id', politicianId)
        .single()

      if (politicianError) {
        console.error('Error fetching politician:', politicianError)
        return
      }

      setPolitician(politicianData)

      // Fetch approved votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select(`
          *,
          user:users(name, reputation_score)
        `)
        .eq('politician_id', politicianId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!votesError) {
        setVotes(votesData || [])
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600'
    if (score >= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 150) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 100) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getOrientationColor = (orientation: string) => {
    switch (orientation) {
      case 'left': return 'bg-red-100 text-red-800 border-red-200'
      case 'center-left': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'center': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'center-right': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'right': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'integrity': return <Shield className="w-4 h-4" />
      case 'competence': return <Award className="w-4 h-4" />
      case 'transparency': return <Eye className="w-4 h-4" />
      case 'consistency': return <CheckCircle className="w-4 h-4" />
      case 'leadership': return <Users className="w-4 h-4" />
      default: return <Flag className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!politician) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Politicien non trouvé</h3>
            <p className="text-gray-600">
              Le profil demandé n'existe pas ou n'est pas accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Profile */}
      <Card>
        <CardContent className="p-0">
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"></div>
          <div className="relative px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-16">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={politician.image_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {politician.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {politician.position && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {politician.position}
                        </Badge>
                      )}
                      {politician.party && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {politician.party}
                        </Badge>
                      )}
                      {politician.political_orientation && (
                        <Badge variant="outline" className={getOrientationColor(politician.political_orientation)}>
                          {politician.political_orientation}
                        </Badge>
                      )}
                      {politician.verification_status === 'verified' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setIsFollowing(!isFollowing)}
                      variant={isFollowing ? "default" : "outline"}
                      size="sm"
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Suivi' : 'Suivre'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                    <Button variant="outline" size="sm">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {politician.constituency && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{politician.constituency}</span>
                    </div>
                  )}
                  {politician.birth_date && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(politician.birth_date).getFullYear()}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Mis à jour: {new Date(politician.updated_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credibility Score Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(politician.credibility_score)}`}>
                {politician.credibility_score}/200
              </div>
              <div className="text-sm text-gray-600 mb-2">Score de crédibilité</div>
              <Progress value={(politician.credibility_score / 200) * 100} className="h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">{politician.total_votes}</div>
              <div className="text-sm text-gray-600">Votes totaux</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">{politician.positive_votes}</div>
              <div className="text-sm text-gray-600">Votes positifs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">{politician.negative_votes}</div>
              <div className="text-sm text-gray-600">Votes négatifs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: <User className="w-4 h-4" /> },
            { key: 'votes', label: 'Votes & Preuves', icon: <BarChart3 className="w-4 h-4" /> },
            { key: 'comments', label: 'Discussions', icon: <MessageCircle className="w-4 h-4" /> },
            { key: 'timeline', label: 'Chronologie', icon: <Clock className="w-4 h-4" /> },
            { key: 'analysis', label: 'Analyse', icon: <TrendingUp className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bio */}
              {politician.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>Biographie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{politician.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key Policies */}
              {politician.key_policies && politician.key_policies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Positions politiques clés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {politician.key_policies.map((policy, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-gray-700">{policy}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Achievements */}
              {politician.achievements && politician.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <span>Réalisations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {politician.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Award className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <span className="text-gray-700">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Controversies */}
              {politician.controversies && politician.controversies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span>Controverses</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {politician.controversies.map((controversy, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <span className="text-gray-700">{controversy}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'votes' && (
            <div className="space-y-4">
              {votes.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun vote</h3>
                    <p className="text-gray-600">
                      Aucun vote approuvé pour ce politicien.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                votes.map((vote) => (
                  <Card key={vote.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            vote.vote_type === 'positive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {vote.vote_type === 'positive' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(vote.category)}
                              <span className="font-medium capitalize">{vote.category}</span>
                              <Badge variant="outline" className={vote.vote_type === 'positive' ? 'text-green-700' : 'text-red-700'}>
                                +{vote.points} points
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Par {vote.user?.name || 'Utilisateur anonyme'} • {new Date(vote.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">{vote.evidence_title}</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{vote.evidence_description}</p>
                        {vote.evidence_url && (
                          <a
                            href={vote.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Voir la source</span>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <CommentsSystem politicianId={politicianId} />
          )}

          {activeTab === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle>Chronologie des événements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>Chronologie à venir</p>
                  <p className="text-sm">Cette fonctionnalité sera disponible prochainement.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'analysis' && (
            <Card>
              <CardHeader>
                <CardTitle>Analyse détaillée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>Analyse à venir</p>
                  <p className="text-sm">Analyse IA et tendances en développement.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          {politician.social_media && Object.keys(politician.social_media).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Réseaux sociaux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(politician.social_media).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="capitalize">{platform}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education & Career */}
          <Card>
            <CardHeader>
              <CardTitle>Parcours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {politician.education && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Formation</h4>
                  <p className="text-sm text-gray-600">{politician.education}</p>
                </div>
              )}
              {politician.career_history && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Carrière</h4>
                  <p className="text-sm text-gray-600">{politician.career_history}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taux d'approbation</span>
                <span className="font-medium">
                  {politician.total_votes > 0
                    ? Math.round((politician.positive_votes / politician.total_votes) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tendance</span>
                <span className={`font-medium ${politician.trending_score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {politician.trending_score >= 0 ? '+' : ''}{politician.trending_score}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Statut</span>
                <Badge variant="outline" className={politician.is_active ? 'text-green-700' : 'text-gray-700'}>
                  {politician.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}