"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  Globe,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react'

interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  author: string
  published_at: string
  keywords: string[]
  relevance_score: number
  view_count: number
  created_at: string
}

interface NewsStats {
  totalArticles: number
  todayArticles: number
  averageRelevance: number
  sourcesCount: number
}

interface RefreshJob {
  id: string
  jobId: string
  refreshType: string
  results: {
    collected: number
    saved: number
    duplicates: number
    invalid: number
  }
  stats: NewsStats
}

export function NewsManagement() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [stats, setStats] = useState<NewsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null)
  const [editForm, setEditForm] = useState({ title: '', summary: '', keywords: '' })
  const [refreshResult, setRefreshResult] = useState<RefreshJob | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchNews()
    fetchStats()
  }, [page, searchTerm, sourceFilter])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'published_at',
        sortOrder: 'desc',
        minRelevance: '30'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (sourceFilter) params.append('source', sourceFilter)

      const response = await fetch(`/api/news/articles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
      }
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/news/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.overview)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleRefreshNews = async () => {
    try {
      setRefreshing(true)
      setRefreshResult(null)

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authorization header with user data
      if (user) {
        const token = encodeURIComponent(JSON.stringify(user))
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/news/refresh', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clearCache: true,
          limit: 30
        })
      })

      if (response.ok) {
        const result = await response.json()
        setRefreshResult(result)
        await fetchNews()
        await fetchStats()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Refresh failed')
      }
    } catch (error) {
      console.error('Refresh failed:', error)
      setRefreshResult({
        id: 'error',
        jobId: 'error',
        refreshType: 'error',
        results: { collected: 0, saved: 0, duplicates: 0, invalid: 0 },
        stats: { totalArticles: 0, todayArticles: 0, averageRelevance: 0, sourcesCount: 0 }
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleEditArticle = (article: NewsArticle) => {
    setEditingArticle(article)
    setEditForm({
      title: article.title,
      summary: article.summary || '',
      keywords: article.keywords?.join(', ') || ''
    })
  }

  const handleSaveArticle = async () => {
    if (!editingArticle) return

    try {
      // For now, just update local state
      // In a real implementation, you'd call an API endpoint
      const updatedArticles = articles.map(article =>
        article.id === editingArticle.id
          ? {
              ...article,
              title: editForm.title,
              summary: editForm.summary,
              keywords: editForm.keywords.split(',').map(k => k.trim()).filter(k => k)
            }
          : article
      )
      setArticles(updatedArticles)
      setEditingArticle(null)
    } catch (error) {
      console.error('Failed to update article:', error)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return

    try {
      // For now, just update local state
      // In a real implementation, you'd call an API endpoint
      setArticles(articles.filter(article => article.id !== articleId))
    } catch (error) {
      console.error('Failed to delete article:', error)
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

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.totalArticles || 0}</p>
              </div>
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aujourd'hui</p>
                <p className="text-2xl font-bold text-green-600">{stats?.todayArticles || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pertinence Moy.</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.averageRelevance || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sources</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.sourcesCount || 0}</p>
              </div>
              <Tag className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh News Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5" />
            <span>Actualiser les actualités</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleRefreshNews}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualisation...' : 'Actualiser maintenant'}</span>
            </Button>
            <p className="text-sm text-gray-600">
              Collecte les dernières actualités politiques françaises
            </p>
          </div>

          {refreshResult && (
            <Alert className={refreshResult.id === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {refreshResult.id === 'error' ? (
                  <span className="text-red-800">
                    Échec de l'actualisation. Veuillez réessayer.
                  </span>
                ) : (
                  <div className="text-green-800">
                    <p className="font-medium">Actualisation réussie !</p>
                    <p className="text-sm">
                      Collecté: {refreshResult.results.collected} •
                      Sauvegardé: {refreshResult.results.saved} •
                      Doublons: {refreshResult.results.duplicates}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par titre ou mots-clés..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Input
                placeholder="Filtrer par source..."
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              />
            </div>
            <Button onClick={fetchNews} variant="outline">
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle>Articles ({articles.length})</CardTitle>
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
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Aucun article trouvé</h3>
              <p className="text-sm">Essayez d'ajuster vos filtres ou actualisez les actualités.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div key={article.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-2">{article.title}</h3>
                      {article.summary && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          {article.source}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(article.published_at)}
                        </span>
                        <Badge className={getRelevanceColor(article.relevance_score)}>
                          {article.relevance_score}% pertinent
                        </Badge>
                        <span>{article.view_count} vues</span>
                      </div>
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.keywords.slice(0, 3).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              #{keyword}
                            </Badge>
                          ))}
                          {article.keywords.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{article.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditArticle(article)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Modifier l'article</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Titre</label>
                              <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Résumé</label>
                              <Textarea
                                value={editForm.summary}
                                onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Mots-clés (séparés par des virgules)</label>
                              <Input
                                value={editForm.keywords}
                                onChange={(e) => setEditForm({...editForm, keywords: e.target.value})}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setEditingArticle(null)}>
                                Annuler
                              </Button>
                              <Button onClick={handleSaveArticle}>
                                Sauvegarder
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteArticle(article.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {articles.length > 0 && (
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
                disabled={articles.length < 20}
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