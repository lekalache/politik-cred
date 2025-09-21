# Politics Trust - IntÃ©gration DonnÃ©es FranÃ§aises

SystÃ¨me automatisÃ© de peuplement et synchronisation des donnÃ©es politiques franÃ§aises pour la plateforme Politics Trust.

## ðŸŽ¯ Objectif

IntÃ©grer automatiquement les donnÃ©es officielles franÃ§aises (dÃ©putÃ©s, sÃ©nateurs, ministres, maires) dans votre base de donnÃ©es Politics Trust via les APIs gouvernementales.

## ðŸ“Š Sources de donnÃ©es

### APIs Officielles
- **AssemblÃ©e Nationale** : 577 dÃ©putÃ©s (mise Ã  jour quotidienne)
- **SÃ©nat** : 348 sÃ©nateurs (mise Ã  jour quotidienne)  
- **RÃ©pertoire National des Ã‰lus** : 567,222 Ã©lus locaux (trimestrielle)
- **Gouvernement** : ~40 ministres (Ã  chaque remaniement)

### DonnÃ©es spÃ©cialisÃ©es
- **Nos donnÃ©es parlementaires** : Votes et activitÃ©s
- **Datan** : Statistiques parlementaires
- **Pappers Politique** : Veille lÃ©gislative

## ðŸš€ Installation rapide

### 1. PrÃ©requis
```bash
pip install supabase requests pandas python-dotenv
```

### 2. Configuration
CrÃ©er un fichier `.env` :
```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clÃ©-publique-supabase
```

### 3. PremiÃ¨re synchronisation
```bash
python populate-politics-trust.py
```

## ðŸ“ Structure du projet

```
politics-trust-data/
â”œâ”€â”€ populate-politics-trust.py    # Script principal
â”œâ”€â”€ guide-donnees-politiciens-francais.md  # Documentation dÃ©taillÃ©e
â”œâ”€â”€ .env                          # Configuration (Ã  crÃ©er)
â”œâ”€â”€ requirements.txt              # DÃ©pendances
â””â”€â”€ README.md                     # Ce fichier
```

## ðŸ”„ Automatisation

### Configuration CRON
```bash
# Ã‰diter les tÃ¢ches CRON
crontab -e

# Synchronisation quotidienne (6h du matin)
0 6 * * * cd /path/to/politics-trust-data && python populate-politics-trust.py

# Synchronisation hebdomadaire complÃ¨te (dimanche 3h)
0 3 * * 0 cd /path/to/politics-trust-data && python populate-politics-trust.py --full-sync
```

### Surveillance des logs
```bash
# Voir les logs en temps rÃ©el
tail -f politics_trust_sync.log

# Rechercher les erreurs
grep "ERROR" politics_trust_sync.log
```

## ðŸ—„ï¸ Mapping vers votre schÃ©ma

Le script s'adapte automatiquement Ã  votre schÃ©ma `politicians` :

```sql
-- Correspondance des champs
{
  "name": "Emmanuel Macron",           -- Nom complet
  "first_name": "Emmanuel",           -- PrÃ©nom  
  "last_name": "Macron",              -- Nom de famille
  "party": "Renaissance",             -- Parti politique
  "position": "PrÃ©sident",            -- Fonction
  "constituency": "National",         -- Circonscription
  "birth_date": "1977-12-21",         -- Date de naissance
  "gender": "M",                      -- Genre (M/F)
  "political_orientation": "center",   -- Orientation (left/center-left/center/center-right/right)
  "credibility_score": 100,           -- Score initial
  "is_active": true,                  -- Statut actif
  "verification_status": "verified"    -- VÃ©rifiÃ©
}
```

## ðŸ“ˆ Volumes de donnÃ©es

### Phase 1 - Essentiels (~1,000 records)
- âœ… 577 DÃ©putÃ©s
- âœ… 348 SÃ©nateurs  
- âœ… ~40 Ministres du gouvernement Bayrou
- âœ… ~50 Maires des grandes villes

### Phase 2 - Extension (~6,000 records)
- ðŸ”„ Conseillers rÃ©gionaux (1,758)
- ðŸ”„ Conseillers dÃ©partementaux (4,044)

### Phase 3 - Complet (567,222 records)
- ðŸ“‹ Tous les Ã©lus locaux (sur demande)

## âš ï¸ ConsidÃ©rations importantes

### Limitations techniques
- **Rate limiting** : DÃ©lais entre requÃªtes
- **Volumes** : Filtrage des Ã©lus locaux recommandÃ©
- **Mises Ã  jour** : FrÃ©quences variables selon les sources

### Bonnes pratiques
- Logs dÃ©taillÃ©s de toutes les opÃ©rations
- DÃ©duplication automatique
- Gestion d'erreurs robuste
- Validation des donnÃ©es avant insertion

## ðŸ”§ Personnalisation

### Filtrer les Ã©lus locaux
```python
# Dans populate-politics-trust.py, modifier :
def fetch_maires_principales_villes(self):
    # Ajouter vos critÃ¨res de filtrage
    population_min = 100000  # Villes > 100k habitants
    # ...
```

### Ajouter des champs personnalisÃ©s
```python
# Exemple d'ajout de mÃ©tadonnÃ©es
politician.update({
    'source': 'assemblee-nationale',
    'last_sync': datetime.now().isoformat(),
    'data_quality_score': 95
})
```

## ðŸ†˜ RÃ©solution de problÃ¨mes

### Erreurs communes

**ðŸ”´ "Variables SUPABASE_URL et SUPABASE_ANON_KEY requises"**
- VÃ©rifiez votre fichier `.env`
- Variables d'environnement correctes

**ðŸ”´ "Erreur lors de l'insertion du batch"**
- VÃ©rifiez les permissions Supabase
- SchÃ©ma de table compatible
- Quotas non dÃ©passÃ©s

**ðŸ”´ "Timeout lors de la rÃ©cupÃ©ration"**
- Connexion internet stable
- APIs gouvernementales temporairement inaccessibles

### Debugging
```python
# Mode debug dÃ©taillÃ©
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

## ðŸ”„ Mises Ã  jour

### Gouvernement actuel (DÃ©cembre 2024)
- **Premier ministre** : FranÃ§ois Bayrou (MoDem)
- **Gouvernement** : Coalition centre-droite
- **Composition** : 36 membres (18H/18F)

### Suivi des changements
Le script dÃ©tecte automatiquement :
- Nouveaux dÃ©putÃ©s/sÃ©nateurs
- Changements de gouvernement
- Mises Ã  jour du RNE

## ðŸ“ž Support

### Documentation officielle
- [API AssemblÃ©e Nationale](https://data.assemblee-nationale.fr)
- [Data SÃ©nat](https://data.senat.fr)
- [Data.gouv.fr](https://www.data.gouv.fr)

### Contacts techniques
- **AssemblÃ©e** : opendata@assemblee-nationale.fr
- **SÃ©nat** : opendata-tech@senat.fr
- **Data.gouv.fr** : support@data.gouv.fr

### Issues GitHub
Pour signaler des bugs ou demander des fonctionnalitÃ©s : [CrÃ©er une issue]

## ðŸ“œ Licences

- **DonnÃ©es gouvernementales** : Licence Ouverte 2.0
- **Script** : MIT License
- **APIs tierces** : VÃ©rifier conditions d'usage

## ðŸŽ¯ Roadmap

### Version actuelle (1.0)
- âœ… IntÃ©gration APIs de base
- âœ… DÃ©duplication automatique
- âœ… Logs dÃ©taillÃ©s

### Version future (1.1)
- ðŸ”„ Webhook notifications
- ðŸ”„ Interface de monitoring
- ðŸ”„ Export donnÃ©es formatÃ©es

---

**DerniÃ¨re mise Ã  jour** : Septembre 2025  
**CompatibilitÃ©** : Python 3.8+, PostgreSQL, Supabase  
**Maintenance** : Active



Approche recommandée
Phase 1 - Démarrage (~1,000 enregistrements)
	1.	Députés : 577 records via API Assemblée Nationale
	2.	Sénateurs : 348 records via API Sénat
	3.	Ministres : ~40 records du gouvernement Bayrou
	4.	Maires principales villes : ~50 records filtrés

    Mise en œuvre simple
	1.	Installation :

    	2.	Configuration :Créer un fichier `.env` avec vos clés Supabase
	3.	Première synchronisation : python populate-politics-trust.py

   
   Avantages de cette solution
Données officielles et fiables
	•	Sources gouvernementales certifiées
	•	Mises à jour régulières automatiques
	•	Licence ouverte réutilisable
Intégration native avec votre schéma
	•	Mapping automatique vers votre table `politicians`
	•	Gestion des champs requis et optionnels
	•	Déduplication et validation intégrées
Robustesse et maintenabilité
	•	Gestion d’erreurs complète
	•	Logs détaillés pour debugging
	•	Insertion par batch pour performance
	•	Configuration flexible
Couverture complète du paysage politique français
	•	Niveau national : Président, ministres, députés, sénateurs
	•	Niveau local : maires, conseillers de tous niveaux
	•	Données historiques disponibles
	•	Informations sur partis et orientations politiques