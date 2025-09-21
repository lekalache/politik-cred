"use client"

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { ModerationDashboard } from '@/components/admin/moderation-dashboard'
import { ThreatMonitoring } from '@/components/admin/threat-monitoring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import {
  Shield,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  TrendingUp,
  Database,
  Activity,
  Eye
} from 'lucide-react'

interface AdminStats {
  total_users: number
  votes_today: number
  pending_moderation: number
  system_health: number
}

interface RecentActivity {
  id: string
  action: string
  user: string
  time: string
  type: 'approval' | 'flag' | 'user' | 'rejection'
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'threats' | 'users' | 'analytics' | 'settings'>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (user && (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'moderator' || user.profile?.role === 'admin' || user.profile?.role === 'moderator')) {
      fetchAdminStats()
      fetchRecentActivity()
    }
  }, [user])

  const fetchAdminStats = async () => {
    try {
      setStatsLoading(true)

      // Get total users count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Get votes today
      const today = new Date().toISOString().split('T')[0]
      const { count: votesToday } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      // Get pending moderation count
      const { count: pendingModeration, data: pendingVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')

      console.log('Admin dashboard - pending count:', pendingModeration)
      console.log('Admin dashboard - pending votes:', pendingVotes)

      setStats({
        total_users: totalUsers || 0,
        votes_today: votesToday || 0,
        pending_moderation: pendingModeration || 0,
        system_health: 98 // Could be calculated based on error rates, uptime, etc.
      })

    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Get recent moderation actions
      const { data: moderationActions } = await supabase
        .from('moderation_actions')
        .select(`
          *,
          moderator:users!moderator_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Get recent user registrations
      const { data: newUsers } = await supabase
        .from('users')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      const activities: RecentActivity[] = []

      // Add moderation actions
      moderationActions?.forEach(action => {
        activities.push({
          id: action.id,
          action: action.action === 'approve' ? 'Vote approuvé' : 'Vote rejeté',
          user: action.moderator?.name || 'Modérateur',
          time: getRelativeTime(action.created_at),
          type: action.action === 'approve' ? 'approval' : 'rejection'
        })
      })

      // Add new users
      newUsers?.forEach(user => {
        activities.push({
          id: user.id,
          action: 'Nouveau utilisateur',
          user: user.name || 'Utilisateur',
          time: getRelativeTime(user.created_at),
          type: 'user'
        })
      })

      // Sort by time and take latest 8
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivity(activities.slice(0, 8))

    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'À l\'instant'
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`
    return `Il y a ${Math.floor(diffInMinutes / 1440)} jour(s)`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'moderator' && user.profile?.role !== 'admin' && user.profile?.role !== 'moderator')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    )
  }

  const isAdmin = user.user_metadata?.role === 'admin' || user.profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isAdmin ? 'Administration' : 'Modération'}
              </h1>
              <p className="text-gray-600">
                {isAdmin
                  ? 'Gérer la plateforme et superviser les modérateurs'
                  : 'Modérer le contenu et maintenir la qualité'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Shield className="w-3 h-3 mr-1" />
                {isAdmin ? 'Administrateur' : 'Modérateur'}
              </Badge>
              <span className="text-sm text-gray-600">
                {user.profile?.name || user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 className="w-4 h-4" />, adminOnly: false },
              { key: 'moderation', label: 'Modération', icon: <Shield className="w-4 h-4" />, adminOnly: false },
              { key: 'threats', label: 'Menaces IA', icon: <Eye className="w-4 h-4" />, adminOnly: false },
              { key: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" />, adminOnly: true },
              { key: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" />, adminOnly: true },
              { key: 'settings', label: 'Paramètres', icon: <Settings className="w-4 h-4" />, adminOnly: true }
            ]
              .filter(tab => !tab.adminOnly || isAdmin)
              .map((tab) => (
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-blue-600">{stats?.total_users || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Votes Today</p>
                        <p className="text-2xl font-bold text-green-600">{stats?.votes_today || 0}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pending Moderation</p>
                        <p className="text-2xl font-bold text-orange-600">{stats?.pending_moderation || 0}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">System Health</p>
                        <p className="text-2xl font-bold text-green-600">{stats?.system_health || 0}%</p>
                      </div>
                      <Activity className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.type === 'approval' ? 'bg-green-500' :
                              activity.type === 'flag' ? 'bg-orange-500' :
                              activity.type === 'user' ? 'bg-blue-500' :
                              'bg-red-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium">{activity.action}</p>
                              <p className="text-xs text-gray-600">{activity.user}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Aucune activité récente</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveTab('moderation')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Réviser la modération
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Gérer les utilisateurs
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        fetchAdminStats()
                        fetchRecentActivity()
                      }}
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Actualiser les données
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Configuration système
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <ModerationDashboard />
        )}

        {activeTab === 'threats' && (
          <ThreatMonitoring />
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Gestion des utilisateurs</h3>
                  <p className="text-sm">Cette fonctionnalité sera disponible prochainement.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && isAdmin && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics avancées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Analytics détaillées</h3>
                  <p className="text-sm">Analyses approfondies en développement.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Configuration système</h3>
                  <p className="text-sm">Paramètres avancés à venir.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}