'use client'

import { useState, useEffect } from 'react'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Users,
  Leaf,
  TrendingUp,
  Shield,
  Heart,
  GraduationCap,
  Globe,
  Scale,
  AlertTriangle,
  Check,
  X,
  Minus
} from 'lucide-react'
import type {
  ValueCategory,
  CoreValueProfile,
  Politician
} from '@/lib/supabase'

// Category configuration
const CATEGORIES: { key: ValueCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'economy', label: 'Économie', icon: <TrendingUp className="h-4 w-4" />, color: 'blue' },
  { key: 'environment', label: 'Environnement', icon: <Leaf className="h-4 w-4" />, color: 'green' },
  { key: 'social_justice', label: 'Justice sociale', icon: <Users className="h-4 w-4" />, color: 'purple' },
  { key: 'security', label: 'Sécurité', icon: <Shield className="h-4 w-4" />, color: 'red' },
  { key: 'health', label: 'Santé', icon: <Heart className="h-4 w-4" />, color: 'pink' },
  { key: 'education', label: 'Éducation', icon: <GraduationCap className="h-4 w-4" />, color: 'indigo' },
  { key: 'foreign_policy', label: 'International', icon: <Globe className="h-4 w-4" />, color: 'teal' },
  { key: 'immigration', label: 'Immigration', icon: <Globe className="h-4 w-4" />, color: 'orange' },
]

interface PoliticianWithProfile extends Politician {
  profile: CoreValueProfile | null
}

interface PoliticianComparisonProps {
  politicians: PoliticianWithProfile[]
  selectedIds?: [string, string]
  onSelect?: (ids: [string, string]) => void
}

export function PoliticianComparison({
  politicians,
  selectedIds,
  onSelect
}: PoliticianComparisonProps) {
  const [leftId, setLeftId] = useState<string | null>(selectedIds?.[0] || null)
  const [rightId, setRightId] = useState<string | null>(selectedIds?.[1] || null)
  const [expandedCategory, setExpandedCategory] = useState<ValueCategory | null>(null)

  const leftPolitician = politicians.find(p => p.id === leftId)
  const rightPolitician = politicians.find(p => p.id === rightId)

  useEffect(() => {
    if (leftId && rightId && onSelect) {
      onSelect([leftId, rightId])
    }
  }, [leftId, rightId, onSelect])

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-800">
          <Scale className="h-5 w-5 text-blue-600" />
          Comparateur ADN Politique
        </div>
        <p className="text-center text-sm text-gray-500 mt-1">
          Comparez les priorités et la cohérence de deux politiciens
        </p>
      </div>

      {/* Politician Selectors */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-200">
        <PoliticianSelector
          label="Politicien 1"
          politicians={politicians}
          selectedId={leftId}
          excludeId={rightId}
          onSelect={setLeftId}
          color="blue"
        />
        <PoliticianSelector
          label="Politicien 2"
          politicians={politicians}
          selectedId={rightId}
          excludeId={leftId}
          onSelect={setRightId}
          color="purple"
        />
      </div>

      {/* Comparison Content */}
      {leftPolitician && rightPolitician ? (
        <div className="divide-y divide-gray-200">
          {/* Overall Scores */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Scores globaux</h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreCard
                label="Authenticité"
                leftScore={leftPolitician.profile?.authenticity_score}
                rightScore={rightPolitician.profile?.authenticity_score}
                leftName={leftPolitician.name}
                rightName={rightPolitician.name}
              />
              <ScoreCard
                label="Qualité données"
                leftScore={leftPolitician.profile?.data_quality_score ? leftPolitician.profile.data_quality_score * 100 : null}
                rightScore={rightPolitician.profile?.data_quality_score ? rightPolitician.profile.data_quality_score * 100 : null}
                leftName={leftPolitician.name}
                rightName={rightPolitician.name}
              />
            </div>
          </div>

          {/* Category Comparison */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Comparaison par thème</h3>
            <div className="space-y-2">
              {CATEGORIES.map(category => (
                <CategoryComparisonRow
                  key={category.key}
                  category={category}
                  leftProfile={leftPolitician.profile}
                  rightProfile={rightPolitician.profile}
                  leftName={leftPolitician.name}
                  rightName={rightPolitician.name}
                  isExpanded={expandedCategory === category.key}
                  onToggle={() => setExpandedCategory(
                    expandedCategory === category.key ? null : category.key
                  )}
                />
              ))}
            </div>
          </div>

          {/* Warnings Comparison */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes de cohérence
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <WarningsList
                name={leftPolitician.name}
                flags={leftPolitician.profile?.greenwashing_flags || []}
                color="blue"
              />
              <WarningsList
                name={rightPolitician.name}
                flags={rightPolitician.profile?.greenwashing_flags || []}
                color="purple"
              />
            </div>
          </div>

          {/* Verdict */}
          {leftPolitician.profile && rightPolitician.profile && (
            <ComparisonVerdict
              leftProfile={leftPolitician.profile}
              rightProfile={rightPolitician.profile}
              leftName={leftPolitician.name}
              rightName={rightPolitician.name}
            />
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Sélectionnez deux politiciens pour comparer leurs profils</p>
        </div>
      )}
    </div>
  )
}

// Politician Selector Component
function PoliticianSelector({
  label,
  politicians,
  selectedId,
  excludeId,
  onSelect,
  color
}: {
  label: string
  politicians: PoliticianWithProfile[]
  selectedId: string | null
  excludeId: string | null
  onSelect: (id: string | null) => void
  color: 'blue' | 'purple'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = politicians.find(p => p.id === selectedId)
  const available = politicians.filter(p => p.id !== excludeId && p.profile)

  const colorClasses = color === 'blue'
    ? 'border-blue-200 focus:ring-blue-500'
    : 'border-purple-200 focus:ring-purple-500'

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <button
        className={`w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${colorClasses}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected?.name || 'Sélectionner...'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {available.map(politician => (
            <button
              key={politician.id}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
              onClick={() => {
                onSelect(politician.id)
                setIsOpen(false)
              }}
            >
              <span>{politician.name}</span>
              {politician.profile?.authenticity_score != null && (
                <span className="text-xs text-gray-500">
                  {politician.profile?.authenticity_score}%
                </span>
              )}
            </button>
          ))}
          {available.length === 0 && (
            <div className="px-3 py-2 text-gray-500 text-sm">Aucun profil disponible</div>
          )}
        </div>
      )}
    </div>
  )
}

// Score Card Component
function ScoreCard({
  label,
  leftScore,
  rightScore,
  leftName,
  rightName
}: {
  label: string
  leftScore: number | null | undefined
  rightScore: number | null | undefined
  leftName: string
  rightName: string
}) {
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-gray-400'
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const winner = leftScore != null && rightScore != null
    ? (leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie')
    : null

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <div className={`text-lg font-bold ${getScoreColor(leftScore)} ${winner === 'left' ? 'underline' : ''}`}>
          {leftScore != null ? `${Math.round(leftScore)}%` : '-'}
        </div>
        <div className="text-gray-300">vs</div>
        <div className={`text-lg font-bold ${getScoreColor(rightScore)} ${winner === 'right' ? 'underline' : ''}`}>
          {rightScore != null ? `${Math.round(rightScore)}%` : '-'}
        </div>
      </div>
    </div>
  )
}

// Category Comparison Row
function CategoryComparisonRow({
  category,
  leftProfile,
  rightProfile,
  leftName,
  rightName,
  isExpanded,
  onToggle
}: {
  category: { key: ValueCategory; label: string; icon: React.ReactNode; color: string }
  leftProfile: CoreValueProfile | null
  rightProfile: CoreValueProfile | null
  leftName: string
  rightName: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const leftMetrics = leftProfile?.value_metrics[category.key]
  const rightMetrics = rightProfile?.value_metrics[category.key]

  const leftScore = leftMetrics?.consistency_score || 0
  const rightScore = rightMetrics?.consistency_score || 0
  const leftCount = leftMetrics?.promise_count || 0
  const rightCount = rightMetrics?.promise_count || 0

  const hasData = leftCount > 0 || rightCount > 0

  if (!hasData) return null

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        className="w-full p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded bg-${category.color}-100 text-${category.color}-600`}>
            {category.icon}
          </span>
          <span className="font-medium text-gray-700">{category.label}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Left score */}
          <div className="text-right">
            <div className={`text-sm font-bold ${leftScore >= 60 ? 'text-green-600' : 'text-red-600'}`}>
              {leftCount > 0 ? `${leftScore}%` : '-'}
            </div>
            <div className="text-xs text-gray-400">{leftCount} promesses</div>
          </div>

          {/* Comparison indicator */}
          <div className="w-8 flex justify-center">
            {leftCount > 0 && rightCount > 0 && (
              leftScore > rightScore ? (
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : rightScore > leftScore ? (
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                  <Minus className="h-3 w-3 text-white" />
                </div>
              )
            )}
          </div>

          {/* Right score */}
          <div className="text-left">
            <div className={`text-sm font-bold ${rightScore >= 60 ? 'text-green-600' : 'text-red-600'}`}>
              {rightCount > 0 ? `${rightScore}%` : '-'}
            </div>
            <div className="text-xs text-gray-400">{rightCount} promesses</div>
          </div>

          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Left details */}
            <div className="space-y-1">
              <div className="font-medium text-gray-700">{leftName}</div>
              {leftCount > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" /> {leftMetrics?.kept_count || 0} tenues
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Minus className="h-3 w-3" /> {leftMetrics?.partial_count || 0} partielles
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <X className="h-3 w-3" /> {leftMetrics?.broken_count || 0} non tenues
                  </div>
                </>
              ) : (
                <div className="text-gray-400">Pas de données</div>
              )}
            </div>

            {/* Right details */}
            <div className="space-y-1">
              <div className="font-medium text-gray-700">{rightName}</div>
              {rightCount > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" /> {rightMetrics?.kept_count || 0} tenues
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Minus className="h-3 w-3" /> {rightMetrics?.partial_count || 0} partielles
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <X className="h-3 w-3" /> {rightMetrics?.broken_count || 0} non tenues
                  </div>
                </>
              ) : (
                <div className="text-gray-400">Pas de données</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Warnings List
function WarningsList({
  name,
  flags,
  color
}: {
  name: string
  flags: CoreValueProfile['greenwashing_flags']
  color: 'blue' | 'purple'
}) {
  const borderColor = color === 'blue' ? 'border-blue-200' : 'border-purple-200'

  return (
    <div className={`p-3 rounded-lg border ${borderColor}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">{name}</div>
      {flags.length > 0 ? (
        <div className="space-y-1">
          {flags.map((flag, index) => (
            <div
              key={index}
              className={`text-xs p-2 rounded ${
                flag.severity === 'high' ? 'bg-red-50 text-red-700' :
                flag.severity === 'medium' ? 'bg-orange-50 text-orange-700' :
                'bg-yellow-50 text-yellow-700'
              }`}
            >
              {flag.description}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" /> Aucune alerte
        </div>
      )}
    </div>
  )
}

// Comparison Verdict
function ComparisonVerdict({
  leftProfile,
  rightProfile,
  leftName,
  rightName
}: {
  leftProfile: CoreValueProfile
  rightProfile: CoreValueProfile
  leftName: string
  rightName: string
}) {
  // Calculate overall scores
  const leftAuth = leftProfile.authenticity_score || 0
  const rightAuth = rightProfile.authenticity_score || 0
  const leftWarnings = leftProfile.greenwashing_flags.length
  const rightWarnings = rightProfile.greenwashing_flags.length

  // Calculate average consistency
  const getAverageConsistency = (profile: CoreValueProfile) => {
    const values = Object.values(profile.value_metrics).filter(m => m.promise_count > 0)
    if (values.length === 0) return 0
    return values.reduce((sum, m) => sum + m.consistency_score, 0) / values.length
  }

  const leftConsistency = getAverageConsistency(leftProfile)
  const rightConsistency = getAverageConsistency(rightProfile)

  // Determine winner (weighted scoring)
  const leftScore = leftAuth * 0.4 + leftConsistency * 0.4 - leftWarnings * 10
  const rightScore = rightAuth * 0.4 + rightConsistency * 0.4 - rightWarnings * 10

  const winner = leftScore > rightScore + 5 ? 'left' : rightScore > leftScore + 5 ? 'right' : 'tie'

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Verdict</h3>
      <div className="flex items-center justify-center gap-4">
        <div className={`p-4 rounded-lg text-center ${winner === 'left' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'}`}>
          <div className="font-semibold text-gray-900">{leftName}</div>
          <div className="text-sm text-gray-500">{Math.round(leftConsistency)}% cohérence</div>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          {winner === 'tie' ? (
            <span className="text-sm font-medium">Égalité</span>
          ) : (
            <ArrowRight className={`h-6 w-6 ${winner === 'left' ? 'rotate-180' : ''}`} />
          )}
        </div>

        <div className={`p-4 rounded-lg text-center ${winner === 'right' ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-white'}`}>
          <div className="font-semibold text-gray-900">{rightName}</div>
          <div className="text-sm text-gray-500">{Math.round(rightConsistency)}% cohérence</div>
        </div>
      </div>

      {winner !== 'tie' && (
        <p className="text-center text-xs text-gray-500 mt-3">
          Basé sur l&apos;authenticité, la cohérence et les alertes détectées
        </p>
      )}
    </div>
  )
}
