"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { PoliticianList } from "@/components/politician-list"
import { VoteDialog } from "@/components/vote-dialog"
import { WelcomeBanner } from "@/components/welcome-banner"
import { NewsBanner } from "@/components/news-banner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Users,
  Eye,
  Info,
  Scale,
  CheckCircle
} from "lucide-react"

export default function Home() {
  const [selectedPolitician, setSelectedPolitician] = useState<string | null>(null)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  const handleVoteClick = (politicianId: string) => {
    setSelectedPolitician(politicianId)
  }

  const handleReglementClick = () => {
    router.push('/reglement')
  }

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      console.log('Setting up video...')

      const handleCanPlay = () => {
        console.log('Video can play, attempting to start...')
        video.play().catch((error) => {
          console.log('Video autoplay failed:', error)
          setVideoError(true)
        })
      }

      const handleLoadStart = () => {
        console.log('Video loading started')
      }

      const handleLoadedData = () => {
        console.log('Video loaded successfully')
      }

      const handlePlay = () => {
        console.log('Video started playing')
        setVideoError(false)
      }

      const handleError = (error: Event) => {
        console.log('Video error:', error)
        setVideoError(true)
      }

      video.addEventListener('loadstart', handleLoadStart)
      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('play', handlePlay)
      video.addEventListener('error', handleError)

      // Force load and try to play
      video.load()

      // Try to play after a short delay
      setTimeout(() => {
        video.play().catch((error) => {
          console.log('Delayed video play failed:', error)
          setVideoError(true)
        })
      }, 500)

      return () => {
        video.removeEventListener('loadstart', handleLoadStart)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('error', handleError)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <style jsx>{`
        .text-shadow-lg {max-w-4xl px-4 py-8 rounded-lg bg-black/20 backdrop-blur-sm
          text-shadow: 0 4px 8px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6);
          }
        .text-shadow-md {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6);
        }
      `}</style>
      <Navigation />

      <section className="relative h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-10"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          webkit-playsinline="true"
        >
          <source src="/assets/backgrounds/animated-hemi.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {videoError && (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'url(/assets/backgrounds/hemicycle.png)' }}
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/70 z-20" />

        {/* Content */}
        <div className="relative z-30 flex items-center justify-center h-full text-center text-white ">
          <div className="max-w-4xl px-4 py-8 rounded-lg bg-black/20 backdrop-blur-sm border-2 border-white">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-shadow-lg">

               <span className="text-[#1E3A8A] ">
                Politik
              </span>
              <span className="text-[#DC2626]">
                Cred'
              </span>


            </h1>
            <h2 className="text-2xl md:text-4xl font-semibold mb-8 text-shadow-md">
              Évaluez la crédibilité de vos représentants
            </h2>
            <button
              onClick={handleReglementClick}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xl md:text-2xl px-8 py-4 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Il est crédible lui ?
            </button>
            <p className="text-lg text-white max-w-3xl mx-auto mt-6 text-shadow-md">
              La vérité sans filtre, la science sans langue de bois
            </p>
          </div>
        </div>
      </section>

      {/* News Banner */}
      <NewsBanner />

      {/* Featured Politicians Section */}
      <section className="py-16 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A]">
            Tu les crois, toi ?
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Lecornu Video */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <video
                className="w-full h-64 object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/assets/politicians/lecornu.png"
              >
                <source src="/assets/animations/lecornu.mp4" type="video/mp4" />
              </video>
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#1E3A8A]">Sébastien Lecornu</h3>
                <p className="text-gray-600">Ministre des Armées (Nouveau Premier Ministre)</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl"></span>
                  <span className="font-bold text-[#059669]">Déjà stressé lauiss !</span>
                  <span className="text-xl font-bold">??/100</span>
                </div>
              </div>
            </div>

            {/* Le Pen Video */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <video
                className="w-full h-64 object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              >
                <source src="/assets/animations/lepen.mp4" type="video/mp4" />
              </video>
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#7C2D12]">Marine Le Pen</h3>
                <p className="text-gray-600">Députée RN</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl"></span>
                  <span className="font-bold text-[#D97706]">Moyen la celle...</span>
                  <span className="text-xl font-bold">??/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POLITIKCRED Features */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1E3A8A] mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Après la street cred', place à la Politik Cred' pour checker qui raconte des salades ! Pas 2 blabla, que des chiffres vérifiés.
            </p>
          </div>

          {/* POLITIKCRED Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center border-l-4 border-[#1E3A8A]">
              <CardContent className="p-4">
                <Scale className="w-8 h-8 text-[#1E3A8A] mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#1E3A8A]">Score de crédibilité</h3>
                <p className="text-sm text-gray-600">0 à 200 points</p>
              </CardContent>
            </Card>
            <Card className="text-center border-l-4 border-[#D97706]">
              <CardContent className="p-4">
                <CheckCircle className="w-8 h-8 text-[#D97706] mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#D97706]">Zéro blabla</h3>
                <p className="text-sm text-gray-600">Que des preuves vérifiées</p>
              </CardContent>
            </Card>
            <Card className="text-center border-l-4 border-[#DC2626]">
              <CardContent className="p-4">
                <Eye className="w-8 h-8 text-[#DC2626] mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#DC2626]">Transparent total</h3>
                <p className="text-sm text-gray-600">Tu vois tout, on cache rien</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Sources & Partners - POLITIKCRED Style */}
      <section className="py-12 bg-white border-t-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1E3A8A] mb-4">
              Nos Sources de Données
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              On combine plusieurs sources indépendantes pour te donner la vue la plus complète.
              De l&apos;IA à la vérification communautaire, tout est transparent !
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Vigie du mensonge */}
            <a
              href="https://www.vigiedumensonge.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-[#DC2626] h-full">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-[#1E3A8A] group-hover:text-[#DC2626] transition-colors">
                    Vigie du mensonge
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Plateforme collaborative de fact-checking avec vérification communautaire des promesses politiques.
                  </p>
                  <Badge variant="outline" className="bg-[#DC2626] text-white border-[#DC2626]">
                    Vérification Humaine
                  </Badge>
                </CardContent>
              </Card>
            </a>

            {/* Assemblée Nationale */}
            <a
              href="https://www.assemblee-nationale.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-[#1E3A8A] h-full">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-[#1E3A8A] group-hover:text-[#1E40AF] transition-colors">
                    Assemblée Nationale
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Données officielles des votes, amendements et actions parlementaires pour la vérification objective.
                  </p>
                  <Badge variant="outline" className="bg-[#1E3A8A] text-white border-[#1E3A8A]">
                    Données Officielles
                  </Badge>
                </CardContent>
              </Card>
            </a>

            {/* Politik Cred' AI */}
            <Card className="text-center border-2 border-[#059669] h-full">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#059669] to-[#047857] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-[#1E3A8A]">
                  Politik Cred&apos; IA
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Notre IA analyse sémantiquement les promesses et les compare aux actions parlementaires réelles.
                </p>
                <Badge variant="outline" className="bg-[#059669] text-white border-[#059669]">
                  Matching IA
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Attribution footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Nous utilisons des données de sources multiples pour garantir une vérification indépendante et objective.
              <br />
              Merci à <a href="https://www.vigiedumensonge.fr" target="_blank" rel="noopener noreferrer" className="text-[#DC2626] hover:underline font-semibold">Vigie du mensonge</a> pour leur travail de fact-checking communautaire.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Notice - POLITIKCRED Style */}
      <section className="py-8 bg-[#1E3A8A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-[#DC2626] bg-white">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-6 h-6 text-[#DC2626] mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#1E3A8A] mb-2">
                    POLITIKCRED - Légal et transparent lauiss !
                  </h3>
                  <p className="text-gray-800 text-sm mb-3">
                    On respecte la loi française à fond ! Liberté d&apos;expression, anti-diffamation, transparence totale.
                    Toutes les données sont vérifiées et sourcées.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-[#FAFAFA] text-[#DC2626] border-[#DC2626]">
                      Droit de réponse
                    </Badge>
                    <Badge variant="outline" className="bg-[#FAFAFA] text-[#059669] border-[#059669]">
                      Vérification multi-sources
                    </Badge>
                    <Badge variant="outline" className="bg-[#FAFAFA] text-[#D97706] border-[#D97706]">
                      Sources béton
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content - Le Palmarès POLITIKCRED */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-[#1E3A8A] mb-2">
            Le Palmarès Politik<span className="text-[#DC2626]">Cred'</span>
          </h2>
          <p className="text-gray-600">
            Qui est crédible parmi eux ? - Découvre les vrais scores basés sur des preuves factuelles !
          </p>
        </div>

        <PoliticianList onVoteClick={handleVoteClick} />
      </main>

      <VoteDialog
        politicianId={selectedPolitician}
        onClose={() => setSelectedPolitician(null)}
      />

      {/* Footer */}
      <Footer />
    </div>
  )
}
