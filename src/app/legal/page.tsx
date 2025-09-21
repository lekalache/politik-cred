"use client"

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Scale,
  Shield,
  Eye,
  Mail,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Clock
} from 'lucide-react'

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Scale className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Conformité légale et transparence
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Notre engagement pour respecter la législation française et garantir
            une plateforme transparente et équitable.
          </p>
        </div>

        {/* Legal Framework */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <span>Cadre légal français</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Liberté d'expression
                  </h3>
                  <p className="text-sm text-gray-600">
                    Cette plateforme s'appuie sur la liberté d'expression garantie par
                    la Constitution française et la Cour européenne des droits de l'homme,
                    particulièrement pour le débat politique.
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Protection contre la diffamation
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tous les contenus sont modérés pour éviter la diffamation.
                    Les scores sont basés sur des preuves vérifiables et un processus
                    de modération rigoureux.
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Digital Services Act (DSA)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Conformité aux directives européennes 2024 sur la transparence,
                    la traçabilité et la suppression rapide de contenus illégaux.
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Droit de réponse
                  </h3>
                  <p className="text-sm text-gray-600">
                    Les personnalités politiques disposent d'un droit de réponse
                    et peuvent demander la correction ou suppression de contenus
                    diffamatoires.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Right of Reply */}
        <section className="mb-12">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-6 h-6 text-blue-600" />
                <span>Droit de réponse</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Pour les personnalités politiques
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Si vous êtes une personnalité politique et estimez qu'un contenu sur cette
                  plateforme porte atteinte à votre réputation de manière injustifiée,
                  vous pouvez exercer votre droit de réponse.
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Demande de correction ou suppression</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Droit de publier une réponse officielle</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Traitement prioritaire des demandes légitimes</span>
                  </div>
                </div>
                <Button className="mt-4" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Contacter : legal@politics-trust.fr
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Transparency */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-6 h-6 text-green-600" />
                <span>Transparence et traçabilité</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Historique des votes
                  </h3>
                  <p className="text-sm text-green-800">
                    Tous les votes approuvés sont archivés et consultables.
                    L'historique complet permet de vérifier l'évolution des scores.
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Sources et preuves
                  </h3>
                  <p className="text-sm text-green-800">
                    Chaque vote est accompagné de preuves vérifiables (articles, vidéos, documents).
                    Les sources sont systématiquement documentées et accessibles.
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Processus de modération
                  </h3>
                  <p className="text-sm text-green-800">
                    Modération humaine par une équipe formée. Critères de validation transparents
                    et distinction claire entre opinion et faits vérifiés.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Risk Management */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <span>Gestion des risques</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Protection contre les campagnes coordonnées</h4>
                    <p className="text-sm text-gray-600">
                      Mécanismes de détection des votes frauduleux, des faux comptes
                      et des campagnes de manipulation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Réponse rapide aux demandes légales</h4>
                    <p className="text-sm text-gray-600">
                      Procédure d'urgence pour traiter les demandes de suppression
                      ou correction légitimes dans les meilleurs délais.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Documentation complète</h4>
                    <p className="text-sm text-gray-600">
                      Archivage de tous les votes, critères de modération et sources
                      pour prouver la légitimité en cas de contestation judiciaire.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Supervision éditoriale</h4>
                    <p className="text-sm text-gray-600">
                      Équipe de supervision avec expertise juridique pour valider
                      les contenus sensibles et maintenir les standards légaux.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Disclaimers */}
        <section className="mb-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-6 h-6" />
                <span>Avertissements importants</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm text-yellow-800">
                <p>
                  <strong>Nature des scores :</strong> Les scores de crédibilité sont basés sur
                  des votes communautaires modérés et ne constituent pas une vérité absolue.
                </p>
                <p>
                  <strong>Responsabilité des utilisateurs :</strong> Chaque utilisateur est
                  responsable de l'exactitude des preuves qu'il soumet et peut engager sa
                  responsabilité légale en cas de contenu diffamatoire.
                </p>
                <p>
                  <strong>Évolution des scores :</strong> Les scores peuvent évoluer avec
                  de nouveaux votes et la réévaluation de preuves existantes.
                </p>
                <p>
                  <strong>Interprétation :</strong> Cette plateforme fournit des informations
                  pour éclairer le débat public, non pour diffamer ou nuire à la réputation.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="text-center">
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Questions légales ou demandes de droit de réponse
              </h3>
              <p className="text-gray-600 mb-6">
                Notre équipe juridique est à votre disposition pour toute question
                concernant le contenu de la plateforme.
              </p>
              <div className="space-y-2">
                <Button size="lg" className="w-full sm:w-auto">
                  <Mail className="w-5 h-5 mr-2" />
                  legal@politics-trust.fr
                </Button>
                <p className="text-xs text-gray-500">
                  Réponse garantie sous 48h pour les demandes urgentes
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}