"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { ShareButtons } from '@/components/share-buttons'
import {
  Search,
  X,
  Users,
  TrendingUp,
  Vote,
  Scale,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  ExternalLink
} from 'lucide-react'

interface Politician {
  id: string
  name: string
  party: string | null
  position: string | null
  image_url: string | null
  credibility_score: number
  ai_score: number | null
  total_votes: number
}

interface VoteStats {
  pour: number
  contre: number
  abstention: number
  nonVotant: number
  total: number
}

interface ComparisonData {
  politician: Politician
  voteStats: VoteStats
}

export default function ComparePage() {
  const [allPoliticians, setAllPoliticians] = useState<Politician[]>([])
  const [selectedPoliticians, setSelectedPoliticians] = useState<ComparisonData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)

  // Fetch all politicians on mount
  useEffect(() => {
    async function fetchPoliticians() {
      const { data } = await supabase
        .from('politicians')
        .select('id, name, party, position, image_url, credibility_score, ai_score, total_votes')
        .order('name')

      if (data) {
        setAllPoliticians(data)
      }
      setLoading(false)
    }
    fetchPoliticians()
  }, [])

  // Filter politicians based on search
  const filteredPoliticians = useMemo(() => {
    if (!searchQuery) return allPoliticians.slice(0, 20)
    const query = searchQuery.toLowerCase()
    return allPoliticians
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.party?.toLowerCase().includes(query)
      )
      .slice(0, 20)
  }, [allPoliticians, searchQuery])

  // Fetch vote stats for a politician
  const fetchVoteStats = async (politicianId: string): Promise<VoteStats> => {
    const { data } = await supabase
      .from('parliamentary_actions')
      .select('vote_position')
      .eq('politician_id', politicianId)
      .eq('action_type', 'vote')
      .not('vote_position', 'is', null)

    const stats: VoteStats = { pour: 0, contre: 0, abstention: 0, nonVotant: 0, total: 0 }

    data?.forEach(v => {
      const pos = v.vote_position as string
      if (pos === 'pour') stats.pour++
      else if (pos === 'contre') stats.contre++
      else if (pos === 'abstention') stats.abstention++
      else if (pos === 'nonVotant') stats.nonVotant++
      stats.total++
    })

    return stats
  }

  // Add politician to comparison
  const addPolitician = async (politician: Politician) => {
    if (selectedPoliticians.length >= 3) return
    if (selectedPoliticians.some(p => p.politician.id === politician.id)) return

    setLoadingStats(true)
    const voteStats = await fetchVoteStats(politician.id)

    setSelectedPoliticians(prev => [...prev, { politician, voteStats }])
    setShowSearch(false)
    setSearchQuery('')
    setLoadingStats(false)
  }

  // Remove politician from comparison
  const removePolitician = (id: string) => {
    setSelectedPoliticians(prev => prev.filter(p => p.politician.id !== id))
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600'
    if (score >= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 150) return 'bg-green-100'
    if (score >= 100) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  // Get party color
  const getPartyColor = (party: string | null) => {
    if (!party) return 'bg-gray-100 text-gray-700'
    const partyLower = party.toLowerCase()
    if (partyLower.includes('renaissance') || partyLower.includes('ensemble') || partyLower.includes('modem'))
      return 'bg-yellow-100 text-yellow-800'
    if (partyLower.includes('républicain') || partyLower.includes('lr'))
      return 'bg-blue-100 text-blue-800'
    if (partyLower.includes('rassemblement national') || partyLower.includes('rn'))
      return 'bg-indigo-900 text-white'
    if (partyLower.includes('socialiste') || partyLower.includes('ps'))
      return 'bg-pink-100 text-pink-800'
    if (partyLower.includes('insoumis') || partyLower.includes('lfi'))
      return 'bg-red-100 text-red-800'
    if (partyLower.includes('écologi') || partyLower.includes('eelv'))
      return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Comparer les Politiciens
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Sélectionnez jusqu'à 3 politiciens pour comparer leurs scores, votes et activités parlementaires.
          </p>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Selected Politicians */}
          {selectedPoliticians.map((data, index) => (
            <Card key={data.politician.id} className="relative">
              <button
                onClick={() => removePolitician(data.politician.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <Avatar className="w-20 h-20 mx-auto mb-3">
                    <AvatarImage src={data.politician.image_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-semibold">
                      {data.politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{data.politician.name}</h3>
                  {data.politician.party && (
                    <Badge className={`mt-1 ${getPartyColor(data.politician.party)}`}>
                      {data.politician.party}
                    </Badge>
                  )}
                  {data.politician.position && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.politician.position}</p>
                  )}
                </div>

                {/* Scores */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${getScoreBg(data.politician.credibility_score)}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Score Crédibilité</span>
                      <span className={`text-xl font-bold ${getScoreColor(data.politician.credibility_score)}`}>
                        {data.politician.credibility_score}/200
                      </span>
                    </div>
                  </div>

                  {data.politician.ai_score !== null && (
                    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Score IA</span>
                        <span className="text-xl font-bold text-indigo-600">{data.politician.ai_score}/100</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Link to profile */}
                <Link
                  href={`/politicians/${data.politician.id}`}
                  className="mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  Voir le profil <ExternalLink className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          ))}

          {/* Add Politician Slot */}
          {selectedPoliticians.length < 3 && (
            <Card
              className={`border-2 border-dashed cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors ${showSearch ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-600'}`}
              onClick={() => setShowSearch(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px]">
                {showSearch ? (
                  <div className="w-full space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        autoFocus
                        placeholder="Rechercher un politicien..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {loadingStats ? (
                        <div className="text-center py-4 text-gray-500">Chargement...</div>
                      ) : (
                        filteredPoliticians
                          .filter(p => !selectedPoliticians.some(sp => sp.politician.id === p.id))
                          .map(politician => (
                            <button
                              key={politician.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                addPolitician(politician)
                              }}
                              className="w-full p-2 text-left rounded hover:bg-white dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-600">
                                  {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate dark:text-white">{politician.name}</p>
                                <p className="text-xs text-gray-500 truncate">{politician.party || 'Sans parti'}</p>
                              </div>
                              <Plus className="w-4 h-4 text-blue-600" />
                            </button>
                          ))
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className="w-full"
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Ajouter un politicien</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Cliquez pour rechercher</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty slots */}
          {selectedPoliticians.length < 2 && !showSearch && (
            Array(2 - selectedPoliticians.length).fill(0).map((_, i) => (
              <Card
                key={`empty-${i}`}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                onClick={() => setShowSearch(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px]">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-400 dark:text-gray-500">Emplacement vide</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Comparison Results */}
        {selectedPoliticians.length >= 2 && (
          <div className="space-y-6">
            {/* Vote Statistics Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-blue-600" />
                  Comparaison des Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Métrique</th>
                        {selectedPoliticians.map(data => (
                          <th key={data.politician.id} className="text-center py-3 px-2 font-medium text-gray-900 dark:text-white">
                            {data.politician.name.split(' ').slice(-1)[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-gray-700">
                        <td className="py-3 px-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Votes Pour</span>
                        </td>
                        {selectedPoliticians.map(data => (
                          <td key={data.politician.id} className="text-center py-3 px-2">
                            <span className="font-semibold text-green-600">{data.voteStats.pour}</span>
                            <span className="text-gray-400 text-sm ml-1">
                              ({data.voteStats.total > 0 ? Math.round((data.voteStats.pour / data.voteStats.total) * 100) : 0}%)
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                        <td className="py-3 px-2 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span>Votes Contre</span>
                        </td>
                        {selectedPoliticians.map(data => (
                          <td key={data.politician.id} className="text-center py-3 px-2">
                            <span className="font-semibold text-red-600">{data.voteStats.contre}</span>
                            <span className="text-gray-400 text-sm ml-1">
                              ({data.voteStats.total > 0 ? Math.round((data.voteStats.contre / data.voteStats.total) * 100) : 0}%)
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                        <td className="py-3 px-2 flex items-center gap-2">
                          <MinusCircle className="w-4 h-4 text-yellow-600" />
                          <span>Abstentions</span>
                        </td>
                        {selectedPoliticians.map(data => (
                          <td key={data.politician.id} className="text-center py-3 px-2">
                            <span className="font-semibold text-yellow-600">{data.voteStats.abstention}</span>
                            <span className="text-gray-400 text-sm ml-1">
                              ({data.voteStats.total > 0 ? Math.round((data.voteStats.abstention / data.voteStats.total) * 100) : 0}%)
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <td className="py-3 px-2 font-medium">Total Votes</td>
                        {selectedPoliticians.map(data => (
                          <td key={data.politician.id} className="text-center py-3 px-2 font-bold">
                            {data.voteStats.total}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Visual comparison bars */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Répartition visuelle</h4>
                  {selectedPoliticians.map(data => (
                    <div key={data.politician.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium dark:text-white">{data.politician.name}</span>
                        <span className="text-gray-500">{data.voteStats.total} votes</span>
                      </div>
                      <div className="h-6 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                        {data.voteStats.total > 0 && (
                          <>
                            <div
                              className="bg-green-500 h-full flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${(data.voteStats.pour / data.voteStats.total) * 100}%` }}
                            >
                              {(data.voteStats.pour / data.voteStats.total) * 100 > 10 && `${Math.round((data.voteStats.pour / data.voteStats.total) * 100)}%`}
                            </div>
                            <div
                              className="bg-red-500 h-full flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${(data.voteStats.contre / data.voteStats.total) * 100}%` }}
                            >
                              {(data.voteStats.contre / data.voteStats.total) * 100 > 10 && `${Math.round((data.voteStats.contre / data.voteStats.total) * 100)}%`}
                            </div>
                            <div
                              className="bg-yellow-500 h-full flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${(data.voteStats.abstention / data.voteStats.total) * 100}%` }}
                            >
                              {(data.voteStats.abstention / data.voteStats.total) * 100 > 10 && `${Math.round((data.voteStats.abstention / data.voteStats.total) * 100)}%`}
                            </div>
                            <div
                              className="bg-gray-400 h-full"
                              style={{ width: `${(data.voteStats.nonVotant / data.voteStats.total) * 100}%` }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Pour</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> Contre</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> Abstention</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-400 rounded"></span> Non votant</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Comparaison des Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Credibility Score */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Score de Crédibilité (sur 200)</h4>
                    <div className="space-y-3">
                      {selectedPoliticians
                        .sort((a, b) => b.politician.credibility_score - a.politician.credibility_score)
                        .map((data, index) => (
                          <div key={data.politician.id} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="w-32 text-sm truncate dark:text-white">{data.politician.name}</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  data.politician.credibility_score >= 150 ? 'bg-green-500' :
                                  data.politician.credibility_score >= 100 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${(data.politician.credibility_score / 200) * 100}%` }}
                              />
                            </div>
                            <span className={`w-16 text-right font-bold ${getScoreColor(data.politician.credibility_score)}`}>
                              {data.politician.credibility_score}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* AI Score */}
                  {selectedPoliticians.some(p => p.politician.ai_score !== null) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Score IA (sur 100)</h4>
                      <div className="space-y-3">
                        {selectedPoliticians
                          .filter(p => p.politician.ai_score !== null)
                          .sort((a, b) => (b.politician.ai_score || 0) - (a.politician.ai_score || 0))
                          .map((data, index) => (
                            <div key={data.politician.id} className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="w-32 text-sm truncate dark:text-white">{data.politician.name}</span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div
                                  className="bg-indigo-500 h-full transition-all"
                                  style={{ width: `${data.politician.ai_score || 0}%` }}
                                />
                              </div>
                              <span className="w-16 text-right font-bold text-indigo-600">
                                {data.politician.ai_score}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share Comparison */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Partagez cette comparaison avec vos amis
                  </p>
                  <ShareButtons
                    title={`Comparaison: ${selectedPoliticians.map(p => p.politician.name).join(' vs ')} | Politik Cred'`}
                    description={`Découvrez la comparaison des scores et votes de ${selectedPoliticians.map(p => p.politician.name).join(', ')} sur Politik Cred'`}
                    variant="icons-only"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {selectedPoliticians.length < 2 && (
          <Card className="text-center py-12">
            <CardContent>
              <Scale className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sélectionnez au moins 2 politiciens
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Cliquez sur les emplacements ci-dessus pour ajouter des politiciens à comparer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
