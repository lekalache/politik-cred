"use client"

import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  source: string
  published_at: string
  relevance_score: number
  keywords: string[]
}

export function NewsBanner() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const response = await fetch('/api/news/articles?limit=8&sortBy=published_at&sortOrder=desc&minRelevance=50')
        if (response.ok) {
          const data = await response.json()
          setNews(data.articles || [])
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Failed to fetch news:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestNews()
    // Refresh news every 10 minutes
    const interval = setInterval(fetchLatestNews, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const published = new Date(dateString)
    const diffMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60))

    if (diffMinutes < 60) return `${diffMinutes}min`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`
    return `${Math.floor(diffMinutes / 1440)}j`
  }

  if (loading) {
    return (
      <div className="bg-[#1E3A8A] text-white py-3 border-b-4 border-[#DC2626]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-lg font-semibold">Chargement des dernières infos politique...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || news.length === 0) {
    return (
      <div className="bg-[#1E3A8A] text-white py-3 border-b-4 border-[#DC2626]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              <span className="text-lg font-semibold">Actualités politique - Système en cours de déploiement</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1E3A8A] text-white border-b-4 border-[#DC2626] relative overflow-hidden">
      {/* Breaking News Label */}
      <div className="absolute left-0 top-0 bottom-0 bg-[#DC2626] flex items-center px-4 z-20">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ACTU</span>
        </div>
      </div>

      {/* Scrolling News Container */}
      <div className="pl-20 py-3 relative">
        <div className="overflow-hidden">
          <div className="flex animate-scroll">
            {/* First set of news items */}
            {news.map((item, index) => (
              <div key={`first-${item.id}`} className="flex items-center whitespace-nowrap mr-12">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-[#FAFAFA]" />
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    {formatTimeAgo(item.published_at)}
                  </span>
                  <div className="w-1 h-1 bg-[#DC2626] rounded-full" />
                  <span className="text-lg font-semibold">{item.title}</span>
                  <div className="w-1 h-1 bg-[#FAFAFA] rounded-full" />
                  <span className="text-sm text-[#FAFAFA] uppercase tracking-wide">
                    {item.source}
                  </span>
                  {item.keywords && item.keywords.length > 0 && (
                    <>
                      <div className="w-1 h-1 bg-[#DC2626] rounded-full" />
                      <span className="text-sm text-[#DC2626] font-medium">
                        #{item.keywords[0]}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Duplicate set for seamless loop */}
            {news.map((item, index) => (
              <div key={`second-${item.id}`} className="flex items-center whitespace-nowrap mr-12">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-[#FAFAFA]" />
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    {formatTimeAgo(item.published_at)}
                  </span>
                  <div className="w-1 h-1 bg-[#DC2626] rounded-full" />
                  <span className="text-lg font-semibold">{item.title}</span>
                  <div className="w-1 h-1 bg-[#FAFAFA] rounded-full" />
                  <span className="text-sm text-[#FAFAFA] uppercase tracking-wide">
                    {item.source}
                  </span>
                  {item.keywords && item.keywords.length > 0 && (
                    <>
                      <div className="w-1 h-1 bg-[#DC2626] rounded-full" />
                      <span className="text-sm text-[#DC2626] font-medium">
                        #{item.keywords[0]}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Politik Cred Brand on the right */}
      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#1E3A8A] via-[#1E3A8A] to-transparent flex items-center pr-4 z-20">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-[#FAFAFA]">Politik</span>
          <span className="text-sm font-bold text-[#DC2626]">Cred'</span>
          <div className="w-2 h-2 bg-[#DC2626] rounded-full" />
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-scroll {
          animation: scroll 120s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}