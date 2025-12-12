'use client'

/**
 * Credibility Badge Component
 *
 * Displays a politician's credibility score with visual indicators.
 * Color-coded based on score range.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CredibilityBadgeProps {
  score: number
  showTrend?: boolean
  recentChange?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function CredibilityBadge({
  score,
  showTrend = false,
  recentChange,
  size = 'medium',
  className = ''
}: CredibilityBadgeProps) {
  // Ensure score is in valid range (0-200, baseline 100)
  const validScore = Math.max(0, Math.min(200, score))

  // Determine color based on score (range: 0-200, baseline 100)
  const getScoreColor = (): string => {
    if (validScore >= 150) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'    // 150-200: Excellent
    if (validScore >= 120) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'      // 120-149: Good
    if (validScore >= 80) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'  // 80-119: Average
    if (validScore >= 50) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'  // 50-79: Low
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'                                 // 0-49: Very Low
  }

  // Get score label (range: 0-200, baseline 100)
  const getScoreLabel = (): string => {
    if (validScore >= 150) return 'Excellente'
    if (validScore >= 120) return 'Bonne'
    if (validScore >= 80) return 'Moyenne'
    if (validScore >= 50) return 'Faible'
    return 'Très faible'
  }

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-0.5'
      case 'large':
        return 'text-base px-4 py-2'
      default:
        return 'text-sm px-3 py-1'
    }
  }

  // Trend indicator
  const getTrendIcon = () => {
    if (!showTrend || recentChange === undefined) return null

    if (recentChange > 0) {
      return <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 ml-1" />
    }
    if (recentChange < 0) {
      return <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 ml-1" />
    }
    return <Minus className="w-3 h-3 text-gray-400 dark:text-gray-500 ml-1" />
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge
        variant="outline"
        className={`${getScoreColor()} ${getSizeClasses()} font-semibold border`}
      >
        <span>Crédibilité: {validScore.toFixed(1)}/200</span>
        {getTrendIcon()}
      </Badge>

      {size !== 'small' && (
        <span className="text-xs text-gray-500 dark:text-gray-400">({getScoreLabel()})</span>
      )}
    </div>
  )
}

/**
 * Large credibility score display for politician profile pages
 */
export function CredibilityScoreCard({
  score,
  politicianName,
  promisesKept = 0,
  promisesBroken = 0,
  promisesPartial = 0,
  className = ''
}: {
  score: number
  politicianName: string
  promisesKept?: number
  promisesBroken?: number
  promisesPartial?: number
  className?: string
}) {
  const validScore = Math.max(0, Math.min(200, score))
  const total = promisesKept + promisesBroken + promisesPartial

  // Get color for circular progress (range: 0-200, baseline 100)
  const getProgressColor = (): string => {
    if (validScore >= 150) return 'text-green-600 dark:text-green-400'
    if (validScore >= 120) return 'text-blue-600 dark:text-blue-400'
    if (validScore >= 80) return 'text-yellow-600 dark:text-yellow-400'
    if (validScore >= 50) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Score de crédibilité
      </h3>

      {/* Large score display */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* Circular progress */}
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(validScore / 200) * 352} 352`}
              className={getProgressColor()}
              strokeLinecap="round"
            />
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getProgressColor()}`}>
              {validScore.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ 200</span>
          </div>
        </div>
      </div>

      {/* Stats breakdown */}
      {total > 0 && (
        <div className="space-y-3 border-t dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Promesses tenues</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{promisesKept}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({total > 0 ? Math.round((promisesKept / total) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Promesses non tenues</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{promisesBroken}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({total > 0 ? Math.round((promisesBroken / total) * 100) : 0}%)
              </span>
            </div>
          </div>

          {promisesPartial > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Promesses partielles</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{promisesPartial}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({total > 0 ? Math.round((promisesPartial / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legal disclaimer */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 border-t dark:border-gray-700 pt-3">
        Score basé sur la vérification factuelle des promesses vs actions parlementaires.
        Données vérifiées par sources multiples.
      </p>
    </div>
  )
}
