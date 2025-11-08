'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Edit,
  Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Promise {
  id: string
  politician_id: string
  promise_text: string
  promise_date: string
  category: string
  source_url: string
  source_type: string
  extraction_method: string
  confidence_score: number
  verification_status: string
  is_actionable: boolean
  created_at: string
  politician?: {
    name: string
    party: string
  }
}

interface PromiseCardProps {
  promise: Promise
  onUpdate: () => void
  userRole: string | null
}

export function PromiseCard({ promise, onUpdate, userRole }: PromiseCardProps) {
  const [updating, setUpdating] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'actionable':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'non_actionable':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'disputed':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Vérifiée'
      case 'pending':
        return 'En Attente'
      case 'actionable':
        return 'Vérifiable'
      case 'non_actionable':
        return 'Non Vérifiable'
      case 'disputed':
        return 'Contestée'
      default:
        return status
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      economic: 'Économie',
      social: 'Social',
      environmental: 'Environnement',
      security: 'Sécurité',
      healthcare: 'Santé',
      education: 'Éducation',
      justice: 'Justice',
      immigration: 'Immigration',
      foreign_policy: 'International',
      other: 'Autre'
    }
    return labels[category] || category
  }

  const getSourceTypeLabel = (sourceType: string) => {
    const labels: Record<string, string> = {
      campaign_site: 'Site de campagne',
      interview: 'Interview',
      social_media: 'Réseaux sociaux',
      debate: 'Débat',
      press_release: 'Communiqué de presse',
      manifesto: 'Programme',
      other: 'Autre'
    }
    return labels[sourceType] || sourceType
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette promesse ?')) {
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('political_promises')
        .delete()
        .eq('id', promise.id)

      if (error) throw error

      onUpdate()
    } catch (error) {
      console.error('Error deleting promise:', error)
      alert('Erreur lors de la suppression de la promesse')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('political_promises')
        .update({ verification_status: newStatus })
        .eq('id', promise.id)

      if (error) throw error

      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={getStatusColor(promise.verification_status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(promise.verification_status)}
                  {getStatusLabel(promise.verification_status)}
                </span>
              </Badge>
              <Badge variant="outline">
                <Tag className="w-3 h-3 mr-1" />
                {getCategoryLabel(promise.category)}
              </Badge>
              {promise.is_actionable && (
                <Badge variant="outline" className="bg-blue-50">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Vérifiable
                </Badge>
              )}
              {promise.confidence_score && (
                <Badge variant="outline" className="bg-gray-50">
                  Confiance: {(promise.confidence_score * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-relaxed">
              "{promise.promise_text}"
            </CardTitle>
          </div>
          {userRole === 'admin' && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={updating}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Meta Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {promise.politician && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span>
                  <strong>{promise.politician.name}</strong>
                  {promise.politician.party && (
                    <span className="text-gray-500"> ({promise.politician.party})</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              {new Date(promise.promise_date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Tag className="w-4 h-4 text-gray-400" />
              Source: {getSourceTypeLabel(promise.source_type)}
            </div>
            {promise.source_url && (
              <div className="flex items-center gap-2">
                <a
                  href={promise.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la source
                </a>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          {userRole === 'admin' && promise.verification_status === 'pending' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus('verified')}
                disabled={updating}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Marquer comme vérifiée
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus('non_actionable')}
                disabled={updating}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                Non vérifiable
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
