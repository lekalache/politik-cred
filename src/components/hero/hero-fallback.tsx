"use client"

interface HeroFallbackProps {
  className?: string
}

export function HeroFallback({ className = '' }: HeroFallbackProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Animated gradient background - dark mode */}
      <div
        className="absolute inset-0 animate-gradient-shift dark:block hidden"
        style={{
          background: `
            linear-gradient(
              135deg,
              #1E3A8A 0%,
              #1E3A8A 25%,
              #2a2a3a 40%,
              #2a2a3a 60%,
              #DC2626 75%,
              #DC2626 100%
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite'
        }}
      />

      {/* Animated gradient background - light mode */}
      <div
        className="absolute inset-0 animate-gradient-shift dark:hidden block"
        style={{
          background: `
            linear-gradient(
              135deg,
              #3B82F6 0%,
              #3B82F6 25%,
              #f0f0f5 40%,
              #f0f0f5 60%,
              #DC2626 75%,
              #DC2626 100%
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite'
        }}
      />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-10 dark:opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Hemicycle silhouette shape */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 400 200"
          className="w-full max-w-4xl h-auto opacity-20"
          style={{ filter: 'blur(1px)' }}
        >
          {/* Generate rows of dots forming hemicycle */}
          {Array.from({ length: 8 }).map((_, rowIndex) => {
            const radius = 60 + rowIndex * 15
            const numDots = 20 + rowIndex * 5
            const startAngle = Math.PI * 0.1
            const angleSpan = Math.PI * 0.8

            return Array.from({ length: numDots }).map((_, dotIndex) => {
              const angle = startAngle + (dotIndex / (numDots - 1)) * angleSpan
              const x = 200 + Math.cos(angle) * radius
              const y = 180 - Math.sin(angle) * radius

              return (
                <circle
                  key={`${rowIndex}-${dotIndex}`}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="white"
                  opacity={0.5 + Math.random() * 0.5}
                />
              )
            })
          })}
        </svg>
      </div>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />

      {/* CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  )
}
