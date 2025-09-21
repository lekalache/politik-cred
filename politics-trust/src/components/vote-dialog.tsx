"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AuthDialog } from '@/components/auth/auth-dialog'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  FileText,
  Video,
  File,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface VoteDialogProps {
  politicianId: string | null
  onClose: () => void
}

interface VoteFormData {
  vote_type: 'positive' | 'negative'
  points: number
  category: 'integrity' | 'competence' | 'transparency' | 'consistency' | 'leadership' | 'other'
  evidence_title: string
  evidence_description: string
  evidence_url: string
  evidence_type: 'article' | 'video' | 'document' | 'social_media' | 'speech' | 'interview' | 'other'
  source_credibility: number
  tags: string[]
}

export function VoteDialog({ politicianId, onClose }: VoteDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<VoteFormData>({
    vote_type: 'positive',
    points: 5,
    category: 'integrity',
    evidence_title: '',
    evidence_description: '',
    evidence_url: '',
    evidence_type: 'article',
    source_credibility: 7,
    tags: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  if (!politicianId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if user is authenticated
    if (!user) {
      setShowAuthDialog(true)
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // First ensure the user exists in the users table
      const { error: userError } = await supabase.rpc('ensure_user_exists', {
        user_id: user.id
      })

      if (userError) {
        console.error('Error ensuring user exists:', userError)
        setSubmitStatus('error')
        return
      }

      // Now submit the vote
      const { error } = await supabase
        .from('votes')
        .insert([{
          ...formData,
          politician_id: politicianId,
          user_id: user.id
        }])

      if (error) {
        console.error('Error submitting vote:', error)
        setSubmitStatus('error')
        return
      }

      setSubmitStatus('success')
      setTimeout(() => {
        onClose()
        setSubmitStatus('idle')
        setFormData({
          vote_type: 'positive',
          points: 5,
          category: 'integrity',
          evidence_title: '',
          evidence_description: '',
          evidence_url: '',
          evidence_type: 'article',
          source_credibility: 7,
          tags: []
        })
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'document': return <File className="w-4 h-4" />
      default: return <ExternalLink className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={!!politicianId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Soumettre un vote avec preuves</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Modération requise
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {submitStatus === 'success' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Vote soumis avec succès!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Votre vote sera examiné par nos modérateurs avant d&apos;être pris en compte.
              </p>
            </CardContent>
          </Card>
        )}

        {submitStatus === 'error' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Erreur lors de la soumission</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Une erreur s&apos;est produite. Veuillez réessayer.
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vote Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de vote</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-colors ${
                  formData.vote_type === 'positive'
                    ? 'border-green-300 bg-green-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, vote_type: 'positive' }))}
              >
                <CardContent className="p-4 text-center">
                  <ThumbsUp className={`w-8 h-8 mx-auto mb-2 ${
                    formData.vote_type === 'positive' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">Vote positif</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Améliore la crédibilité
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-colors ${
                  formData.vote_type === 'negative'
                    ? 'border-red-300 bg-red-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, vote_type: 'negative' }))}
              >
                <CardContent className="p-4 text-center">
                  <ThumbsDown className={`w-8 h-8 mx-auto mb-2 ${
                    formData.vote_type === 'negative' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">Vote négatif</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Diminue la crédibilité
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Points Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Impact du vote ({formData.points} points)
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 3, 5, 7, 10].map((points) => (
                <Button
                  key={points}
                  type="button"
                  variant={formData.points === points ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, points }))}
                >
                  {points}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Plus l&apos;impact est important, plus les preuves doivent être solides.
            </p>
          </div>

          {/* Vote Category */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Catégorie du vote</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'integrity', label: 'Intégrité' },
                { value: 'competence', label: 'Compétence' },
                { value: 'transparency', label: 'Transparence' },
                { value: 'consistency', label: 'Cohérence' },
                { value: 'leadership', label: 'Leadership' },
                { value: 'other', label: 'Autre' }
              ].map((category) => (
                <Button
                  key={category.value}
                  type="button"
                  variant={formData.category === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, category: category.value as VoteFormData['category'] }))}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Evidence Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de preuve</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'article', label: 'Article de presse', icon: 'article' },
                { value: 'video', label: 'Vidéo', icon: 'video' },
                { value: 'document', label: 'Document officiel', icon: 'document' },
                { value: 'social_media', label: 'Réseaux sociaux', icon: 'other' },
                { value: 'speech', label: 'Discours', icon: 'other' },
                { value: 'interview', label: 'Interview', icon: 'video' },
                { value: 'other', label: 'Autre', icon: 'other' }
              ].map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={formData.evidence_type === type.value ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, evidence_type: type.value as VoteFormData['evidence_type'] }))}
                >
                  {getEvidenceIcon(type.icon)}
                  <span className="ml-2">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Source Credibility */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Crédibilité de la source ({formData.source_credibility}/10)
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {[2, 4, 6, 8, 10].map((credibility) => (
                <Button
                  key={credibility}
                  type="button"
                  variant={formData.source_credibility === credibility ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, source_credibility: credibility }))}
                >
                  {credibility}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Évaluez la fiabilité de votre source (2: peu fiable, 10: très fiable)
            </p>
          </div>

          {/* Evidence Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="evidence_title" className="text-base font-semibold">
                Titre de la preuve *
              </Label>
              <input
                id="evidence_title"
                type="text"
                required
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Déclaration publique lors du débat du 15 janvier 2024"
                value={formData.evidence_title}
                onChange={(e) => setFormData(prev => ({ ...prev, evidence_title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="evidence_description" className="text-base font-semibold">
                Description de la preuve *
              </Label>
              <textarea
                id="evidence_description"
                required
                rows={4}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Décrivez en détail la preuve et son contexte. Soyez objectif et factuel."
                value={formData.evidence_description}
                onChange={(e) => setFormData(prev => ({ ...prev, evidence_description: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="evidence_url" className="text-base font-semibold">
                Lien vers la preuve
              </Label>
              <input
                id="evidence_url"
                type="url"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://exemple.com/article-ou-video"
                value={formData.evidence_url}
                onChange={(e) => setFormData(prev => ({ ...prev, evidence_url: e.target.value }))}
              />
            </div>
          </div>

          {/* Legal Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Engagement de responsabilité</p>
                  <p>
                    En soumettant ce vote, vous certifiez que les informations sont exactes
                    et vérifiables. Tout contenu diffamatoire ou mensonger peut engager votre
                    responsabilité légale selon la législation française.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.evidence_title || !formData.evidence_description}
              className="flex-1"
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre le vote'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        defaultMode="signup"
      />
    </Dialog>
  )
}