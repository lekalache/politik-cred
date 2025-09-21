"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase, type Database } from "@/lib/supabase"
import {
  ThumbsUp,
  ThumbsDown,
  Link2,
  FileText,
  Video,
  File,
  AlertCircle,
  CheckCircle,
  Star,
  Shield
} from "lucide-react"

type Politician = Database['public']['Tables']['politicians']['Row']

interface VoteDialogProps {
  politician: Politician
  trigger?: React.ReactNode
  onVoteSubmitted?: () => void
}

export function VoteDialog({ politician, trigger, onVoteSubmitted }: VoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [voteType, setVoteType] = useState<"positive" | "negative" | null>(null)
  const [points, setPoints] = useState(1)
  const [evidenceTitle, setEvidenceTitle] = useState("")
  const [evidenceDescription, setEvidenceDescription] = useState("")
  const [evidenceUrl, setEvidenceUrl] = useState("")
  const [evidenceType, setEvidenceType] = useState<"article" | "video" | "document" | "other">("article")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case "article":
        return <FileText className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "document":
        return <File className="w-4 h-4" />
      default:
        return <Link2 className="w-4 h-4" />
    }
  }

  const handleSubmit = async () => {
    if (!voteType || !evidenceTitle || !evidenceDescription) return

    setIsSubmitting(true)

    try {
      // In a real app, you'd get the user_id from authentication
      // For demo purposes, we'll use a placeholder
      const { error } = await supabase
        .from('votes')
        .insert({
          politician_id: politician.id,
          user_id: null, // Will be set when auth is implemented
          vote_type: voteType,
          points,
          evidence_title: evidenceTitle,
          evidence_description: evidenceDescription,
          evidence_url: evidenceUrl || null,
          evidence_type: evidenceType,
          status: 'pending'
        })

      if (error) {
        console.error('Error submitting vote:', error)
        return
      }

      setSubmitted(true)
      onVoteSubmitted?.()

      // Reset form after a delay
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setVoteType(null)
        setPoints(1)
        setEvidenceTitle("")
        setEvidenceDescription("")
        setEvidenceUrl("")
        setEvidenceType("article")
      }, 2000)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Vote soumis avec succès!</h2>
            <p className="text-muted-foreground">
              Votre vote est en cours de modération et sera bientôt pris en compte.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            Voter pour ce politicien
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={politician.image_url} alt={politician.name} />
              <AvatarFallback>
                {getInitials(politician.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>Voter pour {politician.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {politician.position}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Score Display */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Score Actuel</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {politician.credibility_score}/200
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vote Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de vote</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVoteType("positive")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  voteType === "positive"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ThumbsUp className={`w-6 h-6 ${
                    voteType === "positive" ? "text-green-600" : "text-gray-400"
                  }`} />
                  <div className="text-left">
                    <div className="font-semibold">Vote Positif</div>
                    <div className="text-sm text-muted-foreground">
                      Augmente le score
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setVoteType("negative")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  voteType === "negative"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ThumbsDown className={`w-6 h-6 ${
                    voteType === "negative" ? "text-red-600" : "text-gray-400"
                  }`} />
                  <div className="text-left">
                    <div className="font-semibold">Vote Négatif</div>
                    <div className="text-sm text-muted-foreground">
                      Diminue le score
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {voteType && (
            <>
              {/* Points Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Impact du vote ({points} point{points > 1 ? "s" : ""})
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((point) => (
                    <button
                      key={point}
                      onClick={() => setPoints(point)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        points === point
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex">
                          {[...Array(point)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                points === point ? "text-blue-500 fill-current" : "text-gray-400"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs mt-1">{point}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Plus l'impact est élevé, plus votre preuve doit être solide
                </p>
              </div>

              {/* Evidence Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Preuves à l'appui</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="evidence-title">Titre de la preuve *</Label>
                    <Input
                      id="evidence-title"
                      placeholder="Ex: Déclaration sur l'économie du 15 mars 2024"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-type">Type de preuve</Label>
                    <Select value={evidenceType} onValueChange={(value: any) => setEvidenceType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>Article de presse</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4" />
                            <span>Vidéo</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="document">
                          <div className="flex items-center space-x-2">
                            <File className="w-4 h-4" />
                            <span>Document officiel</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center space-x-2">
                            <Link2 className="w-4 h-4" />
                            <span>Autre</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-url">Lien vers la preuve (optionnel)</Label>
                    <Input
                      id="evidence-url"
                      type="url"
                      placeholder="https://..."
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-description">Description détaillée *</Label>
                    <Textarea
                      id="evidence-description"
                      placeholder="Expliquez en détail les faits qui justifient votre vote. Soyez objectif et factuel."
                      rows={4}
                      value={evidenceDescription}
                      onChange={(e) => setEvidenceDescription(e.target.value)}
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-800 mb-1">
                          Critères de qualité
                        </p>
                        <ul className="text-blue-700 space-y-1">
                          <li>• Fournissez des sources fiables et vérifiables</li>
                          <li>• Restez factuel et objectif</li>
                          <li>• Évitez les opinions personnelles</li>
                          <li>• Respectez les principes de transparence</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!evidenceTitle || !evidenceDescription || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Envoi en cours..." : "Soumettre le vote"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}