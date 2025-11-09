'use client'

/**
 * Credibility History Component
 *
 * Displays a timeline of credibility score changes with careful legal language.
 *
 * IMPORTANT: Uses factual statements, not character judgments
 * - "a déclaré X mais a fait Y" ✓
 * - "est un menteur" ✗
 */

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CredibilityScorer } from '@/lib/credibility/credibility-scorer'

interface CredibilityHistoryEntry {
  id: string
  previous_score: number
  new_score: number
  score_change: number
  change_reason: string
  description: string
  verification_sources: string[] | null
  verification_confidence: number | null
  evidence_url: string | null
  created_at: string
  political_promises?: {
    promise_text: string
    source_url: string
  } | null
}

interface CredibilityHistoryProps {
  politicianId: string
  politicianName: string
  limit?: number
}

export function CredibilityHistory({
  politicianId,
  politicianName,
  limit = 10
}: CredibilityHistoryProps) {
  const [history, setHistory] = useState<CredibilityHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [politicianId])

  async function loadHistory() {
    setLoading(true)
    try {
      const data = await CredibilityScorer.getHistory(politicianId, limit)
      setHistory(data)
    } catch (error) {
      console.error('Failed to load credibility history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique de crédibilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique de crédibilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Aucun historique de crédibilité disponible pour {politicianName}</p>
            <p className="text-sm mt-2">
              Les changements apparaîtront ici lorsque des promesses seront vérifiées.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique de crédibilité - {politicianName}</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Basé sur la vérification factuelle des promesses vs actions parlementaires
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <CredibilityHistoryItem
              key={entry.id}
              entry={entry}
              isLatest={index === 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CredibilityHistoryItem({
  entry,
  isLatest
}: {
  entry: CredibilityHistoryEntry
  isLatest: boolean
}) {
  const isPositive = entry.score_change > 0
  const isNegative = entry.score_change < 0

  // Format date
  const date = new Date(entry.created_at).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Get appropriate icon and color
  const getStatusIcon = () => {
    if (isPositive) {
      return <TrendingUp className="w-5 h-5 text-green-600" />
    }
    if (isNegative) {
      return <TrendingDown className="w-5 h-5 text-red-600" />
    }
    return <AlertCircle className="w-5 h-5 text-gray-400" />
  }

  const getStatusColor = () => {
    if (isPositive) return 'border-green-200 bg-green-50'
    if (isNegative) return 'border-red-200 bg-red-50'
    return 'border-gray-200 bg-gray-50'
  }

  const getScoreChangeColor = () => {
    if (isPositive) return 'text-green-700 font-semibold'
    if (isNegative) return 'text-red-700 font-semibold'
    return 'text-gray-600'
  }

  const getBadgeVariant = () => {
    switch (entry.change_reason) {
      case 'promise_kept':
        return 'default' // Green
      case 'promise_broken':
        return 'destructive' // Red
      case 'promise_partial':
        return 'secondary' // Gray
      default:
        return 'outline'
    }
  }

  const getReasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
      promise_kept: 'Promesse tenue',
      promise_broken: 'Promesse non tenue',
      promise_partial: 'Promesse partielle',
      statement_verified: 'Déclaration vérifiée',
      statement_contradicted: 'Déclaration contredite',
      manual_adjustment: 'Ajustement manuel',
      initial_score: 'Score initial'
    }
    return labels[reason] || reason
  }

  return (
    <div
      className={`border-l-4 pl-4 py-3 rounded-r-lg transition-all ${getStatusColor()} ${
        isLatest ? 'ring-2 ring-blue-200' : ''
      }`}
    >
      {/* Header: Icon, Date, Score Change */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-600">{date}</span>
          {isLatest && (
            <Badge variant="outline" className="text-xs">
              Plus récent
            </Badge>
          )}
        </div>
        <div className={`text-lg font-bold ${getScoreChangeColor()}`}>
          {isPositive && '+'}
          {entry.score_change.toFixed(2)}
        </div>
      </div>

      {/* Reason Badge */}
      <div className="mb-2">
        <Badge variant={getBadgeVariant()} className="text-xs">
          {getReasonLabel(entry.change_reason)}
        </Badge>
      </div>

      {/* Description (legally careful language) */}
      <p className="text-sm text-gray-700 mb-2">{entry.description}</p>

      {/* Promise text if available */}
      {entry.political_promises && (
        <div className="bg-white bg-opacity-50 rounded p-2 mb-2">
          <p className="text-xs text-gray-600 italic">
            &quot;{entry.political_promises.promise_text.substring(0, 150)}
            {entry.political_promises.promise_text.length > 150 ? '...' : ''}&quot;
          </p>
        </div>
      )}

      {/* Score progression */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
        <span className="font-medium">{entry.previous_score.toFixed(1)}</span>
        <span>→</span>
        <span className="font-medium">{entry.new_score.toFixed(1)}</span>
        <span className="text-gray-400">/ 200</span>
      </div>

      {/* Verification sources */}
      {entry.verification_sources && entry.verification_sources.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.verification_sources.map((source, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {formatSource(source)}
            </Badge>
          ))}
          {entry.verification_confidence && (
            <Badge variant="outline" className="text-xs">
              Confiance: {Math.round(entry.verification_confidence * 100)}%
            </Badge>
          )}
        </div>
      )}

      {/* Evidence link */}
      {entry.evidence_url && (
        <a
          href={entry.evidence_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Voir la source
        </a>
      )}
    </div>
  )
}

function formatSource(source: string): string {
  const sourceNames: Record<string, string> = {
    ai_assisted: 'IA',
    vigie_community: 'Vigie',
    manual_review: 'Revue manuelle',
    parliamentary_match: 'Parlement',
    user_contributed: 'Utilisateur'
  }
  return sourceNames[source] || source
}
