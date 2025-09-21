"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase, PoliticianDetails } from '@/lib/supabase'
import {
  User,
  Award,
  TrendingUp,
  Target,
  Calendar,
  MapPin,
  CheckCircle,
  Shield,
  Star,
  Activity,
  BarChart3,
  Trophy,
  Edit
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  role: 'user' | 'moderator' | 'admin'
  reputation_score: number
  contribution_score: number
  accuracy_rate: number
  total_votes_submitted: number
  approved_votes: number
  rejected_votes: number
  badges: string[]
  location: string | null
  political_preference: string | null
  verification_status: string
  last_active: string
  created_at: string
}

interface UserBadge {
  id: string
  badge_type: string
  badge_name: string
  description: string | null
  icon_url: string | null
  earned_at: string
}

interface UserActivity {
  id: string
  activity_type: string
  details: Record<string, unknown>
  created_at: string
}

export function UserProfile({ userId }: { userId?: string }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const targetUserId = userId || user?.id
  const isOwnProfile = user?.id === targetUserId

  useEffect(() => {
    if (targetUserId) {
      fetchUserProfile()
    }
  }, [targetUserId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
      }

      setProfile(profileData)

      // Fetch user badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false })

      if (!badgesError) {
        setBadges(badgesData || [])
      }

      // Fetch recent activities (only for own profile)
      if (isOwnProfile) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!activitiesError) {
          setActivities(activitiesData || [])
        }
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getReputationLevel = (score: number) => {
    if (score >= 800) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' }
    if (score >= 600) return { level: 'Trusted', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 400) return { level: 'Contributor', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 200) return { level: 'Active', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'Novice', color: 'text-gray-600', bg: 'bg-gray-100' }
  }

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'first_vote': return <Star className="w-4 h-4" />
      case 'fact_checker': return <CheckCircle className="w-4 h-4" />
      case 'trusted_contributor': return <Shield className="w-4 h-4" />
      case 'expert': return <Award className="w-4 h-4" />
      case 'moderator_choice': return <Trophy className="w-4 h-4" />
      case 'accuracy_master': return <Target className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'vote_submitted': return <TrendingUp className="w-4 h-4" />
      case 'comment_posted': return <User className="w-4 h-4" />
      case 'vote_moderated': return <Shield className="w-4 h-4" />
      case 'profile_updated': return <Edit className="w-4 h-4" />
      case 'login': return <Activity className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profil non trouvé</h3>
            <p className="text-gray-600">
              Le profil utilisateur demandé n'existe pas ou n'est pas accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reputationLevel = getReputationLevel(profile.reputation_score)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-xl">
                {profile.name ? profile.name.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.name || 'Utilisateur anonyme'}
                </h1>
                {profile.verification_status !== 'unverified' && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
                <Badge variant="outline" className={`${reputationLevel.bg} ${reputationLevel.color}`}>
                  {reputationLevel.level}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                {profile.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>Dernière activité: {new Date(profile.last_active).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {profile.role !== 'user' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Shield className="w-3 h-3 mr-1" />
                  {profile.role === 'admin' ? 'Administrateur' : 'Modérateur'}
                </Badge>
              )}
            </div>

            {isOwnProfile && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reputation & Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Réputation & Statistiques</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score de réputation</span>
                <span className="font-semibold">{profile.reputation_score}/1000</span>
              </div>
              <Progress value={(profile.reputation_score / 1000) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">{profile.total_votes_submitted}</div>
                <div className="text-sm text-gray-600">Votes soumis</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{profile.accuracy_rate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Taux de précision</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-green-600">{profile.approved_votes}</div>
                <div className="text-gray-600">Approuvés</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-red-600">{profile.rejected_votes}</div>
                <div className="text-gray-600">Rejetés</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{profile.contribution_score}</div>
                <div className="text-sm text-gray-600">Points de contribution</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Badges & Récompenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {badges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Aucun badge encore</p>
                <p className="text-sm">Commencez à voter pour gagner des badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full text-yellow-600">
                      {getBadgeIcon(badge.badge_type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{badge.badge_name}</div>
                      {badge.description && (
                        <div className="text-sm text-gray-600">{badge.description}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Obtenu le {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity (only for own profile) */}
      {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span>Activité récente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.activity_type === 'vote_submitted' && 'Vote soumis'}
                        {activity.activity_type === 'comment_posted' && 'Commentaire publié'}
                        {activity.activity_type === 'vote_moderated' && 'Vote modéré'}
                        {activity.activity_type === 'profile_updated' && 'Profil mis à jour'}
                        {activity.activity_type === 'login' && 'Connexion'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString('fr-FR')} à {new Date(activity.created_at).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}