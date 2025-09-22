import { Navigation } from '@/components/navigation'

export default function ReglementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="relative max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
            Le Règlement
          </h1>

          {/* Politician Images - Positioned absolutely for floating effect */}
          <div className="hidden lg:block">
            {/* Image 1 - Right side */}
            <div className="absolute right-0 top-[30rem] w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/1.png"
                alt="Politician 1"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 2 - Left side */}
            <div className="absolute left-0 top-[60rem] w-28 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/2.png"
                alt="Politician 2"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 3 - Right side */}
            <div className="absolute right-0 top-[90rem] w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/3.png"
                alt="Politician 3"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 4 - Left side */}
            <div className="absolute left-0 top-[120rem] w-32 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/4.png"
                alt="Politician 4"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 5 - Right side */}
            <div className="absolute right-0 top-[150rem] w-28 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/5.png"
                alt="Politician 5"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300 rotate-90"
              />
            </div>

            {/* Image 6 - Left side */}
            <div className="absolute left-0 top-[180rem] w-32 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/6.png"
                alt="Politician 6"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 7 - Right side */}
            <div className="absolute right-0 top-[210rem] w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/7.png"
                alt="Politician 7"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 9 - Left side (skipping 8 as it doesn't exist) */}
            <div className="absolute left-0 top-[240rem] w-28 transform -translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/9.png"
                alt="Politician 9"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>

            {/* Image 10 - Right side */}
            <div className="absolute right-0 top-[270rem] w-32 transform translate-x-1/2 hover:scale-110 transition-transform duration-300">
              <img
                src="/assets/politicians/10.png"
                alt="Politician 10"
                className="w-full h-auto object-contain hover:border-blue-200 transition-colors duration-300"
              />
            </div>
          </div>

          {/* Mobile version - Images in a grid at the bottom */}
          <div className="lg:hidden mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Les acteurs politiques concernés
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 justify-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 9, 10].map((num) => (
                <div key={num} className="w-16 sm:w-20">
                  <img
                    src={`/assets/politicians/${num}.png`}
                    alt={`Politician ${num}`}
                    className={`w-full h-auto object-contain ${num === 5 ? 'rotate-90' : ''}`}
                  />
                </div>
              ))}
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
                Politik-Cred est une plateforme citoyenne qui permet d&apos;évaluer la crédibilité des élus français à partir de faits publics vérifiés.
                Notre mission : informer de façon transparente et non partisane pour enrichir le débat démocratique.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Inscription & Participation</h2>
            <ul className="mb-6 space-y-2">
              <li><strong>Inscription obligatoire :</strong> seuls les inscrits peuvent créer des votes ou participer aux discussions.</li>
              <li><strong>Un compte par personne :</strong> vérifié via une adresse email unique.</li>
              <li><strong>Traçabilité interne :</strong> les votes sont liés aux comptes (pseudonymes visibles, identités privées).</li>
              <li><strong>Engagement civique :</strong> la participation est bénévole, motivée par l&apos;intérêt général.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Création & Gestion des Votes</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Création d&apos;un vote</h3>
            <p className="mb-4">
              Un utilisateur inscrit peut signaler un fait concernant un élu en lançant un vote (positif, négatif ou de rectification).
              <br />Exemple : &quot;Sébastien Lecornu a menti sur son CV&quot; → vote négatif.
            </p>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Affichage immédiat, validation différée</h3>
            <ul className="mb-4 space-y-2">
              <li>Le vote est affiché immédiatement pour information.</li>
              <li>Il ne sera pris en compte dans le score de l&apos;élu qu&apos;après validation par une commission.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Règle anti-doublon</h3>
            <ul className="mb-6 space-y-2">
              <li>Plusieurs utilisateurs peuvent créer des votes sur le même sujet.</li>
              <li>Seul le premier vote validé impactera la crédibilité.</li>
              <li>Les doublons sont regroupés automatiquement.</li>
              <li>Le nombre de signalements similaires sert à mesurer l&apos;engagement citoyen.</li>
              <li>Les votes très remontés peuvent être traités en priorité par la commission.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Types de Votes</h2>
            <ul className="mb-6 space-y-2">
              <li><strong>Vote négatif :</strong> diminue la crédibilité (fait dommageable).</li>
              <li><strong>Vote positif :</strong> augmente la crédibilité (fait bénéfique).</li>
              <li><strong>Vote de rectification :</strong> corrige une information erronée existante.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Processus de Validation (Human in the Loop)</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Étape 1 : Analyse automatisée</h3>
            <ul className="mb-4 space-y-2">
              <li>Une IA vérifie les sources, la cohérence, et attribue un score de confiance.</li>
              <li>Elle rédige un rapport d&apos;analyse.</li>
              <li>L&apos;IA ne décide jamais seule.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Étape 2 : Validation humaine</h3>
            <ul className="mb-4 space-y-2">
              <li>Une commission citoyenne examine les preuves, le contexte et le rapport IA.</li>
              <li>La décision est collégiale : validation, rejet, ou demande de compléments.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Fréquence</h3>
            <ul className="mb-6 space-y-2">
              <li>Sessions hebdomadaires : sujets urgents ou très suivis.</li>
              <li>Sessions mensuelles : tous les autres votes.</li>
              <li>Sessions exceptionnelles : en cas d&apos;actualité politique majeure.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Sources acceptées</h2>
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

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Système de Validation : en réflexion</h2>
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 mb-3">(Still)</p>
              <ul className="space-y-1 text-yellow-800">
                <li>Option A : Partenariat avec écoles de journalisme</li>
                <li>Option B : Modération hybride (professionnels + citoyens)</li>
                <li>Option C : Système de réputation communautaire</li>
                <li>Option D : Validation croisée avec partenaires fact-checking</li>
                <li>Option E : Clement Viktorovitch ? Qui ?</li>
                <li>Option F : Comission citoyenne bénévole ?</li>
              </ul>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Garanties</h3>
            <ul className="mb-6 space-y-2">
              <li>Déclaration obligatoire d&apos;absence de conflit d&apos;intérêt.</li>
              <li>Diversité recherchée parmi les validateurs.</li>
              <li>Motivation écrite obligatoire pour chaque décision.</li>
              <li>Publicité des décisions (anonymisées).</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Impact sur la notation</h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Calcul des scores</h3>
            <p className="mb-3">Chaque vote validé impacte une ou plusieurs catégories :</p>
            <ul className="mb-4 space-y-2">
              <li>Transparence (déclarations d&apos;intérêts, patrimoine)</li>
              <li>Cohérence (discours vs actes)</li>
              <li>Respect des engagements (promesses tenues ou non)</li>
              <li>Probité (éthique, affaires judiciaires)</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Pondération temporelle</h3>
            <ul className="mb-4 space-y-2">
              <li>Faits récents (moins de 12 mois) : impact fort.</li>
              <li>Faits plus anciens : impact réduit progressivement.</li>
              <li>Faits de plus de 10 ans : ignorés sauf condamnation définitive.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Valorisation équilibrée</h3>
            <ul className="mb-6 space-y-2">
              <li>Bonus pour engagements tenus.</li>
              <li>Ajustement positif si l&apos;élu corrige une erreur.</li>
              <li>Historique de l&apos;évolution de la crédibilité visible via graphique.</li>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Ce que Politik-Cred n&apos;est pas</h3>
            <ul className="mb-4 space-y-2">
              <li>Pas un tribunal : aucune décision juridique.</li>
              <li>Pas partisan : neutralité stricte.</li>
              <li>Pas définitif : les scores évoluent dans le temps.</li>
              <li>Pas infaillible : nous corrigeons nos erreurs.</li>
            </ul>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Principes essentiels</h3>
            <ul className="mb-6 space-y-2">
              <li>Présomption d&apos;innocence.</li>
              <li>Contextualisation des faits.</li>
              <li>Encouragement au débat démocratique.</li>
              <li>Humilité : nous sommes un outil, pas un arbitre absolu.</li>
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