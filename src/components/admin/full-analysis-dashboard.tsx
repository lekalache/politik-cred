"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
  Vote,
  Calculator,
  Brain,
  Loader2,
  Clock,
  BarChart3,
  Zap
} from 'lucide-react'

interface AnalysisStats {
  politicians: { total: number; processed: number }
  parliamentaryActions: { collected: number; errors: number }
  promises: { vigie: number; news: number }
  matching: { total: number; matched: number }
  scores: { calculated: number; errors: number }
  profiles: { generated: number; withFlags: number; errors: number }
  duration: number
}

interface StatusCounts {
  politicians: number
  promises: number
  actions: number
  scores: number
  profiles: number
}

export function FullAnalysisDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<StatusCounts | null>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; stats: AnalysisStats } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Analysis options
  const [options, setOptions] = useState({
    limit: 0,
    skipParliament: false,
    skipVigie: true,
    skipNews: false,
    skipMatching: false,
    skipScores: false,
    skipProfiles: false
  })

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/full-analysis')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setIsRunning(true)
    setError(null)
    setLastResult(null)

    try {
      const response = await fetch('/api/admin/full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setLastResult({ success: true, stats: data.stats })
        // Refresh status after successful run
        fetchStatus()
      } else {
        setError(data.error || 'Analysis failed')
        if (data.stats) {
          setLastResult({ success: false, stats: data.stats })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsRunning(false)
    }
  }

  const toggleOption = (key: keyof typeof options) => {
    if (key === 'limit') return
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Zap className="w-5 h-5" />
                Audit Complet - Pipeline d'Analyse
              </CardTitle>
              <CardDescription className="text-purple-700 mt-1">
                Exécute l'analyse complète : collecte de données, matching sémantique, calcul des scores
              </CardDescription>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={isRunning}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Lancer l'audit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">État actuel de la base</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !status ? (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : status ? (
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <div className="text-2xl font-bold text-blue-700">{status.politicians}</div>
                <div className="text-xs text-blue-600">Politiciens</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <FileText className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <div className="text-2xl font-bold text-green-700">{status.promises}</div>
                <div className="text-xs text-green-600">Promesses</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Vote className="w-6 h-6 mx-auto text-orange-600 mb-1" />
                <div className="text-2xl font-bold text-orange-700">{status.actions}</div>
                <div className="text-xs text-orange-600">Actions parl.</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Calculator className="w-6 h-6 mx-auto text-purple-600 mb-1" />
                <div className="text-2xl font-bold text-purple-700">{status.scores}</div>
                <div className="text-xs text-purple-600">Scores</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <Brain className="w-6 h-6 mx-auto text-indigo-600 mb-1" />
                <div className="text-2xl font-bold text-indigo-700">{status.profiles}</div>
                <div className="text-xs text-indigo-600">Profils ADN</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Options d'analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={options.limit || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, limit: parseInt(e.target.value) || 0 }))}
                placeholder="Tous"
                className="w-20 px-2 py-1 border rounded text-sm"
              />
              <span className="text-sm text-gray-600">Limite</span>
            </div>

            {[
              { key: 'skipParliament', label: 'Parlement', icon: Vote },
              { key: 'skipVigie', label: 'Vigie', icon: FileText },
              { key: 'skipNews', label: 'News', icon: FileText },
              { key: 'skipMatching', label: 'Matching', icon: Brain },
              { key: 'skipScores', label: 'Scores', icon: Calculator },
              { key: 'skipProfiles', label: 'Profils', icon: Brain }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => toggleOption(key as keyof typeof options)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  options[key as keyof typeof options]
                    ? 'bg-gray-100 text-gray-500 border-gray-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
                {options[key as keyof typeof options] ? (
                  <Badge variant="outline" className="text-xs">Skip</Badge>
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Erreur :</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {lastResult && (
        <Card className={lastResult.success ? 'border-green-200' : 'border-orange-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {lastResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-700">Analyse terminée avec succès</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-orange-700">Analyse terminée avec des erreurs</span>
                </>
              )}
              <Badge variant="outline" className="ml-auto">
                <Clock className="w-3 h-3 mr-1" />
                {lastResult.stats.duration}s
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Politicians */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> Politiciens
                  </span>
                  <span>{lastResult.stats.politicians.processed} / {lastResult.stats.politicians.total}</span>
                </div>
                <Progress
                  value={lastResult.stats.politicians.total > 0
                    ? (lastResult.stats.politicians.processed / lastResult.stats.politicians.total) * 100
                    : 0}
                />
              </div>

              {/* Parliamentary Actions */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <Vote className="w-4 h-4" /> Actions parlementaires
                  </span>
                  <span>{lastResult.stats.parliamentaryActions.collected} collectées</span>
                </div>
                {lastResult.stats.parliamentaryActions.errors > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lastResult.stats.parliamentaryActions.errors} erreurs
                  </Badge>
                )}
              </div>

              {/* Promises */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Promesses
                  </span>
                  <span>
                    Vigie: {lastResult.stats.promises.vigie} | News: {lastResult.stats.promises.news}
                  </span>
                </div>
              </div>

              {/* Matching */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <Brain className="w-4 h-4" /> Matching sémantique
                  </span>
                  <span>{lastResult.stats.matching.matched} / {lastResult.stats.matching.total} matchées</span>
                </div>
                <Progress
                  value={lastResult.stats.matching.total > 0
                    ? (lastResult.stats.matching.matched / lastResult.stats.matching.total) * 100
                    : 0}
                />
              </div>

              {/* Scores */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-4 h-4" /> Scores calculés
                  </span>
                  <span>{lastResult.stats.scores.calculated}</span>
                </div>
                {lastResult.stats.scores.errors > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lastResult.stats.scores.errors} erreurs
                  </Badge>
                )}
              </div>

              {/* Profiles */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" /> Profils ADN générés
                  </span>
                  <span>
                    {lastResult.stats.profiles.generated}
                    {lastResult.stats.profiles.withFlags > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {lastResult.stats.profiles.withFlags} avec alertes
                      </Badge>
                    )}
                  </span>
                </div>
                {lastResult.stats.profiles.errors > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lastResult.stats.profiles.errors} erreurs
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running Animation */}
      {isRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <Zap className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-blue-700 font-medium">Analyse en cours...</p>
                <p className="text-blue-600 text-sm">
                  Cette opération peut prendre plusieurs minutes selon le nombre de politiciens.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
