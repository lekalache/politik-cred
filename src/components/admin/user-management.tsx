"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Search,
  Shield,
  Mail,
  Calendar,
  UserX,
  UserCheck,
  Eye,
  Settings,
  MoreVertical,
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'moderator' | 'admin'
  active: boolean
  created_at: string
  last_sign_in_at: string | null
  vote_count: number
  profile_complete: boolean
}

interface UserStats {
  total: number
  active: number
  moderators: number
  admins: number
  newToday: number
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'moderator' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const LIMIT = 20

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [page, searchTerm, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          active,
          created_at,
          last_sign_in_at,
          profile_complete
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('active', statusFilter === 'active')
      }

      // Pagination
      const offset = (page - 1) * LIMIT
      query = query.range(offset, offset + LIMIT - 1)

      const { data, error } = await query

      if (error) throw error

      // Get vote counts for each user
      const userIds = data?.map(u => u.id) || []
      const { data: voteCounts } = await supabase
        .from('votes')
        .select('user_id')
        .in('user_id', userIds)

      // Count votes per user
      const voteCountMap: { [key: string]: number } = {}
      voteCounts?.forEach(vote => {
        voteCountMap[vote.user_id] = (voteCountMap[vote.user_id] || 0) + 1
      })

      const usersWithVoteCounts = data?.map(user => ({
        ...user,
        vote_count: voteCountMap[user.id] || 0
      })) || []

      setUsers(usersWithVoteCounts)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Total users
      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Active users
      const { count: active } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)

      // Moderators
      const { count: moderators } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'moderator')

      // Admins
      const { count: admins } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      // New users today
      const today = new Date().toISOString().split('T')[0]
      const { count: newToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      setStats({
        total: total || 0,
        active: active || 0,
        moderators: moderators || 0,
        admins: admins || 0,
        newToday: newToday || 0
      })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Êtes-vous sûr de vouloir ${currentStatus ? 'désactiver' : 'activer'} cet utilisateur ?`)) {
      return
    }

    try {
      setUpdating(userId)

      const { error } = await supabase
        .from('users')
        .update({ active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, active: !currentStatus }
          : user
      ))

      await fetchStats()
    } catch (error) {
      console.error('Failed to update user status:', error)
      alert('Erreur lors de la mise à jour du statut utilisateur')
    } finally {
      setUpdating(null)
    }
  }

  const handleChangeUserRole = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    if (!confirm(`Êtes-vous sûr de vouloir changer le rôle de cet utilisateur en ${newRole} ?`)) {
      return
    }

    try {
      setUpdating(userId)

      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, role: newRole }
          : user
      ))

      await fetchStats()
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('Erreur lors de la mise à jour du rôle utilisateur')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">Administrateur</Badge>
      case 'moderator':
        return <Badge className="bg-blue-100 text-blue-800">Modérateur</Badge>
      default:
        return <Badge variant="outline">Utilisateur</Badge>
    }
  }

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge className="bg-green-100 text-green-800">Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Modérateurs</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.moderators || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-red-600">{stats?.admins || 0}</p>
              </div>
              <Settings className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.newToday || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tous les rôles</option>
              <option value="user">Utilisateurs</option>
              <option value="moderator">Modérateurs</option>
              <option value="admin">Administrateurs</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <Button onClick={fetchUsers} variant="outline">
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-sm">Essayez d'ajuster vos filtres de recherche.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Utilisateur</th>
                    <th className="text-left py-3 px-4 font-medium">Rôle</th>
                    <th className="text-left py-3 px-4 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 font-medium">Votes</th>
                    <th className="text-left py-3 px-4 font-medium">Inscrit le</th>
                    <th className="text-left py-3 px-4 font-medium">Dernière connexion</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.name || 'Sans nom'}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user.active)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{user.vote_count}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {user.last_sign_in_at
                            ? formatDate(user.last_sign_in_at)
                            : 'Jamais'
                          }
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Switch
                            checked={user.active}
                            onCheckedChange={() => handleToggleUserStatus(user.id, user.active)}
                            disabled={updating === user.id}
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Gérer l'utilisateur</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Changer le rôle</h4>
                                  <div className="space-y-2">
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => handleChangeUserRole(user.id, 'user')}
                                      disabled={user.role === 'user' || updating === user.id}
                                    >
                                      <Users className="w-4 h-4 mr-2" />
                                      Utilisateur standard
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => handleChangeUserRole(user.id, 'moderator')}
                                      disabled={user.role === 'moderator' || updating === user.id}
                                    >
                                      <Shield className="w-4 h-4 mr-2" />
                                      Modérateur
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => handleChangeUserRole(user.id, 'admin')}
                                      disabled={user.role === 'admin' || updating === user.id}
                                    >
                                      <Settings className="w-4 h-4 mr-2" />
                                      Administrateur
                                    </Button>
                                  </div>
                                </div>
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Les changements de rôle sont immédiats et affectent les permissions de l'utilisateur.
                                  </AlertDescription>
                                </Alert>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {users.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={users.length < LIMIT}
              >
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}