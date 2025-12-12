'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { CredibilityBadge, CredibilityScoreCard } from '@/components/credibility/credibility-badge'
import { CredibilityHistory } from '@/components/credibility/credibility-history'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Shield, Award, AlertCircle, Loader2, CheckCircle, Info } from 'lucide-react'

function ScoreRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
        <Award className="w-3 h-3 mr-1" />
        #1 Meilleur score
      </Badge>
    )
  }
  if (rank <= 3) {
    return <Badge variant="outline">Top 3</Badge>
  }
  return null
}

export default function ScorePage() {
  const [politicians, setPoliticians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataStats, setDataStats] = useState({ totalPoliticians: 0, withPromises: 0 })

  useEffect(() => {
    async function loadPoliticians() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase configuration')
        setLoading(false)
        return
      }

      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

      // Fetch politicians with their AI scores from consistency_scores
      const { data: politiciansData, error: polError } = await supabase
        .from('politicians')
        .select('id, name, party, ai_score, ai_last_audited_at')
        .not('ai_score', 'is', null)
        .order('ai_score', { ascending: false })

      if (polError) {
        console.error('Failed to fetch politicians:', polError)
        setLoading(false)
        return
      }

      // Fetch total politicians count
      const { count: totalCount } = await supabase
        .from('politicians')
        .select('*', { count: 'exact', head: true })

      // Fetch count of politicians with promises
      const { data: promisesData } = await supabase
        .from('political_promises')
        .select('politician_id')

      const uniquePoliticiansWithPromises = new Set(promisesData?.map(p => p.politician_id) || []).size

      setDataStats({
        totalPoliticians: totalCount || 0,
        withPromises: uniquePoliticiansWithPromises
      })

      // Fetch consistency scores for each politician
      const { data: scoresData, error: scoresError } = await supabase
        .from('consistency_scores')
        .select('*')
        .in('politician_id', politiciansData?.map(p => p.id) || [])

      if (scoresError) {
        console.error('Failed to fetch consistency scores:', scoresError)
      }

      // Merge the data (exclude scores.id to prevent overwriting pol.id)
      const mergedData = politiciansData?.map(pol => {
        const scores = scoresData?.find(s => s.politician_id === pol.id)
        if (scores) {
          // Destructure to exclude 'id' from scores (it's the consistency_scores PK, not politician ID)
          const { id: _scoresId, politician_id: _politicianId, ...scoreFields } = scores
          return {
            ...pol,
            ...scoreFields
          }
        }
        return pol
      }) || []

      setPoliticians(mergedData)
      setLoading(false)
    }

    loadPoliticians()
  }, [])

  // Calculate stats based on AI scores
  const totalPoliticians = politicians.length
  const avgScore = politicians.reduce((sum, p) => sum + (p.ai_score || 0), 0) / totalPoliticians || 0
  const highestScore = politicians[0]?.ai_score || 0
  const lowestScore = politicians[politicians.length - 1]?.ai_score || 0
  const avgAttendance = politicians.reduce((sum, p) => sum + (p.attendance_rate || 0), 0) / totalPoliticians || 0
  const avgActivity = politicians.reduce((sum, p) => sum + (p.legislative_activity_score || 0), 0) / totalPoliticians || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] dark:text-blue-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Chargement des scores de crédibilité...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <Navigation />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Scores IA - Audit Politique</h1>
          </div>
          <p className="text-blue-100 text-lg max-w-3xl">
            Scores calculés par IA basés sur la vérification factuelle des promesses vs actions parlementaires.
            100% objectif, 0% subjectif. Données vérifiables issues de sources officielles.
          </p>
          <div className="mt-4 p-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-300/50">
            <p className="text-yellow-100 text-sm">
              <strong>⚠️ Phase de collecte initiale :</strong> Données insuffisantes pour scores représentatifs.
              Seulement {dataStats.withPromises}/{dataStats.totalPoliticians} politicians ont des promesses extraites. Scores de qualité après 3-6 mois de collecte quotidienne.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Politicians audités</div>
              <div className="text-3xl font-bold mt-1">{totalPoliticians}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Cohérence moy.</div>
              <div className="text-3xl font-bold mt-1">{avgScore.toFixed(1)}/100</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Présence moy.</div>
              <div className="text-3xl font-bold mt-1">{avgAttendance.toFixed(1)}%</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Meilleur score
              </div>
              <div className="text-3xl font-bold mt-1">{highestScore.toFixed(1)}/100</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Activité moy.</div>
              <div className="text-3xl font-bold mt-1">{avgActivity.toFixed(1)}/100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">Les 4 Scores IA - Audit Objectif</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                • <strong>Score de Cohérence (0-100)</strong> : Promesses tenues vs brisées. Formule: (tenues×100 + partielles×50) / total
                <br />
                • <strong>Taux de Présence (0-100%)</strong> : Présence aux votes parlementaires (données officielles Assemblée Nationale)
                <br />
                • <strong>Score d&apos;Activité Législative (0-100)</strong> : Lois proposées, amendements, débats, questions (pondéré)
                <br />
                • <strong>Qualité des Données (0-100%)</strong> : Complétude des données disponibles pour l&apos;audit
                <br />
                • <strong>100% Objectif</strong> : Aucun jugement subjectif, que des mathématiques et des sources vérifiables
              </p>
            </div>
          </div>
        </div>

        {/* Politicians List */}
        <div className="space-y-6">
          {politicians.length === 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Aucun score de crédibilité disponible pour le moment.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Les scores apparaîtront une fois que les promesses auront été vérifiées.
                </p>
              </CardContent>
            </Card>
          ) : (
            politicians.map((politician, index) => (
              <Link key={politician.id} href={`/politicians/${politician.id}`}>
                <Card className="overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/30 dark:to-gray-800 border-b border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#1E3A8A] dark:bg-blue-600 text-white flex items-center justify-center font-bold">
                            #{index + 1}
                          </div>
                          <CardTitle className="text-2xl dark:text-gray-100">{politician.name}</CardTitle>
                          <ScoreRankBadge rank={index + 1} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {politician.party && (
                            <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                              {politician.party}
                            </Badge>
                          )}
                          {/* Data Quality Indicator */}
                          {politician.data_quality_score !== undefined && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                politician.data_quality_score >= 0.7
                                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                  : politician.data_quality_score >= 0.3
                                  ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                              }`}
                            >
                              Données : {(politician.data_quality_score * 100).toFixed(0)}%
                              {politician.data_quality_score < 0.3 && ' ⚠️'}
                            </Badge>
                          )}
                        </div>
                        {politician.ai_last_audited_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Dernière analyse : {new Date(politician.ai_last_audited_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* 4 AI Scores Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {/* Score 1: Consistency Score */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase">Cohérence</span>
                          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                          {politician.overall_score?.toFixed(1) || politician.ai_score || '—'}<span className="text-lg">/100</span>
                        </div>
                        <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-2 mb-2">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${politician.overall_score || politician.ai_score || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 space-y-0.5">
                          <div>✓ Tenues: {politician.promises_kept || 0}</div>
                          <div>✗ Brisées: {politician.promises_broken || 0}</div>
                          <div>◐ Partielles: {politician.promises_partial || 0}</div>
                        </div>
                      </div>

                      {/* Score 2: Attendance Rate */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Présence</span>
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-200 mb-1">
                          {typeof politician.attendance_rate === 'number' ? `${politician.attendance_rate.toFixed(1)}%` : '—'}
                        </div>
                        <div className="w-full bg-green-200 dark:bg-green-900 rounded-full h-2 mb-2">
                          <div
                            className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${politician.attendance_rate || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {politician.sessions_attended || 0}/{politician.sessions_scheduled || 0} sessions
                        </div>
                      </div>

                      {/* Score 3: Legislative Activity */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">Activité</span>
                          <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="text-3xl font-bold text-amber-900 dark:text-amber-200 mb-1">
                          {typeof politician.legislative_activity_score === 'number' ? `${politician.legislative_activity_score.toFixed(1)}` : '—'}<span className="text-lg">/100</span>
                        </div>
                        <div className="w-full bg-amber-200 dark:bg-amber-900 rounded-full h-2 mb-2">
                          <div
                            className="bg-amber-600 dark:bg-amber-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${politician.legislative_activity_score || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                          <div>Lois: {politician.bills_sponsored || 0}</div>
                          <div>Amendements: {politician.amendments_proposed || 0}</div>
                        </div>
                      </div>

                      {/* Score 4: Data Quality */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Données</span>
                          <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-1">
                          {typeof politician.data_quality_score === 'number' ? `${(politician.data_quality_score * 100).toFixed(0)}%` : '—'}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-gray-600 dark:bg-gray-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(politician.data_quality_score || 0) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Complétude de l&apos;audit
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Détails Promesses</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-gray-700 dark:text-gray-300">
                            <span>Total promesses</span>
                            <span className="font-semibold">{(politician.promises_kept || 0) + (politician.promises_broken || 0) + (politician.promises_partial || 0)}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-gray-700 dark:text-gray-300">
                            <span>En attente</span>
                            <span className="font-semibold">{politician.promises_pending || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Activité Parlementaire</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-gray-700 dark:text-gray-300">
                            <span>Débats</span>
                            <span className="font-semibold">{politician.debates_participated || 0}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-gray-700 dark:text-gray-300">
                            <span>Questions</span>
                            <span className="font-semibold">{politician.questions_asked || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Méthodologie AI-Driven et Transparence :</p>
          <p>
            Les 4 scores sont calculés automatiquement par IA à partir de données officielles vérifiables (Assemblée Nationale,
            Vigie du mensonge, sources gouvernementales). <strong className="dark:text-gray-300">100% objectif, 0% subjectif</strong> : pas de jugements humains,
            que des mathématiques et des faits documentés. Formules de calcul publiques, sources accessibles, audit transparent.
            Le langage utilisé est factuel (ex: &quot;promesse non tenue&quot;) et non un jugement de caractère.
            Conformité légale française : droit de réponse, protection contre la diffamation, vérification multi-sources.
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
