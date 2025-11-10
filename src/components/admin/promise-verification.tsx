'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { CredibilityScorer } from '@/lib/credibility/credibility-scorer'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'

interface Promise {
  id: string
  politician_id: string
  politician_name: string
  promise_text: string
  source_url: string
  category: string
  verification_status: 'unverified' | 'kept' | 'broken' | 'partial' | 'in_progress'
  created_at: string
  verified_at: string | null
  view_count: number
}

interface MatchSuggestion {
  action_id: string
  action_type: string
  description: string
  date: string
  similarity: number
  vote_result?: string
}

export function PromiseVerification() {
  const [promises, setPromises] = useState<Promise[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unverified' | 'verified'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPromise, setSelectedPromise] = useState<Promise | null>(null)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchSuggestion[]>([])
  const [matchingLoading, setMatchingLoading] = useState(false)
  const [verifyingLoading, setVerifyingLoading] = useState(false)

  // Form state for verification
  const [verificationStatus, setVerificationStatus] = useState<'kept' | 'broken' | 'partial' | 'in_progress'>('kept')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  useEffect(() => {
    fetchPromises()
  }, [])

  const fetchPromises = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('political_promises')
        .select(`
          id,
          politician_id,
          politicians!inner(name),
          promise_text,
          source_url,
          category,
          verification_status,
          created_at,
          verified_at,
          view_count
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedPromises = data?.map((p: any) => ({
        id: p.id,
        politician_id: p.politician_id,
        politician_name: p.politicians?.name || 'Unknown',
        promise_text: p.promise_text,
        source_url: p.source_url,
        category: p.category,
        verification_status: p.verification_status,
        created_at: p.created_at,
        verified_at: p.verified_at,
        view_count: p.view_count || 0
      })) || []

      setPromises(formattedPromises)
    } catch (error) {
      console.error('Error fetching promises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyClick = async (promise: Promise) => {
    setSelectedPromise(promise)
    setVerificationModalOpen(true)
    setEvidenceUrl(promise.source_url || '')
    setVerificationNotes('')
    setSelectedMatchId(null)

    // Trigger AI matching
    await fetchAIMatches(promise)
  }

  const fetchAIMatches = async (promise: Promise) => {
    try {
      setMatchingLoading(true)
      setAiMatches([])

      const response = await fetch('/api/promises/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promiseId: promise.id,
          promiseText: promise.promise_text,
          politicianId: promise.politician_id,
          limit: 5
        })
      })

      if (!response.ok) throw new Error('Failed to fetch matches')

      const data = await response.json()

      if (data.matches && data.matches.length > 0) {
        setAiMatches(data.matches.map((m: any) => ({
          action_id: m.action_id,
          action_type: m.action_type,
          description: m.description,
          date: m.date,
          similarity: m.similarity,
          vote_result: m.vote_result
        })))
      }
    } catch (error) {
      console.error('Error fetching AI matches:', error)
    } finally {
      setMatchingLoading(false)
    }
  }

  const handleSubmitVerification = async () => {
    if (!selectedPromise) return

    try {
      setVerifyingLoading(true)

      // Update promise verification status
      const { error: promiseError } = await supabase
        .from('political_promises')
        .update({
          verification_status: verificationStatus,
          verified_at: new Date().toISOString(),
          evidence_url: evidenceUrl || null
        })
        .eq('id', selectedPromise.id)

      if (promiseError) throw promiseError

      // Calculate credibility impact
      const scoreChange = CredibilityScorer.calculateScoreChange(
        verificationStatus,
        ['ai_assisted', 'manual_review'], // Multi-source verification
        0.95, // High confidence (admin verified)
        'high' // Default to high importance for now
      )

      const description = CredibilityScorer.generateDescription(
        verificationStatus,
        selectedPromise.promise_text,
        ['ai_assisted', 'manual_review']
      )

      // Update credibility score
      await CredibilityScorer.updateCredibility({
        politicianId: selectedPromise.politician_id,
        promiseId: selectedPromise.id,
        verificationStatus: verificationStatus,
        verificationSources: ['ai_assisted', 'manual_review'],
        verificationConfidence: 0.95,
        promiseImportance: 'high',
        promiseText: selectedPromise.promise_text,
        evidenceUrl: evidenceUrl || selectedPromise.source_url
      })

      // Refresh promises list
      await fetchPromises()

      // Close modal
      setVerificationModalOpen(false)
      setSelectedPromise(null)

      alert(`Vérification réussie! Impact: ${scoreChange > 0 ? '+' : ''}${scoreChange.toFixed(2)} points`)
    } catch (error) {
      console.error('Error submitting verification:', error)
      alert('Erreur lors de la vérification')
    } finally {
      setVerifyingLoading(false)
    }
  }

  const filteredPromises = promises.filter(p => {
    const matchesFilter = filter === 'all' ? true :
      filter === 'unverified' ? p.verification_status === 'unverified' :
      p.verification_status !== 'unverified'

    const matchesSearch = searchTerm === '' ? true :
      p.promise_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.politician_name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const stats = {
    total: promises.length,
    unverified: promises.filter(p => p.verification_status === 'unverified').length,
    kept: promises.filter(p => p.verification_status === 'kept').length,
    broken: promises.filter(p => p.verification_status === 'broken').length,
    partial: promises.filter(p => p.verification_status === 'partial').length
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'kept':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Tenue</Badge>
      case 'broken':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="w-3 h-3 mr-1" />Non tenue</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><AlertCircle className="w-3 h-3 mr-1" />Partielle</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Clock className="w-3 h-3 mr-1" />En cours</Badge>
      default:
        return <Badge variant="outline">Non vérifié</Badge>
    }
  }

  const getCredibilityImpact = (status: string) => {
    const impact = CredibilityScorer.calculateScoreChange(
      status as any,
      ['ai_assisted', 'manual_review'],
      0.95,
      'high'
    )
    return impact
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-orange-600">Non vérifiées</div>
            <div className="text-2xl font-bold text-orange-600">{stats.unverified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-green-600">Tenues</div>
            <div className="text-2xl font-bold text-green-600">{stats.kept}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">Non tenues</div>
            <div className="text-2xl font-bold text-red-600">{stats.broken}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-yellow-600">Partielles</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toutes ({stats.total})
              </Button>
              <Button
                variant={filter === 'unverified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unverified')}
              >
                <Filter className="w-3 h-3 mr-1" />
                Non vérifiées ({stats.unverified})
              </Button>
              <Button
                variant={filter === 'verified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('verified')}
              >
                Vérifiées ({stats.total - stats.unverified})
              </Button>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une promesse ou un politicien..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promises List */}
      <Card>
        <CardHeader>
          <CardTitle>Promesses ({filteredPromises.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPromises.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Aucune promesse trouvée</p>
              </div>
            ) : (
              filteredPromises.map(promise => (
                <div
                  key={promise.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{promise.politician_name}</span>
                        {getStatusBadge(promise.verification_status)}
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {promise.view_count} vues
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-2">{promise.promise_text}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Catégorie: {promise.category}</span>
                        <span>•</span>
                        <span>{new Date(promise.created_at).toLocaleDateString('fr-FR')}</span>
                        {promise.verified_at && (
                          <>
                            <span>•</span>
                            <span>Vérifié le {new Date(promise.verified_at).toLocaleDateString('fr-FR')}</span>
                          </>
                        )}
                        {promise.source_url && (
                          <>
                            <span>•</span>
                            {(() => {
                              try {
                                new URL(promise.source_url)
                                return (
                                  <a
                                    href={promise.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    Source <ExternalLink className="w-3 h-3" />
                                  </a>
                                )
                              } catch {
                                return (
                                  <span
                                    className="text-gray-400 flex items-center gap-1 cursor-help"
                                    title={`URL invalide: ${promise.source_url}`}
                                  >
                                    Source invalide <ExternalLink className="w-3 h-3 opacity-50" />
                                  </span>
                                )
                              }
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        onClick={() => handleVerifyClick(promise)}
                      >
                        {promise.verification_status === 'unverified' ? 'Vérifier' : 'Modifier'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {verificationModalOpen && selectedPromise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">Vérification de promesse</h2>
              <p className="text-gray-600 mt-1">{selectedPromise.politician_name}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Promise Text */}
              <div>
                <label className="block text-sm font-semibold mb-2">Promesse</label>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedPromise.promise_text}</p>
              </div>

              {/* AI Matches */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Correspondances IA {matchingLoading && <Loader2 className="w-4 h-4 inline animate-spin ml-2" />}
                </label>
                {aiMatches.length > 0 ? (
                  <div className="space-y-2">
                    {aiMatches.map(match => (
                      <div
                        key={match.action_id}
                        className={`border rounded p-3 cursor-pointer transition-colors ${
                          selectedMatchId === match.action_id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedMatchId(match.action_id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{match.action_type}</Badge>
                              <Badge className={`${
                                match.similarity >= 0.7 ? 'bg-green-100 text-green-800' :
                                match.similarity >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {(match.similarity * 100).toFixed(0)}% similitude
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{match.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(match.date).toLocaleDateString('fr-FR')}
                              {match.vote_result && ` • Résultat: ${match.vote_result}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matchingLoading ? (
                  <p className="text-gray-500 text-sm">Recherche de correspondances...</p>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune correspondance trouvée</p>
                )}
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-sm font-semibold mb-2">Statut de vérification</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'kept', label: 'Tenue', icon: CheckCircle2, color: 'green' },
                    { value: 'broken', label: 'Non tenue', icon: XCircle, color: 'red' },
                    { value: 'partial', label: 'Partielle', icon: AlertCircle, color: 'yellow' },
                    { value: 'in_progress', label: 'En cours', icon: Clock, color: 'blue' }
                  ].map(status => {
                    const Icon = status.icon
                    const isSelected = verificationStatus === status.value
                    const impact = getCredibilityImpact(status.value)
                    return (
                      <button
                        key={status.value}
                        onClick={() => setVerificationStatus(status.value as any)}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          isSelected
                            ? `border-${status.color}-500 bg-${status.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${
                          isSelected ? `text-${status.color}-600` : 'text-gray-400'
                        }`} />
                        <div className="text-xs font-medium">{status.label}</div>
                        <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                          impact > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {impact > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {impact > 0 ? '+' : ''}{impact.toFixed(1)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Evidence URL */}
              <div>
                <label className="block text-sm font-semibold mb-2">URL de preuve</label>
                <input
                  type="url"
                  className="w-full p-2 border rounded"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2">Notes (optionnel)</label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Notes additionnelles sur la vérification..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setVerificationModalOpen(false)
                  setSelectedPromise(null)
                }}
                disabled={verifyingLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitVerification}
                disabled={verifyingLoading}
              >
                {verifyingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Valider la vérification'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
