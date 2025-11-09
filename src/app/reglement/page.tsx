import { Navigation } from '@/components/navigation'

export default function ReglementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="relative max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
            Le Règlement
          </h1>

          {/* Politician Images - Floating effect for md+ screens */}
          <div className="hidden md:block">
            {/* Image 1 - Right side */}
            <div className="absolute right-0 top-[36rem] w-24 lg:w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/1.png"
                alt="Politician 1"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 2 - Left side */}
            <div className="absolute left-0 top-[72rem] w-20 lg:w-28 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/2.png"
                alt="Politician 2"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 3 - Right side */}
            <div className="absolute right-0 top-[108rem] w-24 lg:w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/3.png"
                alt="Politician 3"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 4 - Left side */}
            <div className="absolute left-0 top-[144rem] w-24 lg:w-32 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/4.png"
                alt="Politician 4"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 5 - Right side */}
            <div className="absolute right-0 top-[180rem] w-20 lg:w-28 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/5.png"
                alt="Politician 5"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300 rotate-90"
              />
            </div>

            {/* Image 6 - Left side */}
            <div className="absolute left-0 top-[216rem] w-24 lg:w-32 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/6.png"
                alt="Politician 6"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 7 - Right side */}
            <div className="absolute right-0 top-[252rem] w-24 lg:w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/7.png"
                alt="Politician 7"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 9 - Left side (skipping 8 as it doesn't exist) */}
            <div className="absolute left-0 top-[288rem] w-20 lg:w-28 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/9.png"
                alt="Politician 9"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 10 - Right side */}
            <div className="absolute right-0 top-[324rem] w-24 lg:w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/10.png"
                alt="Politician 10"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto prose prose-lg max-w-none text-gray-700 leading-relaxed">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Règles de fonctionnement de Politik-Cred – Experimental</h2>
              <p className="text-sm text-gray-600">Dernière mise à jour : Septembre 2025</p>
            </div>

            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-xl font-semibold text-blue-900 mb-3">Objectif de la plateforme</h3>
              <p className="text-blue-800">
                Politik-Cred est une plateforme de fact-checking politique qui évalue objectivement la crédibilité des élus français
                en confrontant leurs promesses à leurs actions parlementaires réelles. Notre mission : fournir des données vérifiables
                et non partisanes pour enrichir le débat démocratique, sans jugement de caractère.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Fonctionnement de la Plateforme</h2>

            {/* Mobile Image 1 */}
            <div className="md:hidden mb-6 flex justify-end">
              <div className="w-20 flex-shrink-0">
                <img
                  src="/assets/politicians/1.png"
                  alt="Politician 1"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <ul className="mb-6 space-y-2">
              <li><strong>Système automatisé :</strong> les promesses sont extraites et vérifiées automatiquement via IA et données officielles.</li>
              <li><strong>Multi-sources :</strong> chaque vérification croise au minimum 2 sources indépendantes (IA, Vigie du mensonge, données parlementaires).</li>
              <li><strong>Traçabilité totale :</strong> chaque changement de score est documenté avec preuves et niveau de confiance.</li>
              <li><strong>Transparence :</strong> l&apos;historique complet est public et exportable.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Extraction et Vérification des Promesses</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Extraction des promesses</h3>
            <p className="mb-4">
              Les promesses politiques sont extraites de sources publiques (interviews, débats, programmes, réseaux sociaux) via :
              <br />• IA de classification (95% de précision) qui détecte les engagements actionnables
              <br />• Extraction manuelle par les administrateurs pour les promesses importantes
            </p>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Vérification contre actions parlementaires</h3>
            <ul className="mb-4 space-y-2">
              <li>Chaque promesse est automatiquement comparée aux actions parlementaires réelles (votes, amendements, propositions de loi)</li>
              <li>Données officielles récupérées depuis l&apos;API de l&apos;Assemblée Nationale et du Sénat</li>
              <li>Matching sémantique via IA multilingue (Hugging Face) : 71% de similarité détectée</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Système de fallback</h3>
            <ul className="mb-6 space-y-2">
              <li>Si l&apos;IA est indisponible, un système de similarité Jaccard prend le relais (100% de disponibilité)</li>
              <li>Chaque vérification indique sa méthode et son niveau de confiance (0-100%)</li>
              <li>Les vérifications à faible confiance (&lt;70%) sont marquées pour revue humaine</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Statuts de Vérification</h2>

            {/* Mobile Image 2 */}
            <div className="md:hidden mb-6 flex justify-start">
              <div className="w-20 flex-shrink-0">
                <img
                  src="/assets/politicians/2.png"
                  alt="Politician 2"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <ul className="mb-6 space-y-2">
              <li><strong>Promesse tenue (kept) :</strong> Action parlementaire cohérente avec la promesse → +3 à +7 points selon importance</li>
              <li><strong>Promesse non tenue (broken) :</strong> Action parlementaire contradictoire ou absence d&apos;action → -5 à -11 points</li>
              <li><strong>Promesse partielle (partial) :</strong> Action partiellement conforme → +1 point</li>
              <li><strong>En cours (in_progress) :</strong> Promesse en cours de réalisation → +0.5 point</li>
              <li><strong>En attente (pending) :</strong> Promesse non encore vérifiable → aucun impact sur le score</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Processus de Vérification Automatisée</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Étape 1 : Extraction et classification</h3>
            <ul className="mb-4 space-y-2">
              <li>L&apos;IA analyse les déclarations publiques et extrait les promesses actionnables</li>
              <li>Score de confiance attribué (0-100%) basé sur la clarté de l&apos;engagement</li>
              <li>Catégorisation automatique : économie, social, environnement, sécurité, etc.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Étape 2 : Matching parlementaire</h3>
            <ul className="mb-4 space-y-2">
              <li>Comparaison sémantique avec les votes, amendements et propositions de loi</li>
              <li>Détection des correspondances (71% de précision) et contradictions</li>
              <li>Calcul automatique du niveau de réalisation (tenue/non tenue/partielle)</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Étape 3 : Mise à jour automatique du score</h3>
            <ul className="mb-6 space-y-2">
              <li>Le score de crédibilité est actualisé automatiquement dès qu&apos;une vérification est validée</li>
              <li>Chaque changement est enregistré dans l&apos;historique public avec preuves</li>
              <li>Les administrateurs peuvent contester ou ajuster manuellement en cas d&apos;erreur détectée</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Sources acceptées</h2>

            {/* Mobile Image 3 */}
            <div className="md:hidden mb-6 flex justify-end">
              <div className="w-20 flex-shrink-0">
                <img
                  src="/assets/politicians/3.png"
                  alt="Politician 3"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Fiabilité maximale</h3>
            <ul className="mb-4 space-y-2">
              <li>Agences de presse : AFP, Reuters, AP.</li>
              <li>Médias nationaux : Le Monde, Libération, Le Figaro, Les Échos, etc.</li>
              <li>Médias spécialisés : Mediapart, Alternatives Économiques, Courrier International.</li>
              <li>Documents officiels : Journal Officiel, HATVP, comptes-rendus parlementaires.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Sources complémentaires (validation renforcée)</h3>
            <ul className="mb-4 space-y-2">
              <li>Presse régionale établie.</li>
              <li>Médias en ligne à déontologie claire.</li>
              <li>Rapports d&apos;ONG reconnues (Transparency International, etc.).</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Sources exclues</h3>
            <ul className="mb-6 space-y-2">
              <li>Réseaux sociaux sans source.</li>
              <li>Sites de désinformation identifiés.</li>
              <li>Blogs personnels non journalistiques.</li>
              <li>Rumeurs non documentées.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Vérification Multi-Sources</h2>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 mb-3"><strong>Système triple vérification :</strong></p>
              <ul className="space-y-1 text-blue-800">
                <li>• <strong>IA sémantique :</strong> Matching automatique (Hugging Face) avec 71% de précision</li>
                <li>• <strong>Vigie du mensonge :</strong> Vérification communautaire collaborative</li>
                <li>• <strong>Données officielles :</strong> API Assemblée Nationale et Sénat</li>
              </ul>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Garanties de fiabilité</h3>
            <ul className="mb-6 space-y-2">
              <li>Chaque vérification indique clairement ses sources et méthodes</li>
              <li>Niveau de confiance affiché pour chaque match (0-100%)</li>
              <li>Historique complet consultable publiquement</li>
              <li>Système de contestation disponible pour corrections</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Calcul du Score de Crédibilité</h2>

            {/* Mobile Image 4 */}
            <div className="md:hidden mb-6 flex justify-start">
              <div className="w-20 flex-shrink-0">
                <img
                  src="/assets/politicians/4.png"
                  alt="Politician 4"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Score de base (baseline)</h3>
            <ul className="mb-4 space-y-2">
              <li><strong>Tous les politiciens démarrent à 100 points</strong> sur une échelle de 0 à 200</li>
              <li>Score neutre : ni positif ni négatif au départ</li>
              <li>Évolution basée uniquement sur vérifications factuelles</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Formule de calcul</h3>
            <p className="mb-3">L&apos;impact d&apos;une promesse sur le score dépend de :</p>
            <ul className="mb-4 space-y-2">
              <li><strong>Base :</strong> Promesse tenue = +3 pts | Non tenue = -5 pts | Partielle = +1 pt</li>
              <li><strong>Multiplicateur de confiance :</strong> × niveau de confiance (0.0 à 1.0)</li>
              <li><strong>Multiplicateur d&apos;importance :</strong> × importance (0.75 à 1.5)</li>
              <li><strong>Formule :</strong> score_change = base × confiance × importance</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Exemple concret</h3>
            <ul className="mb-6 space-y-2">
              <li>Promesse importante (1.5×) tenue avec haute confiance (0.95) : +3 × 0.95 × 1.5 = <strong>+4.28 points</strong></li>
              <li>Promesse moyenne (1.0×) non tenue avec certitude (1.0) : -5 × 1.0 × 1.0 = <strong>-5 points</strong></li>
              <li>Promesse mineure (0.75×) partielle avec bonne confiance (0.8) : +1 × 0.8 × 0.75 = <strong>+0.6 point</strong></li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Droit de réponse et recours</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Droit de réponse des élus</h3>
            <ul className="mb-4 space-y-2">
              <li>Formulaire en ligne accessible à tout moment.</li>
              <li>Traitement sous 7 jours ouvrés.</li>
              <li>Réponse publiée sur le profil de l&apos;élu.</li>
              <li>Réexamen si la réponse apporte des éléments nouveaux.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recours pour les utilisateurs</h3>
            <ul className="mb-4 space-y-2">
              <li>Contestation possible dans les 15 jours suivant une décision.</li>
              <li>Nouvelle commission d&apos;examen (distincte).</li>
              <li>Preuves nouvelles exigées.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Contre les abus</h3>
            <ul className="mb-6 space-y-2">
              <li>Signalement possible par les utilisateurs.</li>
              <li>Sanctions progressives : avertissement, suspension, bannissement.</li>
              <li>Réhabilitation possible après engagement écrit à respecter les règles.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Transparence et responsabilité</h2>

            {/* Mobile Image 5 - Rotated */}
            <div className="md:hidden mb-6 flex justify-end">
              <div className="w-16 flex-shrink-0">
                <img
                  src="/assets/politicians/5.png"
                  alt="Politician 5"
                  className="w-full h-auto object-contain rotate-90"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Accès à l&apos;information</h3>
            <ul className="mb-4 space-y-2">
              <li>Méthodologie accessible publiquement.</li>
              <li>Composition des commissions anonymisée.</li>
              <li>Statistiques mensuelles (votes traités, taux de validation, délais).</li>
              <li>Rapport d&apos;activité trimestriel.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Données personnelles</h3>
            <ul className="mb-4 space-y-2">
              <li>Conformité RGPD.</li>
              <li>Pseudonymisation obligatoire.</li>
              <li>Droit à l&apos;oubli.</li>
              <li>Conservation limitée à 5 ans.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Financement</h3>
            <ul className="mb-6 space-y-2">
              <li>Financement par dons citoyens et subventions publiques éventuelles.</li>
              <li>Refus de tout financement partisan.</li>
              <li>Publication annuelle des comptes.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Évolution de la plateforme</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Gouvernance participative</h3>
            <ul className="mb-4 space-y-2">
              <li>Assemblée générale annuelle des utilisateurs.</li>
              <li>Votes consultatifs pour les grandes évolutions.</li>
              <li>Comité d&apos;éthique indépendant (universitaires, juges, journalistes).</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Amélioration continue</h3>
            <ul className="mb-6 space-y-2">
              <li>Veille juridique.</li>
              <li>Retours d&apos;expérience pris en compte.</li>
              <li>Intégration d&apos;outils technologiques évolués.</li>
              <li>Révision des règles au fil du temps.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Limites et précautions</h2>

            {/* Mobile Image 6 */}
            <div className="md:hidden mb-6 flex justify-start">
              <div className="w-20 flex-shrink-0">
                <img
                  src="/assets/politicians/6.png"
                  alt="Politician 6"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Ce que Politik-Cred n&apos;est pas</h3>
            <ul className="mb-4 space-y-2">
              <li>Pas un tribunal : aucune décision juridique, que des faits vérifiés.</li>
              <li>Pas partisan : neutralité stricte, algorithmes objectifs.</li>
              <li>Pas définitif : les scores évoluent avec de nouvelles vérifications.</li>
              <li>Pas infaillible : système de contestation disponible pour corriger les erreurs.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Principes essentiels</h3>
            <ul className="mb-6 space-y-2">
              <li><strong>Langage factuel :</strong> "promesse non tenue" ≠ "est un menteur"</li>
              <li><strong>Actions, pas caractère :</strong> nous évaluons ce qui est fait, pas qui ils sont</li>
              <li><strong>Données vérifiables :</strong> tout est sourcé et traçable</li>
              <li><strong>Humilité :</strong> nous sommes un outil d&apos;information, pas un juge</li>
            </ul>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-center text-gray-700 font-medium">
                Ces règles sont évolutives. La communauté peut les faire évoluer selon un processus démocratique.
                Politik-Cred s&apos;engage pour une démocratie plus transparente, informée, et participative.
              </p>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 text-center">
              <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p className="mt-2">
                Pour toute question concernant ce règlement, contactez-nous à :
                <span className="text-blue-600 ml-1">reglement@politik-cred.fr</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}