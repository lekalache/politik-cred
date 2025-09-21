"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Users, Shield, Clock } from "lucide-react"

interface PoliticianCardProps {
  politician: {
    id: string
    name: string
    party?: string
    position?: string
    image_url?: string
    bio?: string
    credibility_score: number
    total_votes: number
    created_at: string
  }
  onVote?: (politicianId: string) => void
}

export function PoliticianCard({ politician, onVote }: PoliticianCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 150) return "text-green-600"
    if (score >= 100) return "text-blue-600"
    if (score >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 180) return "Très Fiable"
    if (score >= 150) return "Fiable"
    if (score >= 120) return "Plutôt Fiable"
    if (score >= 100) return "Neutre"
    if (score >= 80) return "Peu Fiable"
    if (score >= 50) return "Douteux"
    return "Non Fiable"
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const scorePercentage = (politician.credibility_score / 200) * 100

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={politician.image_url} alt={politician.name} />
            <AvatarFallback className="text-lg">
              {getInitials(politician.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold truncate">
              {politician.name}
            </CardTitle>
            {politician.position && (
              <p className="text-sm text-muted-foreground mt-1">
                {politician.position}
              </p>
            )}
            {politician.party && (
              <Badge variant="outline" className="mt-2">
                {politician.party}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Credibility Score Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">Score de Crédibilité</span>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(politician.credibility_score)}`}>
                {politician.credibility_score}
              </div>
              <div className="text-xs text-muted-foreground">/ 200</div>
            </div>
          </div>

          <div className="space-y-2">
            <Progress
              value={scorePercentage}
              className="h-3"
            />
            <div className="flex justify-between items-center">
              <Badge
                variant={politician.credibility_score >= 100 ? "default" : "secondary"}
                className={politician.credibility_score >= 100 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {getScoreLabel(politician.credibility_score)}
              </Badge>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{politician.total_votes} votes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Trend Indicators */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div className="text-xs">
              <div className="font-semibold text-green-800">Votes +</div>
              <div className="text-green-600">En attente</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <div className="text-xs">
              <div className="font-semibold text-red-800">Votes -</div>
              <div className="text-red-600">En attente</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {politician.bio && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Biographie</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {politician.bio}
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-2 border-t">
          <Clock className="w-4 h-4" />
          <span>
            Mis à jour le {new Date(politician.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>

        {/* Vote Button */}
        {onVote && (
          <button
            onClick={() => onVote(politician.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Voter pour ce politicien
          </button>
        )}
      </CardContent>
    </Card>
  )
}