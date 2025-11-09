import { Eye, ExternalLink, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface VigieBadgeProps {
  vigieUrl?: string
  status?: 'verified_lie' | 'broken_promise' | 'misleading' | 'kept_promise'
  communityVotes?: number
  confidence?: number
}

export function VigieBadge({ vigieUrl, status, communityVotes, confidence }: VigieBadgeProps) {
  if (!vigieUrl) return null

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'verified_lie':
        return {
          label: 'Mensonge vérifié',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: '🚫'
        }
      case 'broken_promise':
        return {
          label: 'Promesse non tenue',
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: '❌'
        }
      case 'misleading':
        return {
          label: 'Trompeur',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: '⚠️'
        }
      case 'kept_promise':
        return {
          label: 'Promesse tenue',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '✅'
        }
      default:
        return {
          label: 'Vérifié',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '🔍'
        }
    }
  }

  const statusInfo = getStatusInfo(status)

  return (
    <div className="space-y-2">
      {/* Main Vigie Badge */}
      <a
        href={vigieUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <Badge
          variant="outline"
          className={`${statusInfo.color} hover:shadow-md transition-shadow cursor-pointer`}
        >
          <Eye className="w-3 h-3 mr-1" />
          <span className="mr-1">{statusInfo.icon}</span>
          Vigie du mensonge: {statusInfo.label}
          <ExternalLink className="w-3 h-3 ml-1" />
        </Badge>
      </a>

      {/* Community metrics */}
      {(communityVotes || confidence) && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {communityVotes && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {communityVotes} vote{communityVotes > 1 ? 's' : ''} communauté
            </span>
          )}
          {confidence && (
            <span>
              • Confiance: {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Example usage:
 *
 * <VigieBadge
 *   vigieUrl="https://vigiedumensonge.fr/promise/123"
 *   status="broken_promise"
 *   communityVotes={245}
 *   confidence={0.92}
 * />
 */
