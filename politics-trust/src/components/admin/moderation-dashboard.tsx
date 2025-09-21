"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { aiFactChecker } from '@/lib/ai-fact-checker'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  Eye,
  User,
  MessageCircle,
  ExternalLink,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'

interface ModerationItem {
  id: string
  type: 'vote' | 'comment' | 'user_report'
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  content: Record<string, unknown>
  reporter?: {
    id: string
    name: string
    reputation_score: number
  }
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  ai_analysis?: Record<string, unknown>
}

interface ModerationStats {
  total_pending: number
  total_approved: number
  total_rejected: number
  total_flagged: number
  avg_review_time: number
  accuracy_rate: number
}

export function ModerationDashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState<ModerationItem[]>([])
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected' | 'flagged' | 'all'>('pending')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'moderator' || user.profile?.role === 'admin' || user.profile?.role === 'moderator')) {
      fetchModerationData()
    }
  }, [user, selectedTab])

  const fetchModerationData = async () => {
    try {
      setLoading(true)

      // First check if user has admin/moderator role
      console.log('Current user:', user)
      console.log('User metadata role:', user?.user_metadata?.role)
      console.log('User profile role:', user?.profile?.role)

      // Fetch votes based on selected tab
      let votesQuery = supabase
        .from('votes')
        .select(`
          *,
          user:users(name, reputation_score),
          politician:politicians(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      // Apply status filter if not 'all'
      if (selectedTab !== 'all') {
        votesQuery = votesQuery.eq('status', selectedTab)
      }

      const { data: votesData, error: votesError } = await votesQuery

      console.log('Moderation dashboard - selectedTab:', selectedTab)
      console.log('Moderation dashboard - votesData:', votesData)
      console.log('Moderation dashboard - votesError:', votesError)

      if (votesError) {
        console.log('Primary query had issues, using fallback query without JOINs:', votesError)

        // Try a simpler query without JOINs as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('votes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        console.log('Fallback query - data:', fallbackData)
        console.log('Fallback query - error:', fallbackError)

        if (fallbackData && !fallbackError) {
          console.log('Using fallback data - found votes:', fallbackData.length)

          // Apply status filter to fallback data if needed
          let filteredData = fallbackData
          if (selectedTab !== 'all') {
            filteredData = fallbackData.filter(vote => vote.status === selectedTab)
          }

          // Use fallback data without joins
          const moderationItems: ModerationItem[] = []
          filteredData.forEach(vote => {
            moderationItems.push({
              id: vote.id,
              type: 'vote',
              status: vote.status,
              priority: determinePriority(vote),
              content: vote,
              created_at: vote.created_at,
              reviewed_at: vote.reviewed_at,
              reviewed_by: vote.reviewed_by
            })
          })
          setItems(moderationItems)
          await fetchModerationStats()
          return
        }
      }

      // Fetch flagged comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(name, reputation_score)
        `)
        .eq('is_flagged', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      // Transform data into moderation items
      const moderationItems: ModerationItem[] = []

      votesData?.forEach(vote => {
        moderationItems.push({
          id: vote.id,
          type: 'vote',
          status: vote.status,
          priority: determinePriority(vote),
          content: vote,
          created_at: vote.created_at,
          reviewed_at: vote.reviewed_at,
          reviewed_by: vote.reviewed_by
        })
      })

      commentsData?.forEach(comment => {
        moderationItems.push({
          id: comment.id,
          type: 'comment',
          status: 'flagged',
          priority: 'medium',
          content: comment,
          created_at: comment.created_at
        })
      })

      setItems(moderationItems)

      // Fetch moderation stats
      await fetchModerationStats()

    } catch (error) {
      console.error('Error fetching moderation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchModerationStats = async () => {
    try {
      const { data: statsData } = await supabase
        .rpc('get_moderation_stats')

      if (statsData) {
        setStats(statsData[0])
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const determinePriority = (item: ModerationItem): 'low' | 'medium' | 'high' | 'urgent' => {
    if (item.type === 'vote') {
      if (item.points >= 50) return 'urgent'
      if (item.points >= 20) return 'high'
      if (item.points >= 10) return 'medium'
    }
    return 'low'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'flagged': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const moderateItem = async (itemId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!user) return

    setProcessingItems(prev => new Set(prev).add(itemId))

    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      if (item.type === 'vote') {
        await supabase
          .from('votes')
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            rejection_reason: reason || null
          })
          .eq('id', itemId)
      } else if (item.type === 'comment') {
        await supabase
          .from('comments')
          .update({
            status: action === 'approve' ? 'active' : 'hidden',
            is_flagged: false,
            moderated_at: new Date().toISOString(),
            moderated_by: user.id
          })
          .eq('id', itemId)
      }

      // Record moderation action
      await supabase
        .from('moderation_actions')
        .insert({
          moderator_id: user.id,
          item_type: item.type,
          item_id: itemId,
          action,
          reason: reason || null
        })

      // Refresh data
      await fetchModerationData()

    } catch (error) {
      console.error('Error moderating item:', error)
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const runAIAnalysis = async (itemId: string) => {
    setProcessingItems(prev => new Set(prev).add(itemId))

    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      let content = ''
      let evidence = ''

      if (item.type === 'vote') {
        content = item.content.evidence_title
        evidence = item.content.evidence_description + ' ' + (item.content.evidence_url || '')
      } else if (item.type === 'comment') {
        content = item.content.content
        evidence = content
      }

      const analysis = await aiFactChecker.checkFact(content, evidence, item.content.evidence_url)

      // Store AI analysis
      await supabase
        .from(item.type === 'vote' ? 'votes' : 'comments')
        .update({
          ai_analysis: analysis
        })
        .eq('id', itemId)

      // Refresh data
      await fetchModerationData()

    } catch (error) {
      console.error('Error running AI analysis:', error)
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'moderator' && user.profile?.role !== 'admin' && user.profile?.role !== 'moderator')) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Accès non autorisé</h3>
            <p className="text-gray-600">
              Vous devez être administrateur ou modérateur pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de modération</h1>
          <p className="text-gray-600">Gérer le contenu et maintenir la qualité de la plateforme</p>
        </div>
        <Button onClick={fetchModerationData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.total_pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.total_approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejetés</p>
                  <p className="text-2xl font-bold text-red-600">{stats.total_rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Précision IA</p>
                  <p className="text-2xl font-bold text-blue-600">{Math.round(stats.accuracy_rate)}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex space-x-2">
          {[
            { key: 'pending', label: 'En attente', count: stats?.total_pending || 0 },
            { key: 'flagged', label: 'Signalés', count: stats?.total_flagged || 0 },
            { key: 'approved', label: 'Approuvés', count: stats?.total_approved || 0 },
            { key: 'rejected', label: 'Rejetés', count: stats?.total_rejected || 0 },
            { key: 'all', label: 'Tous', count: 0 }
          ].map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              variant={selectedTab === tab.key ? "default" : "outline"}
              size="sm"
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Moderation Items */}
      <div className="space-y-4">
        {items
          .filter(item =>
            !searchTerm ||
            (item.type === 'vote' && item.content.evidence_title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.type === 'comment' && item.content.content?.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          .map((item) => (
            <Card key={item.id} className={selectedItem === item.id ? 'ring-2 ring-blue-500' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      item.type === 'vote' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {item.type === 'vote' ? <BarChart3 className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getPriorityColor(item.priority)}>
                          {item.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {item.type === 'vote' ? 'Vote' : 'Commentaire'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')} à {new Date(item.created_at).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => runAIAnalysis(item.id)}
                      disabled={processingItems.has(item.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Analyser
                    </Button>
                    {item.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => moderateItem(item.id, 'approve')}
                          disabled={processingItems.has(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          onClick={() => moderateItem(item.id, 'reject')}
                          disabled={processingItems.has(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {item.type === 'vote' ? (
                    <>
                      <div>
                        <h4 className="font-medium mb-1">{item.content.evidence_title}</h4>
                        <p className="text-sm text-gray-700">{item.content.evidence_description}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className={`font-medium ${item.content.vote_type === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.content.vote_type === 'positive' ? '+' : '-'}{item.content.points} points
                          </span>
                          <span className="text-gray-600">Catégorie: {item.content.category}</span>
                        </div>
                        {item.content.evidence_url && (
                          <a
                            href={item.content.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Source</span>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700">{item.content.content}</p>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-600">
                          Par {item.content.user?.name || 'Utilisateur anonyme'}
                        </span>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          <Flag className="w-3 h-3 mr-1" />
                          Signalé
                        </Badge>
                      </div>
                    </div>
                  )}

                  {item.content.ai_analysis && (
                    <div className="border-t pt-3 mt-3">
                      <h5 className="font-medium text-sm mb-2">Analyse IA</h5>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Résultat:</span>
                          <Badge variant="outline" className="text-xs">
                            {item.content.ai_analysis.result}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Confiance:</span>
                          <span className="font-medium">{Math.round(item.content.ai_analysis.confidence_score * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

        {items.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun élément à modérer</h3>
              <p className="text-gray-600">
                Tous les éléments ont été traités.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}