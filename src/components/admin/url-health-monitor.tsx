'use client'

/**
 * URL Health Monitor Component
 *
 * Displays URL health statistics and allows admins to:
 * - View URL validation status breakdown
 * - Trigger URL validation for unchecked/failed URLs
 * - See which promises have broken source links
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  Archive
} from 'lucide-react'

interface URLHealthSummary {
  totalPromises: number
  needsValidation: number
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: number
  }>
  recommendation: string
}

interface ValidationResult {
  promiseId: string
  url: string
  status: string
  httpStatus?: number
  isAccessible: boolean
  responseTime?: number
  archiveUrl?: string | null
  error?: string
}

export function URLHealthMonitor() {
  const [summary, setSummary] = useState<URLHealthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<{
    summary: Record<string, number>
    results: ValidationResult[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealthSummary()
  }, [])

  async function fetchHealthSummary() {
    try {
      setLoading(true)
      const response = await fetch('/api/promises/validate-urls')

      if (!response.ok) {
        throw new Error('Failed to fetch URL health summary')
      }

      const data = await response.json()
      setSummary(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function runValidation() {
    try {
      setValidating(true)
      setError(null)

      const response = await fetch('/api/promises/validate-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      })

      if (!response.ok) {
        throw new Error('URL validation failed')
      }

      const data = await response.json()
      setValidationResults(data)

      // Refresh summary
      await fetchHealthSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation error')
    } finally {
      setValidating(false)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'valid':
      case 'redirect':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'archived_only':
        return <Archive className="w-5 h-5 text-blue-600" />
      case 'unchecked':
        return <Clock className="w-5 h-5 text-gray-400" />
      case 'timeout':
      case 'server_error':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      valid: 'Valide',
      redirect: 'Redirection',
      archived_only: 'Archivé uniquement',
      unchecked: 'Non vérifié',
      client_error: 'Erreur client (4xx)',
      server_error: 'Erreur serveur (5xx)',
      network_error: 'Erreur réseau',
      timeout: 'Timeout',
      invalid_format: 'Format invalide'
    }
    return labels[status] || status
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'valid':
      case 'redirect':
        return 'bg-green-100 text-green-800'
      case 'archived_only':
        return 'bg-blue-100 text-blue-800'
      case 'unchecked':
        return 'bg-gray-100 text-gray-800'
      case 'timeout':
      case 'server_error':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Santé des URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Santé des URLs sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {summary && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">
                    Total des promesses
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {summary.totalPromises}
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">
                    À vérifier
                  </div>
                  <div className="text-3xl font-bold text-yellow-900">
                    {summary.needsValidation}
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  Répartition par statut
                </h4>
                {summary.statusBreakdown.map(item => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">{item.count}</span>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(item.status)}`}
                      >
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              {summary.recommendation && (
                <Alert>
                  <AlertDescription>{summary.recommendation}</AlertDescription>
                </Alert>
              )}

              {/* Validation Button */}
              <Button
                onClick={runValidation}
                disabled={validating || summary.needsValidation === 0}
                className="w-full"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Valider les URLs ({summary.needsValidation})
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="bg-green-50 p-2 rounded text-center">
                  <div className="font-bold text-green-900">
                    {validationResults.summary.valid || 0}
                  </div>
                  <div className="text-green-600">Valides</div>
                </div>
                <div className="bg-blue-50 p-2 rounded text-center">
                  <div className="font-bold text-blue-900">
                    {validationResults.summary.redirect || 0}
                  </div>
                  <div className="text-blue-600">Redirections</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded text-center">
                  <div className="font-bold text-yellow-900">
                    {(validationResults.summary.timeout || 0) +
                      (validationResults.summary.server_error || 0)}
                  </div>
                  <div className="text-yellow-600">Temporaires</div>
                </div>
                <div className="bg-red-50 p-2 rounded text-center">
                  <div className="font-bold text-red-900">
                    {validationResults.summary.client_error || 0}
                  </div>
                  <div className="text-red-600">Erreurs</div>
                </div>
              </div>

              {/* Failed URLs */}
              {validationResults.results
                .filter(r => !r.isAccessible)
                .slice(0, 10)
                .map(result => (
                  <div
                    key={result.promiseId}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status)}`}
                        >
                          {getStatusLabel(result.status)}
                        </span>
                      </div>
                      {result.httpStatus && (
                        <span className="text-sm text-gray-500">
                          HTTP {result.httpStatus}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 truncate">
                      {result.url}
                    </div>

                    {result.archiveUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <Archive className="w-4 h-4 text-blue-600" />
                        <a
                          href={result.archiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          Version archivée disponible
                        </a>
                      </div>
                    )}

                    {result.error && (
                      <div className="text-xs text-red-600">{result.error}</div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
