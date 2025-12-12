"use client"

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  Shield,
  AlertCircle
} from 'lucide-react'

interface CredibilityChange {
  id: string
  politician_name: string
  previous_score: number
  new_score: number
  score_change: number
  change_reason: string
  description: string
  verification_sources: string[]
  verification_confidence: number
  evidence_url: string | null
  created_at: string
  is_disputed: boolean
}

interface Stats {
  total_changes: number
  total_politicians: number
  avg_score: number
  promises_kept: number
  promises_broken: number
  promises_partial: number
}

interface AISystemStats {
  totalPoliticians: number
  politiciansWithScores: number
  politiciansWithZeroScore: number
  totalPromises: number
  politiciansWithPromises: number
  parliamentaryActions: number
  promiseVerifications: number
  consistencyScores: number
  avgConsistencyScore: number
  lastAuditDate: string | null
}

export default function TransparencyPage() {
  const [credibilityChanges, setCredibilityChanges] = useState<CredibilityChange[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [aiStats, setAiStats] = useState<AISystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'kept' | 'broken' | 'partial'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchData()
    fetchAISystemStats()
  }, [filter, dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch credibility history with politician info
      let historyQuery = supabase
        .from('credibility_history')
        .select(`
          id,
          previous_score,
          new_score,
          score_change,
          change_reason,
          description,
          verification_sources,
          verification_confidence,
          evidence_url,
          created_at,
          is_disputed,
          politician:politicians(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      // Filter by change reason
      if (filter !== 'all') {
        const reasonMap = {
          'kept': 'promise_kept',
          'broken': 'promise_broken',
          'partial': 'promise_partial'
        }
        historyQuery = historyQuery.eq('change_reason', reasonMap[filter])
      }

      // Date filtering
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange.replace('d', ''))
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo)
        historyQuery = historyQuery.gte('created_at', cutoffDate.toISOString())
      }

      const { data: historyData, error: historyError } = await historyQuery

      if (historyError) {
        console.error('Error fetching credibility history:', historyError)
        return
      }

      // Transform the data
      const transformedRecords = (historyData || []).map(record => ({
        ...record,
        politician_name: (record.politician as any)?.name || 'Politicien inconnu'
      }))

      setCredibilityChanges(transformedRecords)

      // Fetch statistics
      const [allChangesResponse, politiciansResponse] = await Promise.all([
        supabase.from('credibility_history').select('change_reason, score_change'),
        supabase.from('politicians').select('credibility_score')
      ])

      if (allChangesResponse.data && politiciansResponse.data) {
        const changes = allChangesResponse.data
        const politicians = politiciansResponse.data

        setStats({
          total_changes: changes.length,
          total_politicians: politicians.length,
          avg_score: politicians.reduce((sum, p) => sum + (p.credibility_score || 100), 0) / politicians.length || 100,
          promises_kept: changes.filter(c => c.change_reason === 'promise_kept').length,
          promises_broken: changes.filter(c => c.change_reason === 'promise_broken').length,
          promises_partial: changes.filter(c => c.change_reason === 'promise_partial').length
        })
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAISystemStats = async () => {
    try {
      // Fetch all AI system statistics in parallel
      const [
        { count: totalPols },
        { count: polsWithScores },
        { count: polsWithZeroScore },
        { data: allPromises },
        { count: totalActions },
        { count: totalVerifications },
        { count: totalScores },
        { data: scoresData },
        { data: auditLogs }
      ] = await Promise.all([
        supabase.from('politicians').select('*', { count: 'exact', head: true }),
        supabase.from('politicians').select('*', { count: 'exact', head: true }).not('ai_score', 'is', null),
        supabase.from('politicians').select('*', { count: 'exact', head: true }).or('ai_score.is.null,ai_score.eq.0'),
        supabase.from('political_promises').select('politician_id'),
        supabase.from('parliamentary_actions').select('*', { count: 'exact', head: true }),
        supabase.from('promise_verifications').select('*', { count: 'exact', head: true }),
        supabase.from('consistency_scores').select('*', { count: 'exact', head: true }),
        supabase.from('consistency_scores').select('overall_score'),
        supabase.from('audit_logs').select('created_at').eq('activity', 'daily-audit').eq('status', 'completed').order('created_at', { ascending: false }).limit(1)
      ])

      // Calculate unique politicians with promises
      const uniquePoliticiansWithPromises = allPromises
        ? new Set(allPromises.map(p => p.politician_id)).size
        : 0

      // Calculate average consistency score
      const avgScore = scoresData && scoresData.length > 0
        ? scoresData.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scoresData.length
        : 0

      setAiStats({
        totalPoliticians: totalPols || 0,
        politiciansWithScores: polsWithScores || 0,
        politiciansWithZeroScore: polsWithZeroScore || 0,
        totalPromises: allPromises?.length || 0,
        politiciansWithPromises: uniquePoliticiansWithPromises,
        parliamentaryActions: totalActions || 0,
        promiseVerifications: totalVerifications || 0,
        consistencyScores: totalScores || 0,
        avgConsistencyScore: avgScore,
        lastAuditDate: auditLogs && auditLogs.length > 0 ? auditLogs[0].created_at : null
      })
    } catch (error) {
      console.error('Error fetching AI system stats:', error)
    }
  }

  const exportData = () => {
    const csvContent = [
      ['Date', 'Politicien', 'Score précédent', 'Nouveau score', 'Changement', 'Raison', 'Description'].join(','),
      ...credibilityChanges.map(record => [
        new Date(record.created_at).toLocaleDateString('fr-FR'),
        record.politician_name,
        record.previous_score,
        record.new_score,
        record.score_change > 0 ? `+${record.score_change}` : record.score_change,
        record.change_reason,
        `"${record.description.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `politik-cred-transparency-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'promise_kept': 'Promesse tenue',
      'promise_broken': 'Promesse non tenue',
      'promise_partial': 'Promesse partielle',
      'statement_verified': 'Déclaration vérifiée',
      'statement_contradicted': 'Déclaration contredite',
      'manual_adjustment': 'Ajustement manuel',
      'initial_score': 'Score initial'
    }
    return labels[reason] || reason
  }

  const getReasonColor = (reason: string) => {
    if (reason === 'promise_kept' || reason === 'statement_verified') {
      return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700'
    }
    if (reason === 'promise_broken' || reason === 'statement_contradicted') {
      return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700'
    }
    if (reason === 'promise_partial') {
      return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700'
    }
    return 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Eye className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Transparence et audit
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Consultez l'historique complet des vérifications de promesses et l'évolution des scores de crédibilité
              </p>
            </div>
          </div>
        </div>

        {/* AI-Powered System Statistics */}
        {aiStats && (
          <Card className="mb-8 border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-indigo-900 dark:text-indigo-200">
                <Shield className="w-6 h-6" />
                Statistiques du Système IA - En Direct
              </CardTitle>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-2">
                🚧 <strong>Système en construction</strong> - Données collectées automatiquement par IA.
                Scores actuels non représentatifs : données insuffisantes pour audit de qualité.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">Politicians Audités</div>
                  <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-200">
                    {aiStats.politiciansWithScores}/{aiStats.totalPoliticians}
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">avec scores IA</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">Promesses Extraites</div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-200">{aiStats.totalPromises}</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {aiStats.politiciansWithPromises} politicians
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Actions Parlementaires</div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-200">{aiStats.parliamentaryActions}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">votes & activités</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Vérifications IA</div>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-200">{aiStats.promiseVerifications}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">promesses vérifiées</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">Score Moyen de Cohérence</div>
                      <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                        {aiStats.avgConsistencyScore.toFixed(1)}/100
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dernier Audit Automatique</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {aiStats.lastAuditDate
                          ? new Date(aiStats.lastAuditDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Aucun audit'}
                      </div>
                    </div>
                    <Calendar className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Data Quality Warning */}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-900 dark:text-yellow-200">
                    <strong className="block mb-2">⚠️ Qualité des Données - Phase de Collecte Initiale</strong>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Seulement <strong>{aiStats.politiciansWithPromises}/{aiStats.totalPoliticians}</strong> politicians ont des promesses extraites</li>
                      <li>Moyenne de <strong>{(aiStats.totalPromises / Math.max(aiStats.politiciansWithPromises, 1)).toFixed(1)}</strong> promesses par politicien (minimum recommandé : 20+)</li>
                      <li><strong>{aiStats.politiciansWithZeroScore} politicians ont un score de 0</strong> (pas de données collectées)</li>
                      <li>Les scores actuels ne sont <strong>PAS représentatifs</strong> - Données insuffisantes pour un audit fiable</li>
                      <li>Besoin de 3-6 mois de collecte continue pour des scores de qualité</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-600">
                      <strong>Ce que nous construisons :</strong> Système automatisé qui collectera quotidiennement
                      promesses + actions parlementaires pour produire des scores objectifs basés sur des données complètes.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div className="text-sm text-indigo-900 dark:text-indigo-200">
                    <strong>Infrastructure automatisée en place :</strong> Collecte quotidienne des données parlementaires (6h00),
                    extraction IA des promesses, matching sémantique, calcul objectif des scores.
                    Zéro intervention humaine dans le scoring.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_changes}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Vérifications totales</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total_politicians}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Politiciens suivis</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.avg_score.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Score moyen</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.promises_kept}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Promesses tenues</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.promises_broken}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Promesses non tenues</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.promises_partial}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Promesses partielles</div>
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
                  { key: 'all', label: 'Toutes' },
                  { key: 'kept', label: 'Tenues' },
                  { key: 'broken', label: 'Non tenues' },
                  { key: 'partial', label: 'Partielles' }
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

        {/* Credibility Changes */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : credibilityChanges.length === 0 ? (
          <Card className="text-center py-12 dark:bg-gray-800 dark:border-gray-700">
            <CardContent>
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Aucun enregistrement trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Aucune vérification correspondant aux critères sélectionnés.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {credibilityChanges.map((record) => (
              <Card key={record.id} className="hover:shadow-md dark:hover:shadow-black/30 transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg dark:text-gray-100">{record.politician_name}</h3>
                        <Badge
                          variant="outline"
                          className={getReasonColor(record.change_reason)}
                        >
                          {getReasonLabel(record.change_reason)}
                        </Badge>
                        {record.is_disputed && (
                          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Contesté
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(record.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {record.verification_sources && record.verification_sources.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Shield className="w-4 h-4" />
                            <span>{record.verification_sources.length} source(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {record.score_change > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-2xl font-bold ${
                          record.score_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {record.score_change > 0 ? '+' : ''}{record.score_change}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {record.previous_score.toFixed(1)} → {record.new_score.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {record.description}
                    </p>
                    {record.verification_confidence && (
                      <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Confiance : {(record.verification_confidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {record.evidence_url && (
                      <a
                        href={record.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
        <Card className="mt-12 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Engagement de transparence
                </h3>
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  Conformément à nos obligations légales et à notre engagement pour la transparence,
                  tous les changements de score de crédibilité sont conservés dans cet historique public.
                  Chaque vérification est documentée avec ses sources, sa méthode et son niveau de confiance.
                  Les données personnelles des utilisateurs ne sont jamais exposées.
                  Cet audit trail permet de vérifier l'intégrité de notre processus de vérification des promesses
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
