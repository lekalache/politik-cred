"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  User,
  Calendar,
  Search,
  Filter,
  X,
  ChevronDown,
  ArrowUpDown,
  Users,
  TrendingUp,
  ExternalLink
} from 'lucide-react'

interface Politician {
  id: string
  name: string
  party: string | null
  position: string | null
  image_url: string | null
  bio: string | null
  credibility_score: number
  ai_score?: number | null
  total_votes: number
  created_at: string
  updated_at: string
  promises_kept?: number
  promises_broken?: number
  promises_partial?: number
}

type SortOption = 'score_desc' | 'score_asc' | 'name_asc' | 'name_desc' | 'ai_score_desc'

const ITEMS_PER_PAGE = 24

export function PoliticianList() {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParty, setSelectedParty] = useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('score_desc')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)

  useEffect(() => {
    async function fetchPoliticians() {
      try {
        const { data: politiciansData, error: polError } = await supabase
          .from('politicians')
          .select('*')
          .order('credibility_score', { ascending: false })

        if (polError) {
          console.error('Error fetching politicians:', polError)
          return
        }

        const { data: scoresData } = await supabase
          .from('consistency_scores')
          .select('politician_id, promises_kept, promises_broken, promises_partial')

        const mergedData = politiciansData?.map(pol => {
          const scores = scoresData?.find(s => s.politician_id === pol.id)
          return {
            ...pol,
            promises_kept: scores?.promises_kept || 0,
            promises_broken: scores?.promises_broken || 0,
            promises_partial: scores?.promises_partial || 0
          }
        }) || []

        setPoliticians(mergedData)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoliticians()
  }, [])

  // Get unique parties and positions for filters
  const parties = useMemo(() => {
    const partySet = new Set(politicians.map(p => p.party).filter(Boolean))
    return Array.from(partySet).sort() as string[]
  }, [politicians])

  const positions = useMemo(() => {
    const positionSet = new Set(politicians.map(p => p.position).filter(Boolean))
    return Array.from(positionSet).sort() as string[]
  }, [politicians])

  // Filter and sort politicians
  const filteredPoliticians = useMemo(() => {
    let result = [...politicians]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.party?.toLowerCase().includes(query) ||
        p.position?.toLowerCase().includes(query)
      )
    }

    // Party filter
    if (selectedParty) {
      result = result.filter(p => p.party === selectedParty)
    }

    // Position filter
    if (selectedPosition) {
      result = result.filter(p => p.position === selectedPosition)
    }

    // Sort
    switch (sortBy) {
      case 'score_desc':
        result.sort((a, b) => b.credibility_score - a.credibility_score)
        break
      case 'score_asc':
        result.sort((a, b) => a.credibility_score - b.credibility_score)
        break
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'ai_score_desc':
        result.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
        break
    }

    return result
  }, [politicians, searchQuery, selectedParty, selectedPosition, sortBy])

  // Paginated results
  const paginatedPoliticians = useMemo(() => {
    return filteredPoliticians.slice(0, displayCount)
  }, [filteredPoliticians, displayCount])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [searchQuery, selectedParty, selectedPosition, sortBy])

  const loadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  const hasMore = displayCount < filteredPoliticians.length

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedParty(null)
    setSelectedPosition(null)
    setSortBy('score_desc')
  }

  const hasActiveFilters = searchQuery || selectedParty || selectedPosition || sortBy !== 'score_desc'

  const getScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600 dark:text-green-400'
    if (score >= 100) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 150) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
    if (score >= 100) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
  }

  const getPartyColor = (party: string | null) => {
    if (!party) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    const partyLower = party.toLowerCase()
    if (partyLower.includes('renaissance') || partyLower.includes('ensemble') || partyLower.includes('modem'))
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    if (partyLower.includes('républicain') || partyLower.includes('lr'))
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    if (partyLower.includes('rassemblement national') || partyLower.includes('rn'))
      return 'bg-indigo-900 text-white dark:bg-indigo-800'
    if (partyLower.includes('socialiste') || partyLower.includes('ps'))
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
    if (partyLower.includes('insoumis') || partyLower.includes('lfi') || partyLower.includes('nupes'))
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    if (partyLower.includes('écologi') || partyLower.includes('eelv') || partyLower.includes('vert'))
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (partyLower.includes('communiste') || partyLower.includes('pcf'))
      return 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Search skeleton */}
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-lg dark:shadow-black/20 border dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher par nom, parti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-12 px-4 ${showFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {hasActiveFilters && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs">
                {[selectedParty, selectedPosition, sortBy !== 'score_desc'].filter(Boolean).length + (searchQuery ? 1 : 0)}
              </Badge>
            )}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="pt-4 border-t dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Party Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Parti politique
                </label>
                <select
                  value={selectedParty || ''}
                  onChange={(e) => setSelectedParty(e.target.value || null)}
                  className="w-full h-10 px-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les partis</option>
                  {parties.map(party => (
                    <option key={party} value={party}>{party}</option>
                  ))}
                </select>
              </div>

              {/* Position Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Fonction
                </label>
                <select
                  value={selectedPosition || ''}
                  onChange={(e) => setSelectedPosition(e.target.value || null)}
                  className="w-full h-10 px-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les fonctions</option>
                  {positions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <ArrowUpDown className="w-4 h-4 inline mr-1" />
                  Trier par
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full h-10 px-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="score_desc">Score (décroissant)</option>
                  <option value="score_asc">Score (croissant)</option>
                  <option value="ai_score_desc">Score IA (décroissant)</option>
                  <option value="name_asc">Nom (A-Z)</option>
                  <option value="name_desc">Nom (Z-A)</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredPoliticians.length} résultat{filteredPoliticians.length !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Party Filter Chips */}
        {!showFilters && parties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 py-1">Filtres rapides:</span>
            {parties.slice(0, 6).map(party => (
              <button
                key={party}
                onClick={() => setSelectedParty(selectedParty === party ? null : party)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedParty === party
                    ? 'bg-blue-600 text-white'
                    : `${getPartyColor(party)} hover:opacity-80`
                }`}
              >
                {party}
              </button>
            ))}
            {parties.length > 6 && (
              <button
                onClick={() => setShowFilters(true)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                +{parties.length - 6} autres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Affichage de <span className="font-semibold">{paginatedPoliticians.length}</span> sur{' '}
          <span className="font-semibold">{filteredPoliticians.length}</span> politicien{filteredPoliticians.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtré)'}
        </p>
      </div>

      {/* Politicians Grid */}
      {filteredPoliticians.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Aucun résultat trouvé
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Essayez de modifier vos critères de recherche
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedPoliticians.map((politician) => (
            <Link href={`/politicians/${politician.id}`} key={politician.id}>
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={politician.image_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                          {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg leading-tight">{politician.name}</CardTitle>
                        {politician.party && (
                          <Badge variant="secondary" className={`mt-1 text-xs ${getPartyColor(politician.party)}`}>
                            {politician.party}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getScoreBadgeColor(politician.credibility_score)} font-bold`}
                    >
                      {politician.credibility_score}/200
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {politician.position && (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {politician.position}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Score de crédibilité</span>
                      <span className={`font-semibold ${getScoreColor(politician.credibility_score)}`}>
                        {politician.credibility_score}/200
                      </span>
                    </div>
                    <Progress
                      value={(politician.credibility_score / 200) * 100}
                      className="h-2"
                    />
                  </div>

                  {politician.ai_score !== null && politician.ai_score !== undefined && (
                    <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-700 dark:text-indigo-400 font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Score IA (Audit)
                        </span>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                          {politician.ai_score}/100
                        </span>
                      </div>
                      <div className="w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${politician.ai_score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {(politician.promises_kept || 0) + (politician.promises_broken || 0) + (politician.promises_partial || 0)} promesses
                    </span>
                    <span className="flex items-center text-blue-600 dark:text-blue-400">
                      Voir le profil
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            variant="outline"
            size="lg"
            className="px-8"
          >
            Charger plus ({filteredPoliticians.length - displayCount} restants)
          </Button>
        </div>
      )}
    </div>
  )
}
