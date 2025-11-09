'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { CredibilityBadge, CredibilityScoreCard } from '@/components/credibility/credibility-badge'
import { CredibilityHistory } from '@/components/credibility/credibility-history'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Shield, Award, AlertCircle, Loader2 } from 'lucide-react'

function ScoreRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
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

      const { data, error } = await supabase
        .from('politician_credibility_summary')
        .select('*')
        .order('credibility_score', { ascending: false })

      if (error) {
        console.error('Failed to fetch politicians:', error)
      } else {
        setPoliticians(data || [])
      }

      setLoading(false)
    }

    loadPoliticians()
  }, [])

  // Calculate stats
  const totalPoliticians = politicians.length
  const avgScore = politicians.reduce((sum, p) => sum + (p.credibility_score || 100), 0) / totalPoliticians || 100
  const highestScore = politicians[0]?.credibility_score || 100
  const lowestScore = politicians[politicians.length - 1]?.credibility_score || 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] mx-auto mb-4" />
            <p className="text-gray-600">Chargement des scores de crédibilité...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Classement Crédibilité</h1>
          </div>
          <p className="text-blue-100 text-lg max-w-3xl">
            Scores de crédibilité basés sur la vérification factuelle des promesses vs actions parlementaires.
            Tous les scores sont calculés objectivement à partir de données vérifiables.
          </p>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Politicians analysés</div>
              <div className="text-3xl font-bold mt-1">{totalPoliticians}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm">Score moyen</div>
              <div className="text-3xl font-bold mt-1">{avgScore.toFixed(1)}/200</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Meilleur score
              </div>
              <div className="text-3xl font-bold mt-1">{highestScore.toFixed(1)}/200</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-200 text-sm flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                Plus bas score
              </div>
              <div className="text-3xl font-bold mt-1">{lowestScore.toFixed(1)}/200</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Comment fonctionne le score de crédibilité ?</h3>
              <p className="text-sm text-blue-700 mt-1">
                • <strong>Baseline 100/200</strong> : Tous les politiciens commencent à 100 points (neutre)
                <br />
                • <strong>Promesses tenues</strong> : +3 à +7 points selon la vérification
                <br />
                • <strong>Promesses non tenues</strong> : -5 à -11 points selon la gravité
                <br />
                • <strong>Vérification multi-sources</strong> : L&apos;impact est amplifié quand plusieurs sources confirment (IA + Vigie + Parlement)
                <br />
                • <strong>Langage factuel</strong> : Nous suivons les actions, pas les caractères (&quot;promesse non tenue&quot; ≠ &quot;est un menteur&quot;)
              </p>
            </div>
          </div>
        </div>

        {/* Politicians List */}
        <div className="space-y-6">
          {politicians.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun score de crédibilité disponible pour le moment.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Les scores apparaîtront une fois que les promesses auront été vérifiées.
                </p>
              </CardContent>
            </Card>
          ) : (
            politicians.map((politician, index) => (
              <Card key={politician.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold">
                          #{index + 1}
                        </div>
                        <CardTitle className="text-2xl">{politician.name}</CardTitle>
                        <ScoreRankBadge rank={index + 1} />
                      </div>
                      {politician.party && (
                        <Badge variant="outline" className="text-xs">
                          {politician.party}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <CredibilityBadge
                        score={politician.credibility_score || 100}
                        showTrend={true}
                        recentChange={politician.score_change_last_30_days}
                        size="large"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Score Card */}
                    <div>
                      <CredibilityScoreCard
                        score={politician.credibility_score || 100}
                        politicianName={politician.name}
                        promisesKept={politician.promises_kept_count || 0}
                        promisesBroken={politician.promises_broken_count || 0}
                        promisesPartial={politician.promises_partial_count || 0}
                      />
                    </div>

                    {/* Right: Stats */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Statistiques</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Changements totaux</span>
                            <span className="font-semibold">{politician.credibility_change_count || 0}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="text-sm text-green-700">Gains totaux</span>
                            <span className="font-semibold text-green-700">
                              +{(politician.total_gains || 0).toFixed(1)} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                            <span className="text-sm text-red-700">Pertes totales</span>
                            <span className="font-semibold text-red-700">
                              {(politician.total_losses || 0).toFixed(1)} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                            <span className="text-sm text-blue-700">Changements (30j)</span>
                            <span className="font-semibold text-blue-700">
                              {politician.changes_last_30_days || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Indicator */}
                      {politician.last_change_date && (
                        <div className="text-xs text-gray-500">
                          Dernière mise à jour :{' '}
                          {new Date(politician.last_change_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* History Timeline */}
                  {politician.credibility_change_count > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-gray-700 mb-4">Historique des changements</h4>
                      <Suspense
                        fallback={
                          <div className="text-center py-4 text-gray-500">Chargement de l&apos;historique...</div>
                        }
                      >
                        <CredibilityHistory
                          politicianId={politician.id}
                          politicianName={politician.name}
                          limit={5}
                        />
                      </Suspense>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">Méthodologie et transparence :</p>
          <p>
            Les scores de crédibilité sont calculés objectivement à partir de la vérification des promesses contre
            les actions parlementaires officielles. Nous utilisons un langage factuel qui décrit les actions (ex:
            &quot;promesse non tenue&quot;) et non des jugements de caractère. Toutes les données sont vérifiées par
            plusieurs sources indépendantes (IA, communauté Vigie du mensonge, données parlementaires) et chaque
            changement de score est documenté avec des preuves accessibles publiquement.
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
