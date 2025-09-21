#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de peuplement automatique pour Politics Trust
Récupère les données des politiciens français depuis les APIs officielles

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
from typing import List, Dict, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import json
import time

# Ensure proper encoding for French characters
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Chargement des variables d'environnement
load_dotenv()

class PoliticsTrustDataFetcher:
    """Classe principale pour rÃ©cupÃ©rer et insÃ©rer les donnÃ©es politiques franÃ§aises"""
    
    def __init__(self):
        # Configuration Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Variables SUPABASE_URL et SUPABASE_ANON_KEY requises dans .env")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Configuration logging with UTF-8 encoding
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('politics_trust_sync.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def fetch_deputes(self) -> List[Dict]:
        """Récupère les députés depuis data.assemblee-nationale.fr"""

        self.logger.info("Récupération des députés...")
        
        # URLs pour l'API de l'Assemblée Nationale
        base_url = "https://data.assemblee-nationale.fr/static/openData/repository"
        
        try:
            # URL pour les députés en exercice (format JSON simplifié)
            url = f"{base_url}/16/amo/deputes/AMO30_deputes_actifs_mandats_actifs_organes_divises.json"
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
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
            
            self.logger.info(f"✅ {len(deputies)} députés récupérés")
            return deputies
            
        except Exception as e:
            self.logger.error(f"âŒ Erreur lors de la rÃ©cupÃ©ration des dÃ©putÃ©s: {e}")
            return []
    
    def fetch_senateurs(self) -> List[Dict]:
        """RÃ©cupÃ¨re les sÃ©nateurs depuis data.senat.fr"""
        
        self.logger.info("RÃ©cupÃ©ration des sÃ©nateurs...")
        
        try:
            # URL pour tÃ©lÃ©charger les donnÃ©es des sÃ©nateurs
            url = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv"
            
            # Lecture du fichier CSV
            df = pd.read_csv(url, sep=';', encoding='utf-8')
            
            senators = []
            for _, row in df.iterrows():
                # VÃ©rifier que le sÃ©nateur est actif
                if pd.isna(row.get('Date de fin de mandat')):
                    senator = {
                        'name': f"{row.get('PrÃ©nom', '')} {row.get('Nom usage', '') or row.get('Nom', '')}".strip(),
                        'first_name': row.get('PrÃ©nom', ''),
                        'last_name': row.get('Nom usage', '') or row.get('Nom', ''),
                        'party': row.get('Groupe politique', ''),
                        'position': 'SÃ©nateur',
                        'constituency': row.get('DÃ©partement', ''),
                        'birth_date': row.get('Date de naissance'),
                        'gender': 'M' if row.get('CivilitÃ©') == 'M.' else 'F',
                        'political_orientation': self._determine_orientation(row.get('Groupe politique', '')),
                        'bio': f"SÃ©nateur Ã©lu en {row.get('DÃ©but de mandat', '')}",
                        'credibility_score': 100,
                        'is_active': True,
                        'verification_status': 'verified',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    senators.append(senator)
            
            self.logger.info(f"âœ… {len(senators)} sÃ©nateurs rÃ©cupÃ©rÃ©s")
            return senators
            
        except Exception as e:
            self.logger.error(f"âŒ Erreur lors de la rÃ©cupÃ©ration des sÃ©nateurs: {e}")
            return []
    
    def fetch_ministres_gouvernement_bayrou(self) -> List[Dict]:
        """RÃ©cupÃ¨re les ministres du gouvernement Bayrou (DÃ©cembre 2024)"""
        
        self.logger.info("RÃ©cupÃ©ration des ministres du gouvernement Bayrou...")
        
        # DonnÃ©es du gouvernement Bayrou (source officielle)
        ministres = [
            {
                'name': 'FranÃ§ois Bayrou',
                'first_name': 'FranÃ§ois',
                'last_name': 'Bayrou',
                'party': 'MoDem',
                'position': 'Premier ministre, chargÃ© de la Planification Ã©cologique et Ã©nergÃ©tique',
                'political_orientation': 'center'
            },
            {
                'name': 'Ã‰lisabeth Borne',
                'first_name': 'Ã‰lisabeth',
                'last_name': 'Borne',
                'party': 'Renaissance',
                'position': 'Ministre d\'Ã‰tat, ministre de l\'Ã‰ducation nationale, de l\'Enseignement supÃ©rieur et de la Recherche',
                'political_orientation': 'center'
            },
            {
                'name': 'Manuel Valls',
                'first_name': 'Manuel',
                'last_name': 'Valls',
                'party': 'Renaissance',
                'position': 'Ministre d\'Ã‰tat, ministre des Outre-mer',
                'political_orientation': 'center-left'
            },
            {
                'name': 'GÃ©rald Darmanin',
                'first_name': 'GÃ©rald',
                'last_name': 'Darmanin',
                'party': 'Renaissance',
                'position': 'Ministre d\'Ã‰tat, garde des sceaux, ministre de la Justice',
                'political_orientation': 'center-right'
            },
            {
                'name': 'Bruno Retailleau',
                'first_name': 'Bruno',
                'last_name': 'Retailleau',
                'party': 'Les RÃ©publicains',
                'position': 'Ministre d\'Ã‰tat, ministre de l\'IntÃ©rieur',
                'political_orientation': 'center-right'
            },
            {
                'name': 'Catherine Vautrin',
                'first_name': 'Catherine',
                'last_name': 'Vautrin',
                'party': 'Renaissance',
                'position': 'Ministre du Travail, de la SantÃ©, des SolidaritÃ©s et des Familles',
                'political_orientation': 'center'
            },
            {
                'name': 'Ã‰ric Lombard',
                'first_name': 'Ã‰ric',
                'last_name': 'Lombard',
                'party': 'Divers gauche',
                'position': 'Ministre de l\'Ã‰conomie, des Finances et de la SouverainetÃ© industrielle et numÃ©rique',
                'political_orientation': 'center-left'
            },
            {
                'name': 'SÃ©bastien Lecornu',
                'first_name': 'SÃ©bastien',
                'last_name': 'Lecornu',
                'party': 'Renaissance',
                'position': 'Ministre des ArmÃ©es',
                'political_orientation': 'center'
            },
            {
                'name': 'Rachida Dati',
                'first_name': 'Rachida',
                'last_name': 'Dati',
                'party': 'Les RÃ©publicains',
                'position': 'Ministre de la Culture',
                'political_orientation': 'center-right'
            }
        ]
        
        # Ajout des mÃ©tadonnÃ©es communes
        current_time = datetime.now().isoformat()
        for ministre in ministres:
            ministre.update({
                'constituency': '',
                'birth_date': None,
                'gender': None,  # Ã€ complÃ©ter si nÃ©cessaire
                'bio': f"Membre du gouvernement Bayrou depuis dÃ©cembre 2024 - {ministre['position']}",
                'credibility_score': 100,
                'is_active': True,
                'verification_status': 'verified',
                'created_at': current_time,
                'updated_at': current_time,
                'total_votes': 0,
                'positive_votes': 0,
                'negative_votes': 0,
                'trending_score': 50
            })
        
        self.logger.info(f"âœ… {len(ministres)} ministres du gouvernement Bayrou")
        return ministres
    
    def fetch_maires_principales_villes(self) -> List[Dict]:
        """RÃ©cupÃ¨re les maires des principales villes franÃ§aises"""
        
        self.logger.info("RÃ©cupÃ©ration des maires des principales villes...")
        
        try:
            # URL du RNE pour les maires
            url = "https://www.data.gouv.fr/fr/datasets/r/d5f400de-ae3f-4966-8cb6-a85c70c6c24a"
            
            # Lecture du CSV des maires
            df = pd.read_csv(url, sep=';', encoding='utf-8')
            
            # Liste des principales villes (population > 50000)
            grandes_villes = [
                'PARIS', 'MARSEILLE', 'LYON', 'TOULOUSE', 'NICE', 'NANTES', 
                'MONTPELLIER', 'STRASBOURG', 'BORDEAUX', 'LILLE', 'RENNES',
                'REIMS', 'SAINT-ETIENNE', 'TOULON', 'LE HAVRE', 'GRENOBLE',
                'DIJON', 'ANGERS', 'NIMES', 'VILLEURBANNE', 'CLERMONT-FERRAND'
            ]
            
            mayors = []
            for _, row in df.iterrows():
                ville = row.get('LibellÃ© de la commune', '').upper()
                if ville in grandes_villes:
                    mayor = {
                        'name': f"{row.get('PrÃ©nom', '')} {row.get('Nom', '')}".strip(),
                        'first_name': row.get('PrÃ©nom', ''),
                        'last_name': row.get('Nom', ''),
                        'party': row.get('LibellÃ© de la nuance', '') or 'Non renseignÃ©',
                        'position': f"Maire de {row.get('LibellÃ© de la commune', '')}",
                        'constituency': row.get('LibellÃ© de la commune', ''),
                        'birth_date': row.get('Date de naissance'),
                        'gender': 'M' if row.get('Code sexe') == 'M' else 'F',
                        'political_orientation': self._determine_orientation(row.get('LibellÃ© de la nuance', '')),
                        'bio': f"Maire de {row.get('LibellÃ© de la commune', '')} depuis {row.get('Date de dÃ©but du mandat', '')}",
                        'credibility_score': 100,
                        'is_active': True,
                        'verification_status': 'verified',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    mayors.append(mayor)
            
            self.logger.info(f"âœ… {len(mayors)} maires des principales villes rÃ©cupÃ©rÃ©s")
            return mayors
            
        except Exception as e:
            self.logger.error(f"âŒ Erreur lors de la rÃ©cupÃ©ration des maires: {e}")
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
        """DÃ©termine l'orientation politique basÃ©e sur le parti"""
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
        """InsÃ¨re les politiciens par batch avec gestion d'erreurs"""
        
        total_inserted = 0
        
        for i in range(0, len(politicians), batch_size):
            batch = politicians[i:i + batch_size]
            
            try:
                result = self.supabase.table('politicians').insert(batch).execute()
                total_inserted += len(batch)
                self.logger.info(f"âœ… Batch {i//batch_size + 1}: {len(batch)} enregistrements insÃ©rÃ©s")
                
                # Petit dÃ©lai pour Ã©viter le rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                self.logger.error(f"âŒ Erreur batch {i//batch_size + 1}: {e}")
                
                # Tentative d'insertion individuelle pour identifier les problÃ¨mes
                for politician in batch:
                    try:
                        self.supabase.table('politicians').insert(politician).execute()
                        total_inserted += 1
                    except Exception as individual_error:
                        self.logger.error(f"âŒ Erreur pour {politician.get('name', 'Unknown')}: {individual_error}")
        
        return total_inserted
    
    def populate_database(self):
        """MÃ©thode principale pour peupler la base de donnÃ©es"""
        
        self.logger.info("ðŸš€ DÃ©but du peuplement de la base Politics Trust")
        
        # RÃ©cupÃ©ration de toutes les donnÃ©es
        all_politicians = []
        
        # 1. DÃ©putÃ©s
        deputies = self.fetch_deputes()
        all_politicians.extend(deputies)
        
        # 2. SÃ©nateurs
        senators = self.fetch_senateurs()
        all_politicians.extend(senators)
        
        # 3. Ministres
        ministers = self.fetch_ministres_gouvernement_bayrou()
        all_politicians.extend(ministers)
        
        # 4. Maires des grandes villes
        mayors = self.fetch_maires_principales_villes()
        all_politicians.extend(mayors)
        
        # Nettoyage et dÃ©duplication
        cleaned_politicians = self._clean_and_deduplicate(all_politicians)
        
        self.logger.info(f"ðŸ“Š Total aprÃ¨s nettoyage: {len(cleaned_politicians)} politiciens")
        
        # Insertion en base de donnÃ©es
        if cleaned_politicians:
            inserted_count = self.insert_politicians_batch(cleaned_politicians)
            self.logger.info(f"âœ… Peuplement terminÃ©: {inserted_count}/{len(cleaned_politicians)} enregistrements insÃ©rÃ©s")
            return inserted_count
        else:
            self.logger.warning("âŒ Aucune donnÃ©e Ã  insÃ©rer")
            return 0
    
    def _clean_and_deduplicate(self, politicians: List[Dict]) -> List[Dict]:
        """Nettoie et dÃ©duplique les donnÃ©es"""
        
        seen = set()
        cleaned = []
        
        for politician in politicians:
            # Nettoyage des champs
            politician['name'] = politician.get('name', '').strip()
            politician['first_name'] = politician.get('first_name', '').strip()
            politician['last_name'] = politician.get('last_name', '').strip()
            politician['party'] = politician.get('party', '').strip()
            
            # GÃ©nÃ©ration d'une clÃ© unique
            key = f"{politician['first_name'].lower()}_{politician['last_name'].lower()}".replace(' ', '_')
            
            # Validation et dÃ©duplication
            if (key not in seen and 
                politician['name'] and 
                politician['position'] and 
                key != '_'):
                
                seen.add(key)
                cleaned.append(politician)
        
        return cleaned


def main():
    """Fonction principale"""
    try:
        fetcher = PoliticsTrustDataFetcher()
        result = fetcher.populate_database()
        
        if result > 0:
            print(f"\nðŸŽ‰ SuccÃ¨s! {result} politiciens ajoutÃ©s Ã  votre base Politics Trust")
        else:
            print("\nâŒ Ã‰chec du peuplement de la base de donnÃ©es")
            
    except Exception as e:
        print(f"\nðŸ’¥ Erreur critique: {e}")
        logging.error(f"Erreur critique: {e}")


if __name__ == "__main__":
    main()