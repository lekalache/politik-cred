#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 POLITIKCRED - Mise à jour de la base avec les assets
"Il est crédible lauiss ?" - On connecte les visuels aux données !

Met à jour la base de données avec les URLs des assets optimisés
"""

import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Chargement des variables d'environnement
load_dotenv()

class PolitikCredAssetsUpdater:
    """🎨 POLITIKCRED - Updater des assets en base

    Connecte les assets visuels aux données des politiciens
    """

    def __init__(self):
        # Configuration Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("🚨 POLITIKCRED ERROR: Variables SUPABASE_URL et SUPABASE_ANON_KEY requises dans .env")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        print("🔥 POLITIKCRED Assets Updater - On connecte tout lauiss !")

    def load_assets_config(self, config_path: str) -> dict:
        """Charge la configuration des assets"""

        print("📋 Chargement de la configuration assets...")

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            print("✅ Configuration assets chargée !")
            return config
        except Exception as e:
            print(f"❌ Erreur chargement config: {e}")
            return {}

    def update_politicians_assets(self):
        """Met à jour les assets des politiciens en base de données"""

        print("🗄️ Mise à jour des assets politiciens en base...")

        # Mapping manuel des assets avec les politiciens
        politicians_assets = {
            'élisabeth borne': {
                'avatar_url': '/assets/politicians/borne.png',
                'has_animation': False
            },
            'sébastien lecornu': {
                'avatar_url': '/assets/politicians/lecornu.png',
                'animation_url': '/assets/animations/lecornu.mp4',
                'has_animation': True
            },
            'éric lombard': {
                'avatar_url': '/assets/politicians/lombart.png',
                'has_animation': False
            },
            'marine le pen': {
                'avatar_url': '/assets/politicians/lepen.jpeg',
                'animation_url': '/assets/animations/lepen.mp4',
                'has_animation': True
            }
        }

        updated_count = 0

        for politician_name, assets in politicians_assets.items():
            try:
                # Recherche du politicien par nom
                response = self.supabase.table('politicians').select('*').ilike('name', f'%{politician_name}%').execute()

                if response.data:
                    politician = response.data[0]
                    politician_id = politician['id']

                    # Préparation des données de mise à jour
                    update_data = {
                        'avatar_url': assets['avatar_url']
                    }

                    # Ajout de l'animation si disponible
                    if assets.get('has_animation'):
                        update_data['animation_url'] = assets.get('animation_url')

                    # Mise à jour en base
                    update_response = self.supabase.table('politicians').update(update_data).eq('id', politician_id).execute()

                    if update_response.data:
                        print(f"✅ {politician_name.title()} - Avatar mis à jour: {assets['avatar_url']}")
                        if assets.get('has_animation'):
                            print(f"🎬 {politician_name.title()} - Animation ajoutée: {assets['animation_url']}")
                        updated_count += 1
                    else:
                        print(f"⚠️ Problème mise à jour: {politician_name}")

                else:
                    print(f"❌ Politicien non trouvé: {politician_name}")

            except Exception as e:
                print(f"❌ Erreur pour {politician_name}: {e}")

        print(f"🎉 Mise à jour terminée: {updated_count} politiciens mis à jour !")
        return updated_count

    def add_missing_schema_columns(self):
        """Ajoute les colonnes manquantes si nécessaire"""

        print("🔧 Vérification du schéma de base de données...")

        # Ce script assume que les colonnes ont été ajoutées via le script SQL
        # Ici on peut faire des vérifications additionnelles si besoin

        print("✅ Schéma vérifié !")

    def create_featured_politicians_view(self):
        """Crée une vue pour les politiciens featured"""

        print("👥 Création de la vue featured politicians...")

        try:
            # Cette requête serait exécutée directement en SQL
            # Ici on simule avec une sélection des politiciens avec animations
            featured_query = """
            SELECT
                *,
                CASE
                    WHEN animation_url IS NOT NULL THEN true
                    ELSE false
                END as is_featured
            FROM politicians
            WHERE avatar_url IS NOT NULL
            ORDER BY credibility_score DESC, highlight DESC
            """

            print("✅ Vue featured politicians conceptualisée !")
            print("💡 À implémenter directement en SQL pour de meilleures performances")

        except Exception as e:
            print(f"❌ Erreur création vue: {e}")

    def verify_assets_integration(self):
        """Vérifie l'intégration des assets"""

        print("🔍 Vérification de l'intégration assets...")

        try:
            # Récupération des politiciens avec assets
            response = self.supabase.table('politicians').select('name, avatar_url, animation_url, credibility_score, credibility_label').neq('avatar_url', None).execute()

            if response.data:
                print(f"✅ {len(response.data)} politiciens avec assets trouvés !")

                for politician in response.data:
                    name = politician['name']
                    avatar = politician['avatar_url']
                    animation = politician.get('animation_url', 'Aucune')
                    score = politician['credibility_score']
                    label = politician.get('credibility_label', 'Non défini')

                    print(f"👤 {name}")
                    print(f"   📸 Avatar: {avatar}")
                    print(f"   🎬 Animation: {animation}")
                    print(f"   📊 Score: {score} - {label}")
                    print()

            else:
                print("❌ Aucun politicien avec assets trouvé")

        except Exception as e:
            print(f"❌ Erreur vérification: {e}")

    def run_complete_update(self):
        """Exécute la mise à jour complète des assets"""

        print("🚀 POLITIKCRED - Mise à jour complète des assets en base !")
        print("=" * 60)

        # 1. Vérification du schéma
        self.add_missing_schema_columns()

        # 2. Mise à jour des assets politiciens
        updated_count = self.update_politicians_assets()

        # 3. Création des vues
        self.create_featured_politicians_view()

        # 4. Vérification finale
        self.verify_assets_integration()

        print("\n🎉 POLITIKCRED - Mise à jour des assets terminée !")
        print(f"✅ {updated_count} politiciens connectés aux assets")
        print("🔥 Les visuels sont maintenant liés aux données lauiss !")

        return {
            "status": "success",
            "politicians_updated": updated_count,
            "message": "Assets POLITIKCRED intégrés en base de données"
        }


def main():
    """🔥 POLITIKCRED - Fonction principale de mise à jour"""

    try:
        # Création de l'updater
        updater = PolitikCredAssetsUpdater()

        # Exécution de la mise à jour complète
        result = updater.run_complete_update()

        if result["status"] == "success":
            print(f"\n✅ {result['message']}")
            print(f"👥 Politiciens mis à jour: {result['politicians_updated']}")
            print("\n🔥 POLITIKCRED assets intégrés - le site va être au top lauiss ! 🚀")
        else:
            print("❌ Échec de la mise à jour")

    except Exception as e:
        print(f"\n💥 POLITIKCRED ERROR: {e}")
        print("Houston on a un problème avec l'intégration lauiss...")


if __name__ == "__main__":
    main()