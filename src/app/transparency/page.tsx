"use client"

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  Eye,
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Download
} from 'lucide-react'

interface AuditRecord {
  id: string
  politician_name: string
  vote_type: 'positive' | 'negative'
  points: number
  evidence_title: string
  evidence_description: string
  evidence_url: string | null
  evidence_type: string
  status: string
  created_at: string
  moderated_at: string | null
}

interface Stats {
  total_votes: number
  pending_votes: number
  approved_votes: number
  rejected_votes: number
  total_politicians: number
  active_users: number
}

export default function TransparencyPage() {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchData()
  }, [filter, dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch audit records (approved votes with politician info)
      let auditQuery = supabase
        .from('votes')
        .select(`
          id,
          vote_type,
          points,
          evidence_title,
          evidence_description,
          evidence_url,
          evidence_type,
          status,
          created_at,
          moderated_at,
          politician:politicians(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        auditQuery = auditQuery.eq('status', filter)
      } else {
        auditQuery = auditQuery.in('status', ['approved', 'rejected'])
      }

      // Date filtering
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange.replace('d', ''))
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo)
        auditQuery = auditQuery.gte('created_at', cutoffDate.toISOString())
      }

      const { data: auditData, error: auditError } = await auditQuery

      if (auditError) {
        console.error('Error fetching audit records:', auditError)
        return
      }

      // Transform the data
      const transformedRecords = (auditData || []).map(record => ({
        ...record,
        politician_name: (record.politician as any)?.name || 'Politicien inconnu'
      }))

      setAuditRecords(transformedRecords)

      // Fetch statistics
      const [votesResponse, politiciansResponse] = await Promise.all([
        supabase.from('votes').select('status'),
        supabase.from('politicians').select('id')
      ])

      if (votesResponse.data && politiciansResponse.data) {
        const votes = votesResponse.data
        setStats({
          total_votes: votes.length,
          pending_votes: votes.filter(v => v.status === 'pending').length,
          approved_votes: votes.filter(v => v.status === 'approved').length,
          rejected_votes: votes.filter(v => v.status === 'rejected').length,
          total_politicians: politiciansResponse.data.length,
          active_users: 0 // Would need user activity tracking
        })
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    const csvContent = [
      ['Date', 'Politicien', 'Type de vote', 'Points', 'Titre preuve', 'Statut', 'Modéré le'].join(','),
      ...auditRecords.map(record => [
        new Date(record.created_at).toLocaleDateString('fr-FR'),
        record.politician_name,
        record.vote_type === 'positive' ? 'Positif' : 'Négatif',
        record.points,
        `"${record.evidence_title.replace(/"/g, '""')}"`,
        record.status,
        record.moderated_at ? new Date(record.moderated_at).toLocaleDateString('fr-FR') : 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `politics-trust-audit-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Eye className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Transparence et audit
              </h1>
              <p className="text-gray-600">
                Consultez l'historique complet des votes et les statistiques de la plateforme
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_votes}</div>
                <div className="text-sm text-gray-600">Votes totaux</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_votes}</div>
                <div className="text-sm text-gray-600">En attente</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved_votes}</div>
                <div className="text-sm text-gray-600">Approuvés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected_votes}</div>
                <div className="text-sm text-gray-600">Rejetés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total_politicians}</div>
                <div className="text-sm text-gray-600">Politiciens</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((stats.approved_votes / Math.max(stats.total_votes - stats.pending_votes, 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Taux approbation</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Export */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'Tous' },
                  { key: 'approved', label: 'Approuvés' },
                  { key: 'rejected', label: 'Rejetés' }
                ].map((option) => (
                  <Button
                    key={option.key}
                    onClick={() => setFilter(option.key as any)}
                    variant={filter === option.key ? 'default' : 'outline'}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Date Range Filter */}
              <div className="flex space-x-2">
                {[
                  { key: '7d', label: '7 jours' },
                  { key: '30d', label: '30 jours' },
                  { key: '90d', label: '90 jours' },
                  { key: 'all', label: 'Tout' }
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
            </div>

            <Button onClick={exportData} size="sm" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exporter CSV</span>
            </Button>
          </div>
        </div>

        {/* Audit Records */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : auditRecords.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun enregistrement trouvé
              </h3>
              <p className="text-gray-600">
                Aucun vote correspondant aux critères sélectionnés.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {auditRecords.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg">{record.politician_name}</h3>
                        <Badge
                          variant="outline"
                          className={`${
                            record.vote_type === 'positive'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {record.vote_type === 'positive' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {record.vote_type === 'positive' ? 'Positif' : 'Négatif'} (+{record.points})
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${
                            record.status === 'approved'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {record.status === 'approved' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {record.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Soumis le {new Date(record.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {record.moderated_at && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Modéré le {new Date(record.moderated_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">{record.evidence_title}</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {record.evidence_description}
                    </p>
                    {record.evidence_url && (
                      <a
                        href={record.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Voir la source</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legal Notice */}
        <Card className="mt-12 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Eye className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Engagement de transparence
                </h3>
                <p className="text-blue-800 text-sm">
                  Conformément à nos obligations légales et à notre engagement pour la transparence,
                  tous les votes modérés sont conservés dans cet historique public.
                  Les données personnelles des utilisateurs ne sont jamais exposées.
                  Cet audit trail permet de vérifier l'intégrité de notre processus de modération
                  et la légitimité des scores de crédibilité.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}