"use client"

import { useState, useEffect } from "react"
import { PoliticianCard } from "./politician-card"
import { supabase, type Database } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, SortAsc, SortDesc } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Politician = Database['public']['Tables']['politicians']['Row']

interface PoliticianListProps {
  onVoteClick?: (politicianId: string) => void
}

export function PoliticianList({ onVoteClick }: PoliticianListProps) {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "score" | "votes">("score")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterParty, setFilterParty] = useState<string>("all")

  useEffect(() => {
    fetchPoliticians()
  }, [])

  const fetchPoliticians = async () => {
    try {
      setLoading(true)
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

  const filteredAndSortedPoliticians = politicians
    .filter(politician => {
      const matchesSearch = politician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           politician.party?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           politician.position?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesParty = filterParty === "all" || politician.party === filterParty

      return matchesSearch && matchesParty
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "score":
          comparison = a.credibility_score - b.credibility_score
          break
        case "votes":
          comparison = a.total_votes - b.total_votes
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  const uniqueParties = Array.from(new Set(politicians.map(p => p.party).filter(Boolean)))

  const getScoreStats = () => {
    if (politicians.length === 0) return { avg: 0, highest: 0, lowest: 0 }

    const scores = politicians.map(p => p.credibility_score)
    return {
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest: Math.max(...scores),
      lowest: Math.min(...scores)
    }
  }

  const stats = getScoreStats()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-6 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.avg}</div>
              <div className="text-sm text-muted-foreground">Score Moyen</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.highest}</div>
              <div className="text-sm text-muted-foreground">Score le Plus Élevé</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.lowest}</div>
              <div className="text-sm text-muted-foreground">Score le Plus Bas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un politicien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterParty} onValueChange={setFilterParty}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Parti politique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les partis</SelectItem>
                {uniqueParties.map(party => (
                  <SelectItem key={party} value={party!}>
                    {party}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: "name" | "score" | "votes") => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score de crédibilité</SelectItem>
                <SelectItem value="votes">Nombre de votes</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {filteredAndSortedPoliticians.length} politicien(s) trouvé(s)
          </Badge>
          {searchTerm && (
            <Badge variant="secondary">
              Recherche: "{searchTerm}"
            </Badge>
          )}
          {filterParty !== "all" && (
            <Badge variant="secondary">
              Parti: {filterParty}
            </Badge>
          )}
        </div>
      </div>

      {/* Politicians Grid */}
      {filteredAndSortedPoliticians.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Aucun politicien trouvé</h3>
              <p>Essayez de modifier vos critères de recherche ou de filtrage.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedPoliticians.map((politician) => (
            <PoliticianCard
              key={politician.id}
              politician={politician}
              onVote={onVoteClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}