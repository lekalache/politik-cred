'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Calendar,
  Link as LinkIcon,
  Tag
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { promiseClassifier } from '@/lib/promise-extraction/promise-classifier'

interface Politician {
  id: string
  name: string
  party: string
}

interface PromiseSubmissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PromiseSubmissionDialog({
  open,
  onOpenChange,
  onSuccess
}: PromiseSubmissionDialogProps) {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [selectedPoliticianId, setSelectedPoliticianId] = useState<string>('')
  const [promiseText, setPromiseText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceType, setSourceType] = useState<string>('interview')
  const [promiseDate, setPromiseDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<{
    category: string
    isActionable: boolean
    confidence: number
  } | null>(null)

  useEffect(() => {
    if (open) {
      fetchPoliticians()
      // Set today's date as default
      setPromiseDate(new Date().toISOString().split('T')[0])
    }
  }, [open])

  useEffect(() => {
    // Auto-detect promise characteristics when text changes
    if (promiseText.length > 20) {
      const { isPromise, confidence } = promiseClassifier.isPromise(promiseText)
      if (isPromise) {
        const category = promiseClassifier.categorize(promiseText)
        const isActionable = promiseClassifier.isActionable(promiseText)
        setAutoDetectedInfo({ category, isActionable, confidence })
      } else {
        setAutoDetectedInfo(null)
      }
    }
  }, [promiseText])

  const fetchPoliticians = async () => {
    try {
      const { data, error } = await supabase
        .from('politicians')
        .select('id, name, party')
        .order('name')

      if (error) throw error
      setPoliticians(data || [])
    } catch (error) {
      console.error('Error fetching politicians:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate
      if (!selectedPoliticianId) {
        throw new Error('Veuillez sélectionner un politicien')
      }
      if (!promiseText.trim()) {
        throw new Error('Veuillez entrer le texte de la promesse')
      }
      if (!sourceUrl.trim()) {
        throw new Error('Veuillez entrer l\'URL de la source')
      }
      if (!promiseDate) {
        throw new Error('Veuillez entrer la date de la promesse')
      }

      // Analyze promise
      const { isPromise, confidence } = promiseClassifier.isPromise(promiseText)

      if (!isPromise) {
        if (!confirm('Le texte ne semble pas contenir une promesse claire. Voulez-vous continuer quand même ?')) {
          setLoading(false)
          return
        }
      }

      const category = promiseClassifier.categorize(promiseText)
      const isActionable = promiseClassifier.isActionable(promiseText)

      // Insert promise
      const { error: insertError } = await supabase
        .from('political_promises')
        .insert({
          politician_id: selectedPoliticianId,
          promise_text: promiseText.trim(),
          promise_date: promiseDate,
          category,
          source_url: sourceUrl.trim(),
          source_type: sourceType,
          extraction_method: 'manual',
          confidence_score: confidence,
          verification_status: 'pending',
          is_actionable: isActionable
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedPoliticianId('')
    setPromiseText('')
    setSourceUrl('')
    setSourceType('interview')
    setPromiseDate('')
    setError(null)
    setSuccess(false)
    setAutoDetectedInfo(null)
    onOpenChange(false)
  }

  const categories = [
    { value: 'economic', label: 'Économie' },
    { value: 'social', label: 'Social' },
    { value: 'environmental', label: 'Environnement' },
    { value: 'security', label: 'Sécurité' },
    { value: 'healthcare', label: 'Santé' },
    { value: 'education', label: 'Éducation' },
    { value: 'justice', label: 'Justice' },
    { value: 'immigration', label: 'Immigration' },
    { value: 'foreign_policy', label: 'International' },
    { value: 'other', label: 'Autre' }
  ]

  const sourceTypes = [
    { value: 'interview', label: 'Interview' },
    { value: 'campaign_site', label: 'Site de campagne' },
    { value: 'social_media', label: 'Réseaux sociaux' },
    { value: 'debate', label: 'Débat' },
    { value: 'press_release', label: 'Communiqué de presse' },
    { value: 'manifesto', label: 'Programme' },
    { value: 'other', label: 'Autre' }
  ]

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Ajouter une Promesse Politique
          </DialogTitle>
          <DialogDescription>
            Ajoutez une promesse faite par un politicien pour la suivre et la vérifier
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Promesse ajoutée avec succès !
              </h3>
              <p className="text-green-700">
                La promesse a été enregistrée et sera vérifiée contre les actions parlementaires.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Politician Selection */}
            <div className="space-y-2">
              <Label htmlFor="politician" className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Politicien
              </Label>
              <Select
                value={selectedPoliticianId}
                onValueChange={setSelectedPoliticianId}
                required
              >
                <SelectTrigger id="politician">
                  <SelectValue placeholder="Sélectionner un politicien" />
                </SelectTrigger>
                <SelectContent>
                  {politicians.map((politician) => (
                    <SelectItem key={politician.id} value={politician.id}>
                      {politician.name} {politician.party && `(${politician.party})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Promise Text */}
            <div className="space-y-2">
              <Label htmlFor="promiseText" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Texte de la Promesse
              </Label>
              <Textarea
                id="promiseText"
                value={promiseText}
                onChange={(e) => setPromiseText(e.target.value)}
                placeholder="Ex: Je m'engage à réduire les impôts de 5 milliards d'euros d'ici 2027"
                rows={4}
                required
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Entrez la promesse exacte telle qu'elle a été formulée
              </p>
            </div>

            {/* Auto-detected Info */}
            {autoDetectedInfo && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Détection automatique :</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Catégorie détectée : <strong>{getCategoryLabel(autoDetectedInfo.category)}</strong></li>
                    <li>• {autoDetectedInfo.isActionable ? '✓ Vérifiable' : '✗ Non vérifiable'} (actions parlementaires)</li>
                    <li>• Confiance : {(autoDetectedInfo.confidence * 100).toFixed(0)}%</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="promiseDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Date de la Promesse
              </Label>
              <Input
                id="promiseDate"
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                required
              />
            </div>

            {/* Source URL */}
            <div className="space-y-2">
              <Label htmlFor="sourceUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                URL de la Source
              </Label>
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/interview"
                required
              />
              <p className="text-xs text-gray-500">
                Lien vers l'article, vidéo ou document source
              </p>
            </div>

            {/* Source Type */}
            <div className="space-y-2">
              <Label htmlFor="sourceType" className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                Type de Source
              </Label>
              <Select
                value={sourceType}
                onValueChange={setSourceType}
                required
              >
                <SelectTrigger id="sourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Legal Notice */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Note légale :</strong> Les promesses ajoutées doivent être
                vérifiables et provenir de sources fiables. Les informations seront
                confrontées aux données parlementaires officielles.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter la Promesse'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
