"use client"

import { useEffect, useState, useRef } from 'react'
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
  const [error, setError] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const offsetRef = useRef(0)
  const isPausedRef = useRef(false)

  const scrollSpeed = 50 // pixels per second - tuned for readability
  const COPY_COUNT = 2

  // Measure the width of a single sequence so we know when to loop seamlessly
  useEffect(() => {
    const measureWidth = () => {
      if (!trackRef.current) return

      // reset transform before measuring to avoid skewed values
      trackRef.current.style.transform = 'translateX(0px)'
      offsetRef.current = 0

      const totalWidth = trackRef.current.scrollWidth
      const singleSequenceWidth = totalWidth / COPY_COUNT

      if (singleSequenceWidth > 0) {
        setContentWidth(singleSequenceWidth)
      } else {
        requestAnimationFrame(measureWidth)
      }
    }

    if (news.length === 0) {
      setContentWidth(0)
      return
    }

    measureWidth()
    window.addEventListener('resize', measureWidth)

    return () => {
      window.removeEventListener('resize', measureWidth)
    }
  }, [news])

  // Drive the ticker movement using requestAnimationFrame for smooth, speed-based motion
  useEffect(() => {
    if (!trackRef.current || contentWidth === 0) return

    offsetRef.current = 0
    lastTimestampRef.current = null
    trackRef.current.style.transform = 'translateX(0px)'

    const step = (timestamp: number) => {
      if (!trackRef.current) return

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }

      const delta = timestamp - (lastTimestampRef.current ?? timestamp)
      lastTimestampRef.current = timestamp

      if (!isPausedRef.current) {
        const distance = (scrollSpeed * delta) / 1000
        offsetRef.current -= distance

        if (-offsetRef.current >= contentWidth) {
          // Loop seamlessly once the first sequence has completely left the viewport
          offsetRef.current += contentWidth
        }

        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`
      }

      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = null
      lastTimestampRef.current = null
    }
  }, [contentWidth, news])

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        // Get today's date for filtering
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/news/articles?limit=50&sortBy=published_at&sortOrder=desc&minRelevance=30&fromDate=${today}`)
        if (response.ok) {
          const data = await response.json()
          console.log('Fetched news articles:', data.articles.length)
          setNews(data.articles || [])
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Failed to fetch news:', err)
        setError(true)
      }
    }

    fetchLatestNews()
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const published = new Date(dateString)
    const diffMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60))

    if (diffMinutes < 60) return `${diffMinutes}min`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`
    return `${Math.floor(diffMinutes / 1440)}j`
  }

  // Don't show the banner until news is loaded - prevents visual "refresh" effect
  if (news.length === 0 && !error) {
    return <div className="h-12 bg-[#1E3A8A] border-b-4 border-[#DC2626]"></div> // Placeholder with same height
  }

  if (error) {
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
        <div
          className="overflow-hidden"
          onMouseEnter={() => {
            isPausedRef.current = true
          }}
          onMouseLeave={() => {
            isPausedRef.current = false
            lastTimestampRef.current = null
          }}
        >
          <div ref={trackRef} className="flex ticker-track">
            {/* Display all unique articles in one continuous stream */}
            {/* Create enough duplicates for seamless infinite loop */}
            {Array.from({ length: COPY_COUNT }).map((_, copyIndex) =>
              news.map((item) => (
                <div key={`copy-${copyIndex}-${item.id}`} className="flex items-center whitespace-nowrap mr-16">
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
              ))
            )}
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


    </div>
  )
}