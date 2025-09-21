"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

interface ScoreDisplayProps {
  score: number
  maxScore?: number
  showLabel?: boolean
  showProgress?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "detailed"
}

export function ScoreDisplay({
  score,
  maxScore = 200,
  showLabel = true,
  showProgress = true,
  size = "md",
  variant = "default"
}: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100

  const getScoreColor = (score: number) => {
    if (score >= 150) return {
      text: "text-green-600",
      bg: "bg-green-100",
      border: "border-green-200",
      progress: "bg-green-500"
    }
    if (score >= 120) return {
      text: "text-blue-600",
      bg: "bg-blue-100",
      border: "border-blue-200",
      progress: "bg-blue-500"
    }
    if (score >= 100) return {
      text: "text-gray-600",
      bg: "bg-gray-100",
      border: "border-gray-200",
      progress: "bg-gray-500"
    }
    if (score >= 80) return {
      text: "text-yellow-600",
      bg: "bg-yellow-100",
      border: "border-yellow-200",
      progress: "bg-yellow-500"
    }
    if (score >= 50) return {
      text: "text-orange-600",
      bg: "bg-orange-100",
      border: "border-orange-200",
      progress: "bg-orange-500"
    }
    return {
      text: "text-red-600",
      bg: "bg-red-100",
      border: "border-red-200",
      progress: "bg-red-500"
    }
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

  const getScoreIcon = (score: number) => {
    if (score >= 150) return <Shield className="w-5 h-5 text-green-600" />
    if (score >= 100) return <Shield className="w-5 h-5 text-blue-600" />
    if (score >= 50) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <AlertTriangle className="w-5 h-5 text-red-600" />
  }

  const colors = getScoreColor(score)
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  }

  if (variant === "detailed") {
    return (
      <Card className={`${colors.border} border-2`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getScoreIcon(score)}
                <span className="font-semibold">Score de Crédibilité</span>
              </div>
              <div className="text-right">
                <div className={`${sizeClasses[size]} font-bold ${colors.text}`}>
                  {score}
                </div>
                <div className="text-sm text-muted-foreground">/ {maxScore}</div>
              </div>
            </div>

            {showProgress && (
              <div className="space-y-2">
                <Progress
                  value={percentage}
                  className="h-3"
                  style={{
                    background: '#e2e8f0'
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>{maxScore}</span>
                </div>
              </div>
            )}

            {showLabel && (
              <div className="flex items-center justify-between">
                <Badge className={`${colors.bg} ${colors.text} border-0`}>
                  {getScoreLabel(score)}
                </Badge>
                <div className="flex items-center space-x-2">
                  {score > 100 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : score < 100 ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {score > 100 ? "Au-dessus" : score < 100 ? "En-dessous" : "Égal"} de la moyenne
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <div className={`${sizeClasses[size]} font-bold ${colors.text}`}>
        {score}
      </div>

      {showProgress && (
        <div className="flex-1 space-y-1">
          <Progress
            value={percentage}
            className="h-2"
          />
          {showLabel && (
            <Badge variant="outline" className={`${colors.bg} ${colors.text} text-xs`}>
              {getScoreLabel(score)}
            </Badge>
          )}
        </div>
      )}

      {!showProgress && showLabel && (
        <Badge className={`${colors.bg} ${colors.text} border-0`}>
          {getScoreLabel(score)}
        </Badge>
      )}
    </div>
  )
}