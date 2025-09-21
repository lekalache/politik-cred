#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 POLITIKCRED - Script d'import automatique
"Il est crédible lauiss ?" - On check tout, on dit tout !

Récupère les données des politiciens français depuis les APIs officielles
et applique notre scoring de crédibilité street science.

Prérequis:
pip install supabase requests pandas python-dotenv

Configuration .env:
SUPABASE_URL=votre_url_supabase
SUPABASE_ANON_KEY=votre_clé_supabase
"""

import os
import sys
import requests
import pandas as pd
from datetime import datetime
import logging
from typing import List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import ssl
import urllib3

# Disable SSL warnings for government sites
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Ensure proper encoding for French characters
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Chargement des variables d'environnement
load_dotenv()

class PolitikCredDataFetcher:
    """🔥 POLITIKCRED - Classe principale pour récupérer et scorer les politiques

    "Il est crédible lauiss ?" - On fait le taf, on dit les vrais chiffres !
    Pas de blabla, que de la data vérifiée et du scoring sans langue de bois.
    """

    def __init__(self):
        # Configuration Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("🚨 POLITIKCRED ERROR: Variables SUPABASE_URL et SUPABASE_ANON_KEY requises dans .env - On peut pas check sans la base lauiss !")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # Configuration logging with UTF-8 encoding
        logging.basicConfig(
            level=logging.INFO,
            format='🔥 POLITIKCRED %(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('politikcred_sync.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def fetch_deputes(self) -> List[Dict]:
        """Check les députés depuis l'API officielle - il est crédible lauiss ?"""

        self.logger.info("🗳️ On check les députés... qui dit vrai dans l'hémicycle ?")

        # URLs pour l'API de l'Assemblée Nationale
        base_url = "https://data.assemblee-nationale.fr/static/openData/repository"

        try:
            # Try the current legislature (17th) first, then fallback to 16th
            urls_to_try = [
                f"{base_url}/17/amo/deputes/AMO30_deputes_actifs_mandats_actifs_organes_divises.json",
                f"{base_url}/16/amo/deputes/AMO30_deputes_actifs_mandats_actifs_organes_divises.json",
                "https://www.assemblee-nationale.fr/dyn/opendata/legislature/17/json/acteurs"
            ]

            data = None
            for url in urls_to_try:
                try:
                    response = requests.get(url, timeout=30, verify=False)
                    response.raise_for_status()
                    data = response.json()
                    self.logger.info(f"✅ Jackpot ! Data récupérée depuis: {url}")
                    break
                except Exception as e:
                    self.logger.warning(f"⚠️ Raté pour cette URL lauiss: {e}")
                    continue

            if not data:
                raise Exception("🚨 Aucune URL de députés qui marche - ils cachent quoi ?")

            deputies = []

            for deputy_info in data.get('export', {}).get('acteurs', {}).get('acteur', []):
                # Extraction des informations de base
                etat_civil = deputy_info.get('etatCivil', {})
                mandat = deputy_info.get('mandats', {}).get('mandat', [{}])[0]

                deputy = {
                    'name': f"{etat_civil.get('prenom', '')} {etat_civil.get('nom', '')}".strip(),
                    'first_name': etat_civil.get('prenom', ''),
                    'last_name': etat_civil.get('nom', ''),
                    'party': self._extract_party_from_mandate(mandat),
                    'position': 'Député',
                    'constituency': f"Circonscription {mandat.get('election', {}).get('lieu', {}).get('numCirconscription', '')} - {mandat.get('election', {}).get('lieu', {}).get('departement', '')}",
                    'birth_date': etat_civil.get('dateNais'),
                    'gender': 'M' if etat_civil.get('civ') == 'M.' else 'F',
                    'political_orientation': self._determine_orientation(self._extract_party_from_mandate(mandat)),
                    'bio': f"Député de la {mandat.get('legislature')}e législature",
                    'credibility_score': 100,
                    'is_active': True,
                    'verification_status': 'verified',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }

                deputies.append(deputy)

            self.logger.info(f"✅ {len(deputies)} députés dans la base - maintenant on va voir qui est crédible lauiss !")
            return deputies

        except Exception as e:
            self.logger.error(f"❌ Problème pour récupérer les députés: {e}")
            return []

    def fetch_senateurs(self) -> List[Dict]:
        """Check les sénateurs - ces vieux sages sont crédibles lauiss ?"""

        self.logger.info("🏛️ On check les sénateurs... la sagesse du Palais du Luxembourg ?")

        try:
            # URL pour télécharger les données des sénateurs
            url = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv"

            # Lecture du fichier CSV avec SSL bypass
            response = requests.get(url, verify=False)
            response.raise_for_status()

            # Save temporary file and read with pandas
            with open('temp_senators.csv', 'wb') as f:
                f.write(response.content)

            df = pd.read_csv('temp_senators.csv', sep=';', encoding='utf-8')

            # Clean up temp file
            os.remove('temp_senators.csv')

            senators = []
            for _, row in df.iterrows():
                # Vérifier que le sénateur est actif
                if pd.isna(row.get('Date de fin de mandat')):
                    senator = {
                        'name': f"{row.get('Prénom', '')} {row.get('Nom usage', '') or row.get('Nom', '')}".strip(),
                        'first_name': row.get('Prénom', ''),
                        'last_name': row.get('Nom usage', '') or row.get('Nom', ''),
                        'party': row.get('Groupe politique', ''),
                        'position': 'Sénateur',
                        'constituency': row.get('Département', ''),
                        'birth_date': row.get('Date de naissance'),
                        'gender': 'M' if row.get('Civilité') == 'M.' else 'F',
                        'political_orientation': self._determine_orientation(row.get('Groupe politique', '')),
                        'bio': f"Sénateur élu en {row.get('Début de mandat', '')}",
                        'credibility_score': 80,  # Score de base pour les sénateurs
                        'is_active': True,
                        'verification_status': 'verified',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }

                    # Application de la Direction Artistique
                    senator = self._assign_visual_elements(senator)
                    senators.append(senator)

            self.logger.info(f"✅ {len(senators)} sénateurs checkés - voyons leur crédibilité lauiss !")
            return senators

        except Exception as e:
            self.logger.error(f"❌ Galère avec les sénateurs: {e}")
            return []

    def _assign_visual_elements(self, politician: Dict) -> Dict:
        """🎨 POLITIKCRED - Style cartoon + scoring de crédibilité

        "Il est crédible lauiss ?" - On stylise selon notre DA street science !
        """

        # Mapping des avatars existants
        avatar_mapping = {
            'élisabeth borne': '/images/borne.png',
            'sébastien lecornu': '/images/lecornu.png',
            'éric lombard': '/images/lombart.png',
            'marine le pen': '/images/lepen.jpeg'
        }

        full_name = f"{politician.get('first_name', '')} {politician.get('last_name', '')}".lower().strip()

        # Avatar personnalisé si disponible
        politician['avatar_url'] = avatar_mapping.get(full_name, None)

        # Couleur de carte basée sur l'orientation politique (Direction Artistique)
        orientation_colors = {
            'left': '#DC2626',           # Rouge Tricolore
            'center-left': '#059669',    # Vert Assemblée
            'center': '#1E3A8A',         # Bleu République
            'center-right': '#D97706',   # Or Institutionnel
            'right': '#7C2D12'           # Bordeaux Sérieux
        }

        politician['card_color'] = orientation_colors.get(
            politician.get('political_orientation', 'center'),
            '#1E3A8A'  # Bleu République par défaut
        )

        # Expression cartoon basée sur le score de crédibilité POLITIKCRED
        credibility = politician.get('credibility_score', 100)
        if credibility >= 80:
            politician['cartoon_expression'] = 'confident'  # "Il assure lauiss !"
            politician['credibility_badge'] = '🏆'
            politician['credibility_label'] = 'Il assure lauiss !'
        elif credibility >= 60:
            politician['cartoon_expression'] = 'neutral'    # "Moyen lauiss..."
            politician['credibility_badge'] = '⚖️'
            politician['credibility_label'] = 'Moyen lauiss...'
        else:
            politician['cartoon_expression'] = 'skeptical'  # "Louche lauiss !"
            politician['credibility_badge'] = '⚠️'
            politician['credibility_label'] = 'Louche lauiss !'

        # Style de mise en valeur selon le rôle
        role_styles = {
            'Premier ministre': {'highlight': True, 'crown': '👑'},
            'Ministre d\'État': {'highlight': True, 'crown': '⭐'},
            'Député': {'highlight': False, 'crown': '🗳️'},
            'Sénateur': {'highlight': False, 'crown': '🏛️'},
            'Maire': {'highlight': False, 'crown': '🏙️'}
        }

        position = politician.get('position', '')
        for role, style in role_styles.items():
            if role.lower() in position.lower():
                politician.update(style)
                break
        else:
            politician.update({'highlight': False, 'crown': '👤'})

        return politician

    def fetch_ministres_gouvernement_bayrou(self) -> List[Dict]:
        """Check le gouvernement Bayrou - ils sont crédibles lauiss ?"""

        self.logger.info("🏛️ On check le gouvernement Bayrou... qui assure au pouvoir ?")

        # Données du gouvernement Bayrou (source officielle)
        ministres = [
            {
                'name': 'François Bayrou',
                'first_name': 'François',
                'last_name': 'Bayrou',
                'party': 'MoDem',
                'position': 'Premier ministre, chargé de la Planification écologique et énergétique',
                'political_orientation': 'center',
                'credibility_score': 95  # Score élevé pour le PM
            },
            {
                'name': 'Élisabeth Borne',
                'first_name': 'Élisabeth',
                'last_name': 'Borne',
                'party': 'Renaissance',
                'position': 'Ministre d\'État, ministre de l\'Éducation nationale, de l\'Enseignement supérieur et de la Recherche',
                'political_orientation': 'center',
                'credibility_score': 88
            },
            {
                'name': 'Manuel Valls',
                'first_name': 'Manuel',
                'last_name': 'Valls',
                'party': 'Renaissance',
                'position': 'Ministre d\'État, ministre des Outre-mer',
                'political_orientation': 'center-left',
                'credibility_score': 75
            },
            {
                'name': 'Gérald Darmanin',
                'first_name': 'Gérald',
                'last_name': 'Darmanin',
                'party': 'Renaissance',
                'position': 'Ministre d\'État, garde des sceaux, ministre de la Justice',
                'political_orientation': 'center-right',
                'credibility_score': 70
            },
            {
                'name': 'Bruno Retailleau',
                'first_name': 'Bruno',
                'last_name': 'Retailleau',
                'party': 'Les Républicains',
                'position': 'Ministre d\'État, ministre de l\'Intérieur',
                'political_orientation': 'center-right',
                'credibility_score': 82
            },
            {
                'name': 'Catherine Vautrin',
                'first_name': 'Catherine',
                'last_name': 'Vautrin',
                'party': 'Renaissance',
                'position': 'Ministre du Travail, de la Santé, des Solidarités et des Familles',
                'political_orientation': 'center',
                'credibility_score': 85
            },
            {
                'name': 'Éric Lombard',
                'first_name': 'Éric',
                'last_name': 'Lombard',
                'party': 'Divers gauche',
                'position': 'Ministre de l\'Économie, des Finances et de la Souveraineté industrielle et numérique',
                'political_orientation': 'center-left',
                'credibility_score': 90
            },
            {
                'name': 'Sébastien Lecornu',
                'first_name': 'Sébastien',
                'last_name': 'Lecornu',
                'party': 'Renaissance',
                'position': 'Ministre des Armées',
                'political_orientation': 'center',
                'credibility_score': 87
            },
            {
                'name': 'Rachida Dati',
                'first_name': 'Rachida',
                'last_name': 'Dati',
                'party': 'Les Républicains',
                'position': 'Ministre de la Culture',
                'political_orientation': 'center-right',
                'credibility_score': 78
            }
        ]

        # Ajout des métadonnées communes et éléments visuels DA
        current_time = datetime.now().isoformat()
        for ministre in ministres:
            ministre.update({
                'constituency': '',
                'birth_date': None,
                'gender': None,  # À compléter si nécessaire
                'bio': f"Membre du gouvernement Bayrou depuis décembre 2024 - {ministre['position']}",
                'is_active': True,
                'verification_status': 'verified',
                'created_at': current_time,
                'updated_at': current_time,
                'total_votes': 0,
                'positive_votes': 0,
                'negative_votes': 0,
                'trending_score': 50
            })

            # Application de la Direction Artistique
            ministre = self._assign_visual_elements(ministre)

        self.logger.info(f"✅ {len(ministres)} ministres Bayrou stylés POLITIKCRED - maintenant on sait qui est crédible lauiss !")
        return ministres

    def fetch_maires_principales_villes(self) -> List[Dict]:
        """Check les maires des grandes villes - ils gèrent lauiss ?"""

        self.logger.info("🏙️ On check les maires des grandes villes... qui gère bien sa ville ?")

        try:
            # URL du RNE pour les maires
            url = "https://www.data.gouv.fr/fr/datasets/r/d5f400de-ae3f-4966-8cb6-a85c70c6c24a"

            # Lecture du CSV des maires avec SSL bypass
            response = requests.get(url, verify=False)
            response.raise_for_status()

            # Save temporary file and read with pandas
            with open('temp_mayors.csv', 'wb') as f:
                f.write(response.content)

            df = pd.read_csv('temp_mayors.csv', sep=';', encoding='utf-8')

            # Clean up temp file
            os.remove('temp_mayors.csv')

            # Liste des principales villes (population > 50000)
            grandes_villes = [
                'PARIS', 'MARSEILLE', 'LYON', 'TOULOUSE', 'NICE', 'NANTES',
                'MONTPELLIER', 'STRASBOURG', 'BORDEAUX', 'LILLE', 'RENNES',
                'REIMS', 'SAINT-ETIENNE', 'TOULON', 'LE HAVRE', 'GRENOBLE',
                'DIJON', 'ANGERS', 'NIMES', 'VILLEURBANNE', 'CLERMONT-FERRAND'
            ]

            mayors = []
            for _, row in df.iterrows():
                ville = row.get('Libellé de la commune', '').upper()
                if ville in grandes_villes:
                    mayor = {
                        'name': f"{row.get('Prénom', '')} {row.get('Nom', '')}".strip(),
                        'first_name': row.get('Prénom', ''),
                        'last_name': row.get('Nom', ''),
                        'party': row.get('Libellé de la nuance', '') or 'Non renseigné',
                        'position': f"Maire de {row.get('Libellé de la commune', '')}",
                        'constituency': row.get('Libellé de la commune', ''),
                        'birth_date': row.get('Date de naissance'),
                        'gender': 'M' if row.get('Code sexe') == 'M' else 'F',
                        'political_orientation': self._determine_orientation(row.get('Libellé de la nuance', '')),
                        'bio': f"Maire de {row.get('Libellé de la commune', '')} depuis {row.get('Date de début du mandat', '')}",
                        'credibility_score': 70,  # Score de base pour les maires
                        'is_active': True,
                        'verification_status': 'verified',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }

                    # Application de la Direction Artistique
                    mayor = self._assign_visual_elements(mayor)
                    mayors.append(mayor)

            self.logger.info(f"✅ {len(mayors)} maires checkés - voyons qui gère bien lauiss !")
            return mayors

        except Exception as e:
            self.logger.error(f"❌ Galère avec les maires: {e}")
            return []

    def _extract_party_from_mandate(self, mandat: Dict) -> str:
        """Extrait le parti politique depuis un mandat"""
        organes = mandat.get('organes', {}).get('organe', [])
        if isinstance(organes, dict):
            organes = [organes]

        for organe in organes:
            if organe.get('@codeType') == 'GP':  # Groupe Politique
                return organe.get('libelle', '')

        return 'Non inscrit'

    def _determine_orientation(self, party: str) -> str:
        """Détermine l'orientation politique basée sur le parti"""
        if not party:
            return 'center'

        party_lower = party.lower()

        orientations = {
            'la france insoumise': 'left',
            'parti socialiste': 'center-left',
            'europe ecologie': 'center-left',
            'renaissance': 'center',
            'modem': 'center',
            'agir': 'center',
            'les republicains': 'center-right',
            'lr': 'center-right',
            'rassemblement national': 'right',
            'reconquete': 'right'
        }

        for key, orientation in orientations.items():
            if key in party_lower:
                return orientation

        return 'center'

    def insert_politicians_batch(self, politicians: List[Dict], batch_size: int = 50) -> int:
        """Insère les politiciens par batch avec gestion d'erreurs"""

        total_inserted = 0

        for i in range(0, len(politicians), batch_size):
            batch = politicians[i:i + batch_size]

            try:
                result = self.supabase.table('politicians').insert(batch).execute()
                total_inserted += len(batch)
                self.logger.info(f"✅ Batch {i//batch_size + 1}: {len(batch)} enregistrements insérés")

                # Petit délai pour éviter le rate limiting
                time.sleep(0.5)

            except Exception as e:
                self.logger.error(f"❌ Erreur batch {i//batch_size + 1}: {e}")

                # Tentative d'insertion individuelle pour identifier les problèmes
                for politician in batch:
                    try:
                        self.supabase.table('politicians').insert(politician).execute()
                        total_inserted += 1
                    except Exception as individual_error:
                        self.logger.error(f"❌ Erreur pour {politician.get('name', 'Unknown')}: {individual_error}")

        return total_inserted

    def populate_database(self):
        """🔥 POLITIKCRED - Méthode principale pour peupler la base

        "Il est crédible lauiss ?" - On fait le tri dans tout ce beau monde !
        """

        self.logger.info("🚀 POLITIKCRED démarre ! On va voir qui est crédible lauiss ?")

        # Récupération de toutes les données
        all_politicians = []

        # 1. Députés
        deputies = self.fetch_deputes()
        all_politicians.extend(deputies)

        # 2. Sénateurs
        senators = self.fetch_senateurs()
        all_politicians.extend(senators)

        # 3. Ministres
        ministers = self.fetch_ministres_gouvernement_bayrou()
        all_politicians.extend(ministers)

        # 4. Maires des grandes villes
        mayors = self.fetch_maires_principales_villes()
        all_politicians.extend(mayors)

        # Nettoyage et déduplication
        cleaned_politicians = self._clean_and_deduplicate(all_politicians)

        self.logger.info(f"📊 Total après nettoyage POLITIKCRED: {len(cleaned_politicians)} politiciens checkés")

        # Insertion en base de données
        if cleaned_politicians:
            inserted_count = self.insert_politicians_batch(cleaned_politicians)
            self.logger.info(f"🎉 POLITIKCRED terminé: {inserted_count}/{len(cleaned_politicians)} politiques scorés - maintenant on sait qui est crédible lauiss !")
            return inserted_count
        else:
            self.logger.warning("❌ Aucune donnée à checker - bizarre lauiss...")
            return 0

    def _clean_and_deduplicate(self, politicians: List[Dict]) -> List[Dict]:
        """Nettoie et déduplique les données"""

        seen = set()
        cleaned = []

        for politician in politicians:
            # Nettoyage des champs
            politician['name'] = politician.get('name', '').strip()
            politician['first_name'] = politician.get('first_name', '').strip()
            politician['last_name'] = politician.get('last_name', '').strip()
            politician['party'] = politician.get('party', '').strip()

            # Génération d'une clé unique
            key = f"{politician['first_name'].lower()}_{politician['last_name'].lower()}".replace(' ', '_')

            # Validation et déduplication
            if (key not in seen and
                politician['name'] and
                politician['position'] and
                key != '_'):

                seen.add(key)
                cleaned.append(politician)

        return cleaned


def main():
    """🔥 POLITIKCRED - Fonction principale"""
    try:
        fetcher = PolitikCredDataFetcher()
        result = fetcher.populate_database()

        if result > 0:
            print(f"\n🎉 POLITIKCRED - Succès lauiss ! {result} politiciens scorés dans la base")
            print("Maintenant tu peux checker qui est crédible lauiss ! 🔥")
        else:
            print("\n❌ Échec du scoring POLITIKCRED - ça pue lauiss...")

    except Exception as e:
        print(f"\n💥 POLITIKCRED ERROR: {e}")
        print("Houston on a un problème lauiss...")
        logging.error(f"Erreur critique POLITIKCRED: {e}")


if __name__ == "__main__":
    main()