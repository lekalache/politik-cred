"use client"

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Vote,
  Eye,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Activity,
  PieChart,
  LineChart,
  Download
} from 'lucide-react'

interface AnalyticsData {
  totalUsers: number
  totalPoliticians: number
  totalVotes: number
  pendingVotes: number
  approvedVotes: number
  rejectedVotes: number
  averageCredibilityScore: number
  topPoliticians: Array<{
    id: string
    name: string
    credibility_score: number
    total_votes: number
  }>
  userEngagement: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
  }
  votesByCategory: Array<{
    category: string
    count: number
  }>
  moderationStats: {
    averageProcessingTime: number
    accuracyRate: number
    moderatorWorkload: Array<{
      moderator_name: string
      votes_processed: number
    }>
  }
  trends: {
    votesThisWeek: number
    votesLastWeek: number
    usersThisWeek: number
    usersLastWeek: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedMetric, setSelectedMetric] = useState<'votes' | 'users' | 'credibility' | 'moderation'>('votes')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Calculate date filter
      const daysAgo = parseInt(dateRange.replace(/[^0-9]/g, '')) || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

      // Fetch basic counts
      const [usersResponse, politiciansResponse, votesResponse] = await Promise.all([
        supabase.from('users').select('id'),
        supabase.from('politicians').select('id'),
        supabase.from('votes').select('*')
      ])

      const totalUsers = usersResponse.data?.length || 0
      const totalPoliticians = politiciansResponse.data?.length || 0
      const allVotes = votesResponse.data || []

      // Filter votes by date range
      const recentVotes = allVotes.filter(vote =>
        new Date(vote.created_at) >= cutoffDate
      )

      // Calculate vote statistics
      const totalVotes = recentVotes.length
      const pendingVotes = recentVotes.filter(v => v.status === 'pending').length
      const approvedVotes = recentVotes.filter(v => v.status === 'approved').length
      const rejectedVotes = recentVotes.filter(v => v.status === 'rejected').length

      // Fetch top politicians
      const { data: topPoliticiansData } = await supabase
        .from('politicians')
        .select('id, name, credibility_score, total_votes')
        .order('credibility_score', { ascending: false })
        .limit(10)

      // Calculate average credibility score
      const averageCredibilityScore = topPoliticiansData?.length
        ? Math.round(topPoliticiansData.reduce((sum, p) => sum + p.credibility_score, 0) / topPoliticiansData.length)
        : 100

      // Votes by category
      const votesByCategory = recentVotes.reduce((acc: Record<string, number>, vote) => {
        const category = vote.category || 'other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})

      const votesByCategoryArray = Object.entries(votesByCategory).map(([category, count]) => ({
        category,
        count
      }))

      // Calculate trends (comparing to previous period)
      const previousPeriodStart = new Date(cutoffDate)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - daysAgo)

      const previousVotes = allVotes.filter(vote => {
        const voteDate = new Date(vote.created_at)
        return voteDate >= previousPeriodStart && voteDate < cutoffDate
      })

      // Mock user engagement data (would need proper tracking in production)
      const userEngagement = {
        dailyActiveUsers: Math.floor(totalUsers * 0.1),
        weeklyActiveUsers: Math.floor(totalUsers * 0.3),
        monthlyActiveUsers: Math.floor(totalUsers * 0.6)
      }

      // Mock moderation stats
      const moderationStats = {
        averageProcessingTime: 2.5, // hours
        accuracyRate: 0.92,
        moderatorWorkload: [
          { moderator_name: 'Modérateur Principal', votes_processed: 45 },
          { moderator_name: 'Modérateur Assistant', votes_processed: 32 }
        ]
      }

      const analyticsData: AnalyticsData = {
        totalUsers,
        totalPoliticians,
        totalVotes,
        pendingVotes,
        approvedVotes,
        rejectedVotes,
        averageCredibilityScore,
        topPoliticians: topPoliticiansData || [],
        userEngagement,
        votesByCategory: votesByCategoryArray,
        moderationStats,
        trends: {
          votesThisWeek: totalVotes,
          votesLastWeek: previousVotes.length,
          usersThisWeek: totalUsers,
          usersLastWeek: totalUsers // Would need proper tracking
        }
      }

      setAnalytics(analyticsData)

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    if (!analytics) return

    const csvContent = [
      ['Métrique', 'Valeur'],
      ['Utilisateurs totaux', analytics.totalUsers.toString()],
      ['Politiciens totaux', analytics.totalPoliticians.toString()],
      ['Votes totaux', analytics.totalVotes.toString()],
      ['Votes en attente', analytics.pendingVotes.toString()],
      ['Votes approuvés', analytics.approvedVotes.toString()],
      ['Votes rejetés', analytics.rejectedVotes.toString()],
      ['Score moyen de crédibilité', analytics.averageCredibilityScore.toString()]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `politics-trust-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, positive: true }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(Math.round(change)), positive: change >= 0 }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
              <p className="text-gray-600">
                Impossible de charger les données d'analyse.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const voteTrends = getChangeIndicator(analytics.trends.votesThisWeek, analytics.trends.votesLastWeek)
  const userTrends = getChangeIndicator(analytics.trends.usersThisWeek, analytics.trends.usersLastWeek)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Analytics & Reporting
                </h1>
                <p className="text-gray-600">
                  Tableau de bord des statistiques de la plateforme
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Date Range Filter */}
              <div className="flex space-x-2">
                {[
                  { key: '7d', label: '7 jours' },
                  { key: '30d', label: '30 jours' },
                  { key: '90d', label: '90 jours' },
                  { key: '1y', label: '1 an' }
                ].map((option) => (
                  <Button
                    key={option.key}
                    onClick={() => setDateRange(option.key as any)}
                    variant={dateRange === option.key ? 'default' : 'outline'}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <Button onClick={exportData} size="sm" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Exporter</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisateurs totaux</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className={`flex items-center ${userTrends.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {userTrends.positive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  <span className="text-sm font-medium">{userTrends.value}%</span>
                </div>
                <span className="text-sm text-gray-600 ml-2">vs période précédente</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Votes totaux</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalVotes.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <Vote className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className={`flex items-center ${voteTrends.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {voteTrends.positive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  <span className="text-sm font-medium">{voteTrends.value}%</span>
                </div>
                <span className="text-sm text-gray-600 ml-2">vs période précédente</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Score moyen</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.averageCredibilityScore}/200</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress
                  value={(analytics.averageCredibilityScore / 200) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.pendingVotes}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Temps moyen: {analytics.moderationStats.averageProcessingTime}h
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vote Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                <span>Répartition des votes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{analytics.approvedVotes}</div>
                    <div className="text-sm text-gray-600">Approuvés</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalVotes > 0 ? Math.round((analytics.approvedVotes / analytics.totalVotes) * 100) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{analytics.pendingVotes}</div>
                    <div className="text-sm text-gray-600">En attente</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalVotes > 0 ? Math.round((analytics.pendingVotes / analytics.totalVotes) * 100) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{analytics.rejectedVotes}</div>
                    <div className="text-sm text-gray-600">Rejetés</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalVotes > 0 ? Math.round((analytics.rejectedVotes / analytics.totalVotes) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Approuvés</span>
                    <span>{analytics.approvedVotes}</span>
                  </div>
                  <Progress value={analytics.totalVotes > 0 ? (analytics.approvedVotes / analytics.totalVotes) * 100 : 0} className="h-2" />

                  <div className="flex justify-between text-sm">
                    <span>En attente</span>
                    <span>{analytics.pendingVotes}</span>
                  </div>
                  <Progress value={analytics.totalVotes > 0 ? (analytics.pendingVotes / analytics.totalVotes) * 100 : 0} className="h-2" />

                  <div className="flex justify-between text-sm">
                    <span>Rejetés</span>
                    <span>{analytics.rejectedVotes}</span>
                  </div>
                  <Progress value={analytics.totalVotes > 0 ? (analytics.rejectedVotes / analytics.totalVotes) * 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Politicians */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <span>Top politiciens par crédibilité</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPoliticians.slice(0, 8).map((politician, index) => (
                  <div key={politician.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{politician.name}</div>
                        <div className="text-xs text-gray-600">{politician.total_votes} votes</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      politician.credibility_score >= 150 ? 'bg-green-50 text-green-700 border-green-200' :
                      politician.credibility_score >= 100 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }>
                      {politician.credibility_score}/200
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Votes by Category */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>Votes par catégorie</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {analytics.votesByCategory.map((category) => (
                <div key={category.category} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{category.count}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {category.category === 'integrity' ? 'Intégrité' :
                     category.category === 'competence' ? 'Compétence' :
                     category.category === 'transparency' ? 'Transparence' :
                     category.category === 'consistency' ? 'Cohérence' :
                     category.category === 'leadership' ? 'Leadership' :
                     'Autre'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {analytics.totalVotes > 0 ? Math.round((category.count / analytics.totalVotes) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Moderation Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Statistiques de modération</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.moderationStats.averageProcessingTime}h
                </div>
                <div className="text-sm text-gray-600">Temps moyen de traitement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(analytics.moderationStats.accuracyRate * 100)}%
                </div>
                <div className="text-sm text-gray-600">Taux de précision</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.moderationStats.moderatorWorkload.reduce((sum, m) => sum + m.votes_processed, 0)}
                </div>
                <div className="text-sm text-gray-600">Votes traités</div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Charge de travail des modérateurs</h4>
              <div className="space-y-2">
                {analytics.moderationStats.moderatorWorkload.map((moderator) => (
                  <div key={moderator.moderator_name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{moderator.moderator_name}</span>
                    <span className="text-sm font-medium">{moderator.votes_processed} votes</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}