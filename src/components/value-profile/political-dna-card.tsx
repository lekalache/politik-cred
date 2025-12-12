'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Leaf,
  Users,
  Heart,
  GraduationCap,
  Globe,
  Scale,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import type {
  ValueCategory,
  ValueMetrics,
  GreenwashingFlag,
  PriorityShift,
  CoreValueProfile
} from '@/lib/supabase'

// Category icons
const CATEGORY_ICONS: Record<ValueCategory, React.ReactNode> = {
  economy: <TrendingUp className="h-4 w-4" />,
  environment: <Leaf className="h-4 w-4" />,
  social_justice: <Users className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  immigration: <Globe className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  foreign_policy: <Globe className="h-4 w-4" />,
  other: <Info className="h-4 w-4" />
}

// Category labels in French
const CATEGORY_LABELS: Record<ValueCategory, string> = {
  economy: 'Économie',
  environment: 'Environnement',
  social_justice: 'Justice sociale',
  security: 'Sécurité',
  immigration: 'Immigration',
  health: 'Santé',
  education: 'Éducation',
  foreign_policy: 'Politique étrangère',
  other: 'Autre'
}

// Category colors
const CATEGORY_COLORS: Record<ValueCategory, string> = {
  economy: 'bg-blue-500',
  environment: 'bg-green-500',
  social_justice: 'bg-purple-500',
  security: 'bg-red-500',
  immigration: 'bg-orange-500',
  health: 'bg-pink-500',
  education: 'bg-indigo-500',
  foreign_policy: 'bg-teal-500',
  other: 'bg-gray-500'
}

interface PoliticalDNACardProps {
  profile: CoreValueProfile
  politicianName?: string
  compact?: boolean
}

export function PoliticalDNACard({ profile, politicianName, compact = false }: PoliticalDNACardProps) {
  const [expanded, setExpanded] = useState(!compact)

  // Get top categories sorted by attention score
  const topCategories = Object.entries(profile.value_metrics)
    .filter(([_, m]) => m.promise_count > 0)
    .sort(([, a], [, b]) => b.attention_score - a.attention_score)
    .slice(0, 5)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:shadow-lg dark:shadow-black/20 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              ADN Politique
              {politicianName && <span className="text-gray-500 dark:text-gray-400 font-normal"> - {politicianName}</span>}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {topCategories.length > 0
                ? `Priorité: ${CATEGORY_LABELS[topCategories[0][0] as ValueCategory]}`
                : 'Données insuffisantes'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Authenticity badge */}
          {profile.authenticity_score !== null && (
            <AuthenticityBadge score={profile.authenticity_score} />
          )}

          {/* Greenwashing indicator */}
          {profile.greenwashing_flags.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">{profile.greenwashing_flags.length}</span>
            </div>
          )}

          {expanded ? <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Value Distribution */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Distribution des priorités</h4>
            <div className="space-y-2">
              {topCategories.map(([category, metrics]) => (
                <ValueBar
                  key={category}
                  category={category as ValueCategory}
                  metrics={metrics}
                />
              ))}
            </div>
          </div>

          {/* Greenwashing Alerts */}
          {profile.greenwashing_flags.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Alertes de cohérence
              </h4>
              <div className="space-y-2">
                {profile.greenwashing_flags.map((flag, index) => (
                  <GreenwashingAlert key={index} flag={flag} />
                ))}
              </div>
            </div>
          )}

          {/* Priority Shifts */}
          {profile.priority_shifts.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                Évolution des priorités
              </h4>
              <div className="space-y-2">
                {profile.priority_shifts.map((shift, index) => (
                  <PriorityShiftItem key={index} shift={shift} />
                ))}
              </div>
            </div>
          )}

          {/* Behavioral Patterns */}
          {profile.behavioral_patterns.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profil comportemental</h4>
              <div className="flex flex-wrap gap-2">
                {profile.behavioral_patterns.map((pattern, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data Quality Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Qualité des données: {Math.round((profile.data_quality_score || 0) * 100)}%</span>
              <span>Mis à jour: {new Date(profile.calculated_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Authenticity Badge Component
function AuthenticityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
  }

  const getLabel = () => {
    if (score >= 80) return 'Très fiable'
    if (score >= 60) return 'Fiable'
    return 'À vérifier'
  }

  return (
    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getColor()}`}>
      {getLabel()} ({score}%)
    </div>
  )
}

// Value Bar Component
function ValueBar({ category, metrics }: { category: ValueCategory; metrics: ValueMetrics }) {
  const total = metrics.kept_count + metrics.broken_count + metrics.partial_count
  const hasVerifications = total > 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`p-1 rounded ${CATEGORY_COLORS[category]} text-white`}>
            {CATEGORY_ICONS[category]}
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[category]}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{metrics.promise_count} promesses</span>
          {hasVerifications && (
            <span className={metrics.consistency_score >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {metrics.consistency_score}% tenues
            </span>
          )}
        </div>
      </div>

      {/* Attention bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${CATEGORY_COLORS[category]} transition-all duration-500`}
          style={{ width: `${metrics.attention_score}%` }}
        />
      </div>

      {/* Consistency indicator */}
      {hasVerifications && (
        <div className="flex gap-1 h-1.5">
          {metrics.kept_count > 0 && (
            <div
              className="bg-green-500 rounded-full"
              style={{ width: `${(metrics.kept_count / total) * 100}%` }}
              title={`${metrics.kept_count} tenues`}
            />
          )}
          {metrics.partial_count > 0 && (
            <div
              className="bg-yellow-500 rounded-full"
              style={{ width: `${(metrics.partial_count / total) * 100}%` }}
              title={`${metrics.partial_count} partielles`}
            />
          )}
          {metrics.broken_count > 0 && (
            <div
              className="bg-red-500 rounded-full"
              style={{ width: `${(metrics.broken_count / total) * 100}%` }}
              title={`${metrics.broken_count} non tenues`}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Greenwashing Alert Component
function GreenwashingAlert({ flag }: { flag: GreenwashingFlag }) {
  const severityColors = {
    low: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
    medium: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-300',
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
  }

  const typeLabels = {
    greenwashing: 'Greenwashing',
    priority_mismatch: 'Incohérence'
  }

  return (
    <div className={`p-3 rounded-lg border ${severityColors[flag.severity]}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase">{typeLabels[flag.type]}</span>
            <span className="text-xs opacity-75">{CATEGORY_LABELS[flag.category]}</span>
          </div>
          <p className="text-sm">{flag.description}</p>
        </div>
      </div>
    </div>
  )
}

// Priority Shift Component
function PriorityShiftItem({ shift }: { shift: PriorityShift }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <span className={`p-1 rounded ${CATEGORY_COLORS[shift.from_category]} text-white`}>
          {CATEGORY_ICONS[shift.from_category]}
        </span>
        <TrendingDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      </div>
      <span className="text-gray-400 dark:text-gray-500">→</span>
      <div className="flex items-center gap-1">
        <span className={`p-1 rounded ${CATEGORY_COLORS[shift.to_category]} text-white`}>
          {CATEGORY_ICONS[shift.to_category]}
        </span>
        <TrendingUp className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {shift.magnitude > 0 && `+${shift.magnitude}%`}
      </span>
    </div>
  )
}

// Compact version for lists
export function PoliticalDNABadge({ profile }: { profile: CoreValueProfile }) {
  const topCategory = Object.entries(profile.value_metrics)
    .filter(([_, m]) => m.promise_count > 0)
    .sort(([, a], [, b]) => b.attention_score - a.attention_score)[0]

  if (!topCategory) return null

  const [category] = topCategory
  const hasWarnings = profile.greenwashing_flags.length > 0

  return (
    <div className="flex items-center gap-2">
      <span className={`p-1.5 rounded-full ${CATEGORY_COLORS[category as ValueCategory]} text-white`}>
        {CATEGORY_ICONS[category as ValueCategory]}
      </span>
      {hasWarnings && (
        <AlertTriangle className="h-3 w-3 text-amber-500" />
      )}
      {profile.authenticity_score !== null && profile.authenticity_score >= 70 && (
        <Shield className="h-3 w-3 text-green-500" />
      )}
    </div>
  )
}
