'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  CheckCircle,
  TrendingUp,
  Info,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Vote,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle
} from 'lucide-react'

interface Politician {
  id: string
  name: string
  party: string | null
  position: string | null
  image_url: string | null
  bio: string | null
  ai_score: number | null
  ai_last_audited_at: string | null
  created_at: string
  updated_at: string
}

interface ConsistencyScore {
  politician_id: string
  overall_score: number
  promises_kept: number
  promises_broken: number
  promises_partial: number
  promises_pending: number
  attendance_rate: number
  sessions_attended: number
  sessions_scheduled: number
  legislative_activity_score: number
  bills_sponsored: number
  amendments_proposed: number
  debates_participated: number
  questions_asked: number
  data_quality_score: number
  last_calculated_at: string
}

interface Promise {
  id: string
  promise_text: string
  source_url: string
  category: string | null
  date_made: string | null
  verification_status: string
  created_at: string
}

interface PromiseVerification {
  id: string
  promise_id: string
  match_type: 'kept' | 'broken' | 'partial'
  match_confidence: number
  explanation: string
  verified_at: string
  promise?: Promise
}

interface ParliamentaryAction {
  id: string
  action_type: string
  description: string
  vote_position: string | null
  date: string
  source_url: string | null
  created_at: string
}

export default function PoliticianProfilePage() {
  const params = useParams()
  const id = params.id as string

  const [politician, setPolitician] = useState<Politician | null>(null)
  const [scores, setScores] = useState<ConsistencyScore | null>(null)
  const [verifications, setVerifications] = useState<PromiseVerification[]>([])
  const [actions, setActions] = useState<ParliamentaryAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Loading politician with ID:', id)

        // Fetch politician
        const { data: polData, error: polError } = await supabase
          .from('politicians')
          .select('*')
          .eq('id', id)
          .single()

        if (polError) {
          console.error('Error fetching politician:', polError)
          setLoading(false)
          return
        }

        if (!polData) {
          console.error('No politician found with ID:', id)
          setLoading(false)
          return
        }

        console.log('Politician loaded:', polData)
        setPolitician(polData)

        // Fetch consistency scores
        const { data: scoresData } = await supabase
          .from('consistency_scores')
          .select('*')
          .eq('politician_id', id)
          .single()

        setScores(scoresData || null)

        // Fetch promises for this politician
        const { data: promisesData } = await supabase
          .from('political_promises')
          .select('id')
          .eq('politician_id', id)

        if (promisesData && promisesData.length > 0) {
          const promiseIds = promisesData.map(p => p.id)

          // Fetch promise verifications with promises
          const { data: verificationsData } = await supabase
            .from('promise_verifications')
            .select('*')
            .in('promise_id', promiseIds)
            .order('verified_at', { ascending: false })

          if (verificationsData) {
            // Fetch full promise details for each verification
            const verificationsWithPromises = await Promise.all(
              verificationsData.map(async (verification) => {
                const { data: promiseData } = await supabase
                  .from('political_promises')
                  .select('*')
                  .eq('id', verification.promise_id)
                  .single()

                return {
                  ...verification,
                  promise: promiseData
                }
              })
            )

            setVerifications(verificationsWithPromises as any)
          }
        }

        // Fetch parliamentary actions
        const { data: actionsData } = await supabase
          .from('parliamentary_actions')
          .select('*')
          .eq('politician_id', id)
          .order('date', { ascending: false })
          .limit(20)

        if (actionsData) {
          setActions(actionsData)
        }

      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] mx-auto mb-4" />
            <p className="text-gray-600">Chargement du profil...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!politician) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Politicien non trouvé</h2>
              <p className="text-gray-600 mb-4">
                Le politicien demandé n&apos;existe pas ou n&apos;a pas encore été audité.
              </p>
              <Link href="/score">
                <button className="text-[#1E3A8A] hover:underline flex items-center gap-2 mx-auto">
                  <ArrowLeft className="w-4 h-4" />
                  Retour au classement
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case 'kept':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'broken':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'partial':
        return <MinusCircle className="w-5 h-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case 'kept':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Tenue</Badge>
      case 'broken':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Brisée</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partielle</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/score" className="text-white hover:text-blue-100 flex items-center gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour au classement
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={politician.image_url || undefined} />
              <AvatarFallback className="text-2xl">
                {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{politician.name}</h1>
              {politician.party && (
                <Badge variant="outline" className="bg-white/20 text-white border-white/40 mb-2">
                  {politician.party}
                </Badge>
              )}
              {politician.position && (
                <p className="text-blue-100 text-lg">{politician.position}</p>
              )}
              {politician.ai_last_audited_at && (
                <p className="text-blue-200 text-sm mt-2">
                  Dernière analyse : {new Date(politician.ai_last_audited_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>

          {politician.bio && (
            <p className="mt-6 text-blue-50 max-w-4xl">
              {politician.bio}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 4 AI Scores Grid */}
        {scores && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Scores IA - Audit Objectif</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Score 1: Consistency Score */}
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700 uppercase">Cohérence</span>
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-indigo-900 mb-1">
                    {scores.overall_score?.toFixed(1) || politician.ai_score || '—'}<span className="text-lg">/100</span>
                  </div>
                  <Progress
                    value={scores.overall_score || politician.ai_score || 0}
                    className="h-2 mb-2 bg-indigo-200"
                  />
                  <div className="text-xs text-indigo-600 space-y-0.5">
                    <div>✓ Tenues: {scores.promises_kept || 0}</div>
                    <div>✗ Brisées: {scores.promises_broken || 0}</div>
                    <div>◐ Partielles: {scores.promises_partial || 0}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Score 2: Attendance Rate */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-700 uppercase">Présence</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900 mb-1">
                    {scores.attendance_rate !== null ? `${scores.attendance_rate.toFixed(1)}%` : '—'}
                  </div>
                  <Progress
                    value={scores.attendance_rate || 0}
                    className="h-2 mb-2 bg-green-200"
                  />
                  <div className="text-xs text-green-600">
                    {scores.sessions_attended || 0}/{scores.sessions_scheduled || 0} sessions
                  </div>
                </CardContent>
              </Card>

              {/* Score 3: Legislative Activity */}
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 uppercase">Activité</span>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900 mb-1">
                    {scores.legislative_activity_score !== null ? `${scores.legislative_activity_score.toFixed(1)}` : '—'}<span className="text-lg">/100</span>
                  </div>
                  <Progress
                    value={scores.legislative_activity_score || 0}
                    className="h-2 mb-2 bg-amber-200"
                  />
                  <div className="text-xs text-amber-600 space-y-0.5">
                    <div>Lois: {scores.bills_sponsored || 0}</div>
                    <div>Amendements: {scores.amendments_proposed || 0}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Score 4: Data Quality */}
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 uppercase">Données</span>
                    <Info className="w-4 h-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {scores.data_quality_score !== null ? `${(scores.data_quality_score * 100).toFixed(0)}%` : '—'}
                  </div>
                  <Progress
                    value={(scores.data_quality_score || 0) * 100}
                    className="h-2 mb-2 bg-gray-200"
                  />
                  <div className="text-xs text-gray-600">
                    Complétude de l&apos;audit
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Promise Verifications */}
        {verifications.length > 0 && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Promesses Vérifiées ({verifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {verifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMatchTypeIcon(verification.match_type)}
                          {getMatchTypeBadge(verification.match_type)}
                          <Badge variant="outline" className="text-xs">
                            Confiance: {(verification.match_confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(verification.verified_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {verification.promise && (
                        <>
                          <p className="text-gray-900 font-medium mb-2">
                            {verification.promise.promise_text}
                          </p>

                          {verification.promise.category && (
                            <Badge variant="outline" className="text-xs mb-2">
                              {verification.promise.category}
                            </Badge>
                          )}

                          <p className="text-sm text-gray-600 mb-2">
                            {verification.explanation}
                          </p>

                          {verification.promise.source_url && (
                            <a
                              href={verification.promise.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source de la promesse
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Parliamentary Actions */}
        {actions.length > 0 && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="w-5 h-5" />
                  Actions Parlementaires Récentes ({actions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="border-l-4 border-[#1E3A8A] pl-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {action.action_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(action.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <p className="text-sm text-gray-900 mb-2">
                        {action.description}
                      </p>

                      {action.vote_position && (
                        <Badge
                          className={
                            action.vote_position === 'pour'
                              ? 'bg-green-100 text-green-800'
                              : action.vote_position === 'contre'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          Vote: {action.vote_position}
                        </Badge>
                      )}

                      {action.source_url && (
                        <a
                          href={action.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source officielle
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Stats */}
        {scores && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques Détaillées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Promesses</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Total vérifiées</span>
                        <span className="font-semibold">
                          {(scores.promises_kept || 0) + (scores.promises_broken || 0) + (scores.promises_partial || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm text-green-800">Tenues</span>
                        <span className="font-semibold text-green-800">{scores.promises_kept || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-red-800">Brisées</span>
                        <span className="font-semibold text-red-800">{scores.promises_broken || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-sm text-yellow-800">Partielles</span>
                        <span className="font-semibold text-yellow-800">{scores.promises_partial || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">En attente</span>
                        <span className="font-semibold">{scores.promises_pending || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Activité Parlementaire</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Sessions présent</span>
                        <span className="font-semibold">{scores.sessions_attended || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Lois proposées</span>
                        <span className="font-semibold">{scores.bills_sponsored || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Amendements</span>
                        <span className="font-semibold">{scores.amendments_proposed || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Débats</span>
                        <span className="font-semibold">{scores.debates_participated || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Questions</span>
                        <span className="font-semibold">{scores.questions_asked || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">Méthodologie AI-Driven et Transparence :</p>
          <p>
            Tous les scores sont calculés automatiquement par IA à partir de données officielles vérifiables
            (Assemblée Nationale, Vigie du mensonge, sources gouvernementales). <strong>100% objectif, 0% subjectif</strong> :
            pas de jugements humains, que des mathématiques et des faits documentés. Formules de calcul publiques,
            sources accessibles, audit transparent.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
