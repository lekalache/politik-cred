#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 POLITIKCRED - Script d'optimisation des assets visuels
"Il est crédible lauiss ?" - On optimise tout pour le site !

Organise et optimise les assets selon la Direction Artistique POLITIKCRED
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any

class PolitikCredAssetsOptimizer:
    """🎨 POLITIKCRED - Optimiseur d'assets visuels

    Street science pour organiser nos visuels selon la DA !
    """

    def __init__(self, images_dir: str, output_dir: str = None):
        self.images_dir = Path(images_dir)
        self.output_dir = Path(output_dir) if output_dir else Path("../politics-trust/public/assets")
        self.assets_config = {}

        print("🔥 POLITIKCRED Assets Optimizer - On optimise tout lauiss !")

    def analyze_assets(self) -> Dict[str, Any]:
        """Analyse les assets disponibles et leur utilisation"""

        print("📊 Analyse des assets disponibles...")

        assets = {
            "logo": [],
            "backgrounds": [],
            "politicians_static": [],
            "politicians_animated": [],
            "ratio_analysis": {}
        }

        if not self.images_dir.exists():
            print(f"❌ Dossier images introuvable: {self.images_dir}")
            return assets

        for file_path in self.images_dir.iterdir():
            if file_path.is_file():
                file_name = file_path.name.lower()
                file_stem = file_path.stem.lower()

                print(f"🔍 Analyse: {file_name}")

                # Classification selon le nom et type
                if file_name.endswith('.png') and any(keyword in file_stem for keyword in ['logo', 'icon']):
                    assets["logo"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "usage": "favicon, logo compact",
                        "optimization": "compression PNG, multiple sizes"
                    })

                elif file_name == 'animated-hemi.mp4':
                    assets["backgrounds"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "usage": "Hero background - 'Évaluez la crédibilité'",
                        "loop": True,
                        "fullscreen": True,
                        "optimization": "compression pour web, fallback image"
                    })

                elif file_name == 'hemicycle.png':
                    assets["backgrounds"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "usage": "Fallback pour animated-hemi.mp4",
                        "optimization": "WebP conversion, lazy loading"
                    })

                elif file_name.endswith('.png') and any(name in file_stem for name in ['borne', 'lecornu', 'lombart']):
                    assets["politicians_static"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "politician": file_stem,
                        "usage": "Gallery grid, cards politiciens",
                        "style": "Family Guy cartoon",
                        "optimization": "WebP conversion, responsive sizes"
                    })

                elif file_name.endswith('.mp4') and any(name in file_stem for name in ['lecornu', 'lepen']):
                    assets["politicians_animated"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "politician": file_stem,
                        "usage": "Featured section - côte à côte",
                        "compatible_ratio": True,
                        "optimization": "compression, poster image"
                    })

                elif file_name.endswith(('.mp4', '.mov')):
                    assets["politicians_animated"].append({
                        "file": file_name,
                        "path": str(file_path),
                        "politician": file_stem,
                        "usage": "Animation politicien individual",
                        "optimization": "compression, poster generation"
                    })

        self.assets_config = assets
        print(f"✅ {len(list(self.images_dir.iterdir()))} assets analysés !")
        return assets

    def create_assets_structure(self):
        """Crée la structure d'assets optimisée pour POLITIKCRED"""

        print("🏗️ Création de la structure d'assets POLITIKCRED...")

        # Structure cible
        structure = {
            "logo": self.output_dir / "logo",
            "backgrounds": self.output_dir / "backgrounds",
            "politicians": self.output_dir / "politicians",
            "animations": self.output_dir / "animations",
            "optimized": self.output_dir / "optimized"
        }

        # Création des dossiers
        for folder_name, folder_path in structure.items():
            folder_path.mkdir(parents=True, exist_ok=True)
            print(f"📁 Dossier créé: {folder_name}")

        return structure

    def optimize_and_organize(self):
        """Optimise et organise les assets selon la DA POLITIKCRED"""

        print("🚀 Optimisation et organisation des assets...")

        structure = self.create_assets_structure()

        for asset_type, assets_list in self.assets_config.items():
            if not assets_list:
                continue

            print(f"\n📦 Traitement: {asset_type}")

            for asset in assets_list:
                source_path = Path(asset["path"])

                if asset_type == "logo":
                    # Copie vers dossier logo
                    dest_path = structure["logo"] / source_path.name
                    shutil.copy2(source_path, dest_path)
                    print(f"📋 Logo: {source_path.name} → {dest_path}")

                elif asset_type == "backgrounds":
                    # Copie vers dossier backgrounds
                    dest_path = structure["backgrounds"] / source_path.name
                    shutil.copy2(source_path, dest_path)
                    print(f"🌅 Background: {source_path.name} → {dest_path}")

                elif asset_type == "politicians_static":
                    # Copie vers dossier politicians
                    dest_path = structure["politicians"] / source_path.name
                    shutil.copy2(source_path, dest_path)
                    print(f"👤 Politicien: {source_path.name} → {dest_path}")

                elif asset_type == "politicians_animated":
                    # Copie vers dossier animations
                    dest_path = structure["animations"] / source_path.name
                    shutil.copy2(source_path, dest_path)
                    print(f"🎬 Animation: {source_path.name} → {dest_path}")

        print("✅ Assets organisés selon la DA POLITIKCRED !")

    def generate_assets_config_json(self):
        """Génère le fichier de configuration JSON pour l'intégration site"""

        print("📝 Génération du fichier de configuration assets...")

        # Configuration pour l'intégration site
        site_config = {
            "politikcred_assets": {
                "brand": {
                    "name": "POLITIKCRED",
                    "baseline": "Il est crédible lauiss ?",
                    "style": "Street Science + Family Guy cartoon"
                },
                "hero_section": {
                    "background_video": "/assets/backgrounds/animated-hemi.mp4",
                    "fallback_image": "/assets/backgrounds/hemicycle.png",
                    "title": "Évaluez la crédibilité de vos représentants",
                    "cta": "Il est crédible lauiss ?",
                    "loop": True,
                    "autoplay": True,
                    "muted": True
                },
                "featured_politicians": {
                    "layout": "side_by_side",
                    "videos": [
                        {
                            "file": "/assets/animations/lecornu.mp4",
                            "politician": "Sébastien Lecornu",
                            "position": "left",
                            "poster": "/assets/politicians/lecornu.png"
                        },
                        {
                            "file": "/assets/animations/lepen.mp4",
                            "politician": "Marine Le Pen",
                            "position": "right",
                            "poster": "/assets/politicians/lepen.jpeg"
                        }
                    ],
                    "sync_animation": True
                },
                "politicians_gallery": {
                    "layout": "grid",
                    "politicians": [
                        {
                            "name": "Élisabeth Borne",
                            "image": "/assets/politicians/borne.png",
                            "credibility_score": 88,
                            "credibility_label": "Il assure lauiss !",
                            "party": "Renaissance",
                            "card_color": "#1E3A8A"
                        },
                        {
                            "name": "Sébastien Lecornu",
                            "image": "/assets/politicians/lecornu.png",
                            "credibility_score": 87,
                            "credibility_label": "Il assure lauiss !",
                            "party": "Renaissance",
                            "card_color": "#1E3A8A"
                        },
                        {
                            "name": "Éric Lombard",
                            "image": "/assets/politicians/lombart.png",
                            "credibility_score": 90,
                            "credibility_label": "Il assure lauiss !",
                            "party": "Divers gauche",
                            "card_color": "#059669"
                        }
                    ]
                },
                "design_system": {
                    "colors": {
                        "bleu_republique": "#1E3A8A",
                        "rouge_tricolore": "#DC2626",
                        "blanc_casse": "#FAFAFA",
                        "vert_assemblee": "#059669",
                        "or_institutionnel": "#D97706",
                        "bordeaux_serieux": "#7C2D12",
                        "rose_surprise": "#EC4899",
                        "jaune_attention": "#EAB308"
                    },
                    "credibility_labels": {
                        "high": "Il assure lauiss !",
                        "medium": "Moyen lauiss...",
                        "low": "Louche lauiss !"
                    },
                    "expressions": {
                        "confident": "😎",
                        "neutral": "😐",
                        "skeptical": "🤨"
                    }
                },
                "optimization": {
                    "video_formats": ["mp4", "webm"],
                    "image_formats": ["webp", "png", "jpg"],
                    "lazy_loading": True,
                    "responsive_images": True,
                    "compression": "high_quality"
                }
            }
        }

        # Sauvegarde de la configuration
        config_path = self.output_dir / "politikcred-assets-config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(site_config, f, indent=2, ensure_ascii=False)

        print(f"✅ Configuration sauvegardée: {config_path}")
        return site_config

    def generate_integration_components(self):
        """Génère les composants d'intégration pour le site"""

        print("⚛️ Génération des composants d'intégration...")

        # Composant Hero React/Next.js
        hero_component = '''import React from 'react';

const PolitikCredHero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/assets/backgrounds/hemicycle.png"
      >
        <source src="/assets/backgrounds/animated-hemi.mp4" type="video/mp4" />
        {/* Fallback image */}
        <img
          src="/assets/backgrounds/hemicycle.png"
          alt="Hémicycle"
          className="w-full h-full object-cover"
        />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-center text-white">
        <div className="max-w-4xl px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            🔥 POLITIKCRED
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold mb-8">
            Évaluez la crédibilité de vos représentants
          </h2>
          <button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xl md:text-2xl px-8 py-4 rounded-lg font-bold transition-colors">
            Il est crédible lauiss ? 🤔
          </button>
        </div>
      </div>
    </section>
  );
};

export default PolitikCredHero;'''

        # Composant Featured Politicians
        featured_component = '''import React from 'react';

const FeaturedPoliticians = () => {
  return (
    <section className="py-16 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A]">
          Qui dit vrai lauiss ? 🎯
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Lecornu Video */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <video
              className="w-full h-64 object-cover"
              controls
              poster="/assets/politicians/lecornu.png"
            >
              <source src="/assets/animations/lecornu.mp4" type="video/mp4" />
            </video>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Sébastien Lecornu</h3>
              <p className="text-gray-600">Ministre des Armées</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl">🏆</span>
                <span className="font-bold text-[#059669]">Il assure lauiss !</span>
                <span className="text-xl font-bold">87/100</span>
              </div>
            </div>
          </div>

          {/* Le Pen Video */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <video
              className="w-full h-64 object-cover"
              controls
              poster="/assets/politicians/lepen.jpeg"
            >
              <source src="/assets/animations/lepen.mp4" type="video/mp4" />
            </video>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#7C2D12]">Marine Le Pen</h3>
              <p className="text-gray-600">Députée RN</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl">⚖️</span>
                <span className="font-bold text-[#D97706]">Moyen lauiss...</span>
                <span className="text-xl font-bold">65/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPoliticians;'''

        # Composant Gallery
        gallery_component = '''import React from 'react';

const PoliticiansGallery = ({ politicians }) => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A]">
          Le Palmarès POLITIKCRED 🏆
        </h2>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {politicians.map((politician, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 hover:shadow-xl transition-shadow"
              style={{ borderColor: politician.card_color }}
            >
              <img
                src={politician.image}
                alt={politician.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{politician.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{politician.party}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg">
                    {politician.credibility_score >= 80 ? '🏆' :
                     politician.credibility_score >= 60 ? '⚖️' : '⚠️'}
                  </span>
                  <span className="text-sm font-bold" style={{ color: politician.card_color }}>
                    {politician.credibility_label}
                  </span>
                  <span className="font-bold text-lg">
                    {politician.credibility_score}/100
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PoliticiansGallery;'''

        # Sauvegarde des composants
        components_dir = self.output_dir / "components"
        components_dir.mkdir(exist_ok=True)

        with open(components_dir / "PolitikCredHero.jsx", 'w', encoding='utf-8') as f:
            f.write(hero_component)

        with open(components_dir / "FeaturedPoliticians.jsx", 'w', encoding='utf-8') as f:
            f.write(featured_component)

        with open(components_dir / "PoliticiansGallery.jsx", 'w', encoding='utf-8') as f:
            f.write(gallery_component)

        print("✅ Composants React générés !")
        print(f"📁 Dossier: {components_dir}")

    def generate_css_styles(self):
        """Génère les styles CSS pour POLITIKCRED"""

        print("🎨 Génération des styles CSS POLITIKCRED...")

        css_content = '''/* 🔥 POLITIKCRED - Direction Artistique CSS */
/* "Il est crédible lauiss ?" - Styles street science ! */

:root {
  /* Couleurs POLITIKCRED Direction Artistique */
  --bleu-republique: #1E3A8A;
  --rouge-tricolore: #DC2626;
  --blanc-casse: #FAFAFA;
  --vert-assemblee: #059669;
  --or-institutionnel: #D97706;
  --bordeaux-serieux: #7C2D12;
  --rose-surprise: #EC4899;
  --jaune-attention: #EAB308;
}

/* Hero Section */
.politikcred-hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.politikcred-hero video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
}

.politikcred-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.politikcred-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
  text-align: center;
}

/* Cards Politiciens */
.politician-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  border-left: 4px solid var(--bleu-republique);
}

.politician-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.politician-card.confident {
  border-left-color: var(--vert-assemblee);
}

.politician-card.neutral {
  border-left-color: var(--or-institutionnel);
}

.politician-card.skeptical {
  border-left-color: var(--rouge-tricolore);
}

/* Credibility Badges */
.credibility-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
}

.credibility-high {
  background: var(--vert-assemblee);
  color: white;
}

.credibility-medium {
  background: var(--or-institutionnel);
  color: white;
}

.credibility-low {
  background: var(--rouge-tricolore);
  color: white;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

/* Responsive Video */
.responsive-video {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 ratio */
}

.responsive-video video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Typography */
.politikcred-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 900;
  color: var(--bleu-republique);
}

.politikcred-baseline {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: var(--rouge-tricolore);
}

/* Buttons */
.btn-politikcred {
  background: var(--rouge-tricolore);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-politikcred:hover {
  background: var(--bordeaux-serieux);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Grid Layout */
.politicians-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
}

/* Featured Section */
.featured-politicians {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .featured-politicians {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

/* Loading States */
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}'''

        # Sauvegarde du CSS
        css_path = self.output_dir / "politikcred-styles.css"
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)

        print(f"✅ Styles CSS sauvegardés: {css_path}")

    def run_complete_optimization(self):
        """Exécute l'optimisation complète des assets POLITIKCRED"""

        print("🚀 POLITIKCRED - Optimisation complète des assets !")
        print("=" * 50)

        # 1. Analyse des assets
        self.analyze_assets()

        # 2. Organisation des fichiers
        self.optimize_and_organize()

        # 3. Génération de la configuration
        self.generate_assets_config_json()

        # 4. Génération des composants
        self.generate_integration_components()

        # 5. Génération du CSS
        self.generate_css_styles()

        print("\n🎉 POLITIKCRED - Optimisation terminée !")
        print("Tous les assets sont prêts pour l'intégration site lauiss ! 🔥")

        return {
            "status": "success",
            "message": "Assets POLITIKCRED optimisés et organisés",
            "output_directory": str(self.output_dir),
            "assets_analyzed": len(list(self.images_dir.iterdir())),
            "components_generated": 3,
            "files_created": [
                "politikcred-assets-config.json",
                "politikcred-styles.css",
                "components/PolitikCredHero.jsx",
                "components/FeaturedPoliticians.jsx",
                "components/PoliticiansGallery.jsx"
            ]
        }


def main():
    """🔥 POLITIKCRED - Fonction principale d'optimisation"""

    # Configuration des chemins
    images_dir = "/Users/ayoubkalache/repos/politics-trust/images"
    output_dir = "/Users/ayoubkalache/repos/politics-trust/politics-trust/public/assets"

    # Création de l'optimiseur
    optimizer = PolitikCredAssetsOptimizer(images_dir, output_dir)

    # Exécution de l'optimisation complète
    result = optimizer.run_complete_optimization()

    if result["status"] == "success":
        print(f"\n✅ {result['message']}")
        print(f"📁 Dossier de sortie: {result['output_directory']}")
        print(f"📊 Assets analysés: {result['assets_analyzed']}")
        print(f"⚛️ Composants générés: {result['components_generated']}")
        print("\n📋 Fichiers créés:")
        for file in result["files_created"]:
            print(f"  - {file}")

        print("\n🔥 POLITIKCRED est prêt à débarquer sur le site lauiss !")
    else:
        print("❌ Échec de l'optimisation")


if __name__ == "__main__":
    main()