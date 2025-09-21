# Politics Trust - Plateforme de crédibilité politique

Une plateforme transparente pour évaluer la crédibilité des politiciens français basée sur des preuves factuelles et des votes communautaires modérés, conforme à la législation française.

## 🚀 Fonctionnalités

### Core Features
- **Système de scores de crédibilité** (0-200 points)
- **Votes communautaires avec preuves** (articles, vidéos, documents)
- **Modération stricte** par une équipe formée
- **Authentification et gestion des utilisateurs**
- **Dashboard de modération** pour admins/modérateurs
- **Audit trail complet** et export des données
- **Conformité légale française** (droit de réponse, transparence)

### Pages principales
- `/` - Page d'accueil avec liste des politiciens
- `/admin` - Dashboard de modération (admin/modérateur uniquement)
- `/legal` - Informations de conformité légale et droit de réponse
- `/transparency` - Audit trail et statistiques publiques

## 🛠️ Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Supabase Auth avec rôles (user/moderator/admin)

## 🏗️ Architecture

### Base de données (Supabase)
- `users` - Profils utilisateurs avec rôles
- `politicians` - Données des politiciens
- `votes` - Votes avec preuves et statut de modération

### Sécurité et conformité
- **Row Level Security (RLS)** sur toutes les tables
- **Modération humaine** obligatoire avant validation
- **Audit trail** complet de tous les votes
- **Protection contre les campagnes coordonnées**
- **Droit de réponse** pour les politiciens

## 🚦 Installation et développement

### Prérequis
- Node.js 18+
- Un projet Supabase configuré

### Configuration
1. Cloner le projet
2. Installer les dépendances:
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement dans `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
   ```

4. Exécuter le script SQL de création de schéma dans Supabase:
   ```sql
   -- Voir supabase-schema.sql
   ```

5. Démarrer le serveur de développement:
   ```bash
   npm run dev
   ```

### Seeding des données
Le fichier `src/lib/seed-data.ts` contient des données d'exemple pour populer la base avec des politiciens français.

## ⚖️ Conformité légale

Cette plateforme respecte la législation française concernant:

- **Liberté d'expression** (Constitution française, CEDH)
- **Protection contre la diffamation** (Code pénal français)
- **Digital Services Act** (Directives UE 2024)
- **Droit de réponse** pour les personnalités publiques
- **Transparence et traçabilité** des contenus

### Mécanismes de protection
- Modération humaine systématique
- Preuves vérifiables obligatoires
- Distinction claire entre opinion et faits
- Procédure de droit de réponse
- Archivage transparent des décisions

## 👥 Rôles utilisateurs

- **User**: Peut voter avec preuves, voir les scores
- **Moderator**: Peut approuver/rejeter les votes
- **Admin**: Accès complet + gestion des utilisateurs

## 📊 Fonctionnalités de transparence

- **Historique public** de tous les votes modérés
- **Export CSV** des données d'audit
- **Statistiques** de modération en temps réel
- **Sources** vérifiables pour chaque vote
- **Traçabilité** complète des décisions

## 🔒 Sécurité

- Authentification Supabase robuste
- Permissions granulaires (RLS)
- Protection contre les votes multiples
- Détection des comportements suspects
- Validation stricte des preuves

## 📱 Interface utilisateur

- Design responsive (mobile-first)
- Interface intuitive et accessible
- Feedback visuel clair
- Navigation simplifiée
- Conformité aux standards d'accessibilité

## 🚀 Déploiement

Pour déployer en production:

1. Configurer Supabase en production
2. Obtenir la clé de service (service_role) pour les scripts d'import
3. Configurer les variables d'environnement de production
4. Déployer sur Vercel/Netlify ou votre plateforme préférée

## 📧 Contact légal

Pour toute question légale ou demande de droit de réponse:
- Email: legal@politics-trust.fr
- Réponse garantie sous 48h pour les demandes urgentes

## 🤝 Contribution

Ce projet respecte les standards de développement français et européens. Les contributions doivent maintenir le niveau de conformité légale et de sécurité.

---

**Note importante**: Cette plateforme fournit des informations pour éclairer le débat public. Les scores ne constituent pas une vérité absolue mais reflètent une évaluation communautaire modérée basée sur des preuves vérifiables.
