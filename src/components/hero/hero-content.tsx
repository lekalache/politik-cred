"use client"

import { useRouter } from 'next/navigation'

interface HeroContentProps {
  className?: string
}

export function HeroContent({ className = '' }: HeroContentProps) {
  const router = useRouter()

  return (
    <div className={`relative z-30 flex flex-col items-center justify-end h-full text-center pb-12 ${className}`}>
      {/* Top logo - floating above the 3D scene */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight drop-shadow-2xl">
          <span className="text-[#3B82F6] dark:text-[#3B82F6]">Politik</span>
          <span className="text-[#DC2626]">Cred&apos;</span>
        </h1>
      </div>

      {/* Bottom content card */}
      <div className="max-w-3xl mx-4 px-8 py-6 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-sm border border-gray-200 dark:border-white/10 shadow-2xl">
        {/* Subtitle */}
        <h2 className="text-lg md:text-2xl font-medium mb-4 text-gray-800 dark:text-white/90">
          Évaluez la crédibilité de vos représentants
        </h2>

        {/* CTA Button */}
        <button
          onClick={() => router.push('/score')}
          className="group relative bg-[#DC2626] hover:bg-[#B91C1C] text-white text-base md:text-lg px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden"
        >
          <span className="relative z-10">Il est crédible lui ?</span>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </button>

        {/* Tagline */}
        <p className="text-sm md:text-base text-gray-600 dark:text-white/70 max-w-xl mx-auto mt-4">
          La vérité sans filtre, la science sans langue de bois
        </p>

        {/* Stats preview - compact */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="text-center">
            <div className="text-xl font-bold text-[#3B82F6]">577</div>
            <div className="text-xs text-gray-500 dark:text-white/50">Députés</div>
          </div>
          <div className="w-px h-8 bg-gray-300 dark:bg-white/20" />
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800 dark:text-white">200K+</div>
            <div className="text-xs text-gray-500 dark:text-white/50">Votes</div>
          </div>
          <div className="w-px h-8 bg-gray-300 dark:bg-white/20" />
          <div className="text-center">
            <div className="text-xl font-bold text-[#DC2626]">100%</div>
            <div className="text-xs text-gray-500 dark:text-white/50">Transparent</div>
          </div>
        </div>
      </div>
    </div>
  )
}
