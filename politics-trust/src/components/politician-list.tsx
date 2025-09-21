"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { User, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface Politician {
  id: string
  name: string
  party: string | null
  position: string | null
  image_url: string | null
  bio: string | null
  credibility_score: number
  total_votes: number
  created_at: string
  updated_at: string
}

interface PoliticianListProps {
  onVoteClick: (politicianId: string) => void
}

export function PoliticianList({ onVoteClick }: PoliticianListProps) {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPoliticians() {
      try {
        const { data, error } = await supabase
          .from('politicians')
          .select('*')
          .order('credibility_score', { ascending: false })

        if (error) {
          console.error('Error fetching politicians:', error)
          return
        }

        setPoliticians(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoliticians()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600'
    if (score >= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 150) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 100) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (politicians.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun politicien trouvé
          </h3>
          <p className="text-gray-600">
            La base de données sera bientôt alimentée avec les profils des politiciens français.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {politicians.map((politician) => (
        <Card key={politician.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={politician.image_url || undefined} />
                  <AvatarFallback>
                    {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{politician.name}</CardTitle>
                  {politician.party && (
                    <p className="text-sm text-gray-600">{politician.party}</p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={getScoreBadgeColor(politician.credibility_score)}
              >
                {politician.credibility_score}/200
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {politician.position && (
              <p className="text-sm font-medium text-gray-700">
                {politician.position}
              </p>
            )}

            {politician.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {politician.bio}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Score de crédibilité</span>
                <span className={`font-semibold ${getScoreColor(politician.credibility_score)}`}>
                  {politician.credibility_score}/200
                </span>
              </div>
              <Progress
                value={(politician.credibility_score / 200) * 100}
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{politician.total_votes} votes</span>
              </div>
              <Button
                onClick={() => onVoteClick(politician.id)}
                size="sm"
                variant="outline"
                className="hover:bg-blue-50 hover:border-blue-300"
              >
                Voter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}