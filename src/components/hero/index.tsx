"use client"

import dynamic from 'next/dynamic'
import { HeroContent } from './hero-content'
import { HeroFallback } from './hero-fallback'

// Dynamically import the 3D scene to avoid SSR issues
const ParliamentScene = dynamic(
  () => import('./parliament-scene').then(mod => ({ default: mod.ParliamentScene })),
  {
    ssr: false,
    loading: () => <HeroFallback />
  }
)

interface ParliamentHeroProps {
  className?: string
}

export function ParliamentHero({ className = '' }: ParliamentHeroProps) {
  return (
    <section className={`relative h-screen w-full overflow-hidden bg-[#0a0a0a] ${className}`}>
      {/* 3D Background - z-10 so it's behind content but visible */}
      <div className="absolute inset-0 z-10">
        <ParliamentScene />
      </div>

      {/* Gradient overlay for depth - z-20 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-20 pointer-events-none" />

      {/* Content overlay - z-30 */}
      <HeroContent />
    </section>
  )
}

export { ParliamentScene } from './parliament-scene'
export { HeroContent } from './hero-content'
export { HeroFallback } from './hero-fallback'
