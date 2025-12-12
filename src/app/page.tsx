"use client"

import { Suspense } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { PoliticianList } from "@/components/politician-list"
import { WelcomeBanner } from "@/components/welcome-banner"
import { NewsBanner } from "@/components/news-banner"
import { ParliamentHero } from "@/components/hero"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Eye,
  Info,
  Scale,
  CheckCircle
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-900">
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>

      <Navigation />

      {/* 3D Parliament Hero Section */}
      <ParliamentHero />

      {/* News Banner */}
      <NewsBanner />

      {/* Featured Politicians Section */}
      <section className="py-16 bg-[#FAFAFA] dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A] dark:text-blue-400">
            Tu les crois, toi ?
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Lecornu Video */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-black/30 overflow-hidden">
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
                <h3 className="text-xl font-bold text-[#1E3A8A] dark:text-blue-400">Sébastien Lecornu</h3>
                <p className="text-gray-600 dark:text-gray-400">Ministre des Armées (Nouveau Premier Ministre)</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl"></span>
                  <span className="font-bold text-[#059669] dark:text-green-400">Déjà stressé lauiss !</span>
                  <span className="text-xl font-bold dark:text-gray-200">??/100</span>
                </div>
              </div>
            </div>

            {/* Le Pen Video */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-black/30 overflow-hidden">
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
                <h3 className="text-xl font-bold text-[#7C2D12] dark:text-orange-400">Marine Le Pen</h3>
                <p className="text-gray-600 dark:text-gray-400">Députée RN</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl"></span>
                  <span className="font-bold text-[#D97706] dark:text-amber-400">Moyen la celle...</span>
                  <span className="text-xl font-bold dark:text-gray-200">??/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POLITIKCRED Features */}
      <section className="py-12 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1E3A8A] dark:text-blue-400 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Après la street cred&apos;, place à la Politik Cred&apos; pour checker qui raconte des salades ! Pas 2 blabla, que des chiffres vérifiés.
            </p>
          </div>

          {/* POLITIKCRED Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center border-l-4 border-[#1E3A8A] dark:border-blue-500 dark:bg-gray-900">
              <CardContent className="p-4">
                <Scale className="w-8 h-8 text-[#1E3A8A] dark:text-blue-400 mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#1E3A8A] dark:text-blue-400">Score de crédibilité</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">0 à 200 points</p>
              </CardContent>
            </Card>
            <Card className="text-center border-l-4 border-[#D97706] dark:border-amber-500 dark:bg-gray-900">
              <CardContent className="p-4">
                <CheckCircle className="w-8 h-8 text-[#D97706] dark:text-amber-400 mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#D97706] dark:text-amber-400">Zéro blabla</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Que des preuves vérifiées</p>
              </CardContent>
            </Card>
            <Card className="text-center border-l-4 border-[#DC2626] dark:border-red-500 dark:bg-gray-900">
              <CardContent className="p-4">
                <Eye className="w-8 h-8 text-[#DC2626] dark:text-red-400 mx-auto mb-2" />
                <h3 className="font-semibold mb-1 text-[#DC2626] dark:text-red-400">Transparent total</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tu vois tout, on cache rien</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Sources & Partners - POLITIKCRED Style */}
      <section className="py-12 bg-white dark:bg-gray-800 border-t-2 border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1E3A8A] dark:text-blue-400 mb-4">
              Nos Sources de Données
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
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
              <Card className="text-center hover:shadow-lg dark:hover:shadow-black/30 transition-shadow border-2 hover:border-[#DC2626] dark:hover:border-red-500 h-full dark:bg-gray-900">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-[#1E3A8A] dark:text-blue-400 group-hover:text-[#DC2626] dark:group-hover:text-red-400 transition-colors">
                    Vigie du mensonge
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
              <Card className="text-center hover:shadow-lg dark:hover:shadow-black/30 transition-shadow border-2 hover:border-[#1E3A8A] dark:hover:border-blue-500 h-full dark:bg-gray-900">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-[#1E3A8A] dark:text-blue-400 group-hover:text-[#1E40AF] dark:group-hover:text-blue-300 transition-colors">
                    Assemblée Nationale
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Données officielles des votes, amendements et actions parlementaires pour la vérification objective.
                  </p>
                  <Badge variant="outline" className="bg-[#1E3A8A] text-white border-[#1E3A8A]">
                    Données Officielles
                  </Badge>
                </CardContent>
              </Card>
            </a>

            {/* Politik Cred' AI */}
            <Card className="text-center border-2 border-[#059669] dark:border-green-600 h-full dark:bg-gray-900">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#059669] to-[#047857] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-[#1E3A8A] dark:text-blue-400">
                  Politik Cred&apos; IA
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nous utilisons des données de sources multiples pour garantir une vérification indépendante et objective.
              <br />
              Merci à <a href="https://www.vigiedumensonge.fr" target="_blank" rel="noopener noreferrer" className="text-[#DC2626] dark:text-red-400 hover:underline font-semibold">Vigie du mensonge</a> pour leur travail de fact-checking communautaire.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Notice - POLITIKCRED Style */}
      <section className="py-8 bg-[#1E3A8A] dark:bg-blue-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-[#DC2626] dark:border-red-600 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-6 h-6 text-[#DC2626] dark:text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#1E3A8A] dark:text-blue-400 mb-2">
                    POLITIKCRED - Légal et transparent lauiss !
                  </h3>
                  <p className="text-gray-800 dark:text-gray-300 text-sm mb-3">
                    On respecte la loi française à fond ! Liberté d&apos;expression, anti-diffamation, transparence totale.
                    Toutes les données sont vérifiées et sourcées.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-[#FAFAFA] dark:bg-gray-700 text-[#DC2626] dark:text-red-400 border-[#DC2626] dark:border-red-600">
                      Droit de réponse
                    </Badge>
                    <Badge variant="outline" className="bg-[#FAFAFA] dark:bg-gray-700 text-[#059669] dark:text-green-400 border-[#059669] dark:border-green-600">
                      Vérification multi-sources
                    </Badge>
                    <Badge variant="outline" className="bg-[#FAFAFA] dark:bg-gray-700 text-[#D97706] dark:text-amber-400 border-[#D97706] dark:border-amber-600">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-900">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-[#1E3A8A] dark:text-blue-400 mb-2">
            Le Palmarès Politik<span className="text-[#DC2626] dark:text-red-400">Cred&apos;</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Qui est crédible parmi eux ? - Découvre les vrais scores basés sur des preuves factuelles !
          </p>
        </div>

        <PoliticianList />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
