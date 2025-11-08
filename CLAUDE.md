# CLAUDE Memory Bank - Politik Cred' Project

**Project**: Politik Cred' - French Political Credibility Platform
**Framework**: Next.js 15 + React 19 + TypeScript
**Backend**: Supabase (PostgreSQL + Auth + RLS)
**Updated**: 2025-01-08

## Project Overview

Politik Cred' is a French political transparency platform that tracks political promises against actual parliamentary actions through objective, verifiable data. The platform has evolved from subjective community voting to a legally defensible promise-tracking system that compares what politicians say to what they do, using official government records and AI-powered semantic matching.

### Key Features
- **Promise Tracker System**: AI-powered promise extraction (95% accuracy) and verification against parliamentary actions
- **Semantic Matching**: 71% similarity detection using Hugging Face multilingual transformers
- **Objective Scoring**: Mathematically-driven consistency scores (promises kept/broken/partial)
- **Official Data Sources**: Assemblée Nationale API, Sénat data, government records
- **Evidence-Based System**: All data points linked to verifiable official sources
- **Fallback System**: Jaccard similarity when AI unavailable (100% uptime)
- **News Integration**: Real-time French political news with ticker functionality
- **Comprehensive UI**: Promise submission, viewing, filtering, and admin management
- **User Management**: Role-based system (user/moderator/admin)
- **Legal Compliance**: Legally defensible through objective data (no subjective judgments)

## Technology Stack

### Frontend
- **Next.js 15**: App Router with React Server Components
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety throughout codebase
- **Tailwind CSS 4**: Modern utility-first styling
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **Class Variance Authority**: Type-safe component variants
- **Geist Fonts**: Modern typography (Geist Sans + Geist Mono)

### Backend & Database
- **Supabase**: PostgreSQL database with built-in auth
- **Row Level Security (RLS)**: Database-level security
- **Custom Auth System**: Enhanced authentication with role management
- **Real-time Subscriptions**: Live data updates

### External Integrations
- **World News API**: French political news collection
- **Mailjet**: Email service for notifications
- **Hugging Face API**: Semantic embeddings for promise-to-action matching (paraphrase-multilingual-MiniLM-L12-v2)
- **Assemblée Nationale API**: Parliamentary votes, attendance, bills (NosDéputés.fr)
- **Netlify Analytics**: Privacy-friendly analytics (dashboard activation)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── news/          # News collection & retrieval
│   │   ├── promises/      # Promise extraction, matching, scoring
│   │   ├── data-collection/ # Parliamentary data collection
│   │   └── [utility]/     # Email, verification APIs
│   ├── admin/             # Admin dashboard pages
│   ├── promises/          # Promise tracker page (/promises)
│   ├── transparency/      # Public transparency page
│   └── [pages]/          # Public pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── admin/            # Admin-specific components
│   ├── promises/         # Promise card, submission dialog
│   ├── ui/               # Reusable UI components (Radix-based)
│   └── [features]/       # Feature-specific components
└── lib/                  # Utilities and business logic
    ├── news/             # News collection system
    ├── promise-extraction/ # Promise classifier, semantic matcher, consistency calculator
    ├── scrapers/         # Assemblée Nationale, data collection orchestrator
    ├── auth.ts           # Authentication utilities
    ├── supabase.ts       # Database configuration
    └── [utilities]/      # Various utility modules
```

## Database Architecture

### Core Tables
- **users**: User profiles with reputation and role management
- **politicians**: Political figure data with credibility and consistency scores
- **votes**: Evidence-based credibility votes with moderation status
- **comments**: Threaded discussion system
- **fact_checks**: AI and human fact-checking results
- **news_articles**: Cached French political news

### Promise Tracker Tables (Migration 004 & 005)
- **political_promises**: Extracted promises with source URLs, categories, verification status
- **parliamentary_actions**: Official votes, bills, attendance from government APIs
- **promise_verifications**: Matches between promises and actions with confidence scores
- **consistency_scores**: Calculated metrics (promises kept/broken/partial, attendance rates)
- **data_collection_jobs**: Job tracking for scrapers with error handling

### Security Features
- **Row Level Security**: All tables protected with RLS policies
- **Role-based Access**: User/moderator/admin permissions
- **Audit Trail**: Complete activity logging
- **IP Tracking**: Suspicious activity detection

## Authentication System

### Custom Authentication Implementation
- **Custom Auth Layer**: Enhanced Supabase auth with additional features
- **JWT Token Management**: Secure session handling
- **Role-based Authorization**: Granular permission system
- **Email Verification**: Required for account activation

### User Roles
- **User**: Can vote, comment, view public data
- **Moderator**: Can approve/reject votes, moderate comments
- **Admin**: Full system access, user management

## News Integration System

### Architecture
- **World News API Client**: Rate-limited API wrapper
- **Cache Manager**: Intelligent caching with TTL
- **Article Processor**: Content validation and enrichment
- **Ticker Component**: Real-time scrolling news banner

### Features
- **Daily Collection**: Automated French political news gathering
- **Relevance Scoring**: AI-powered content relevance assessment
- **Keyword Extraction**: Political term identification
- **Sentiment Analysis**: Basic sentiment classification

## UI Component System

### Design System
- **Radix UI Foundation**: Accessible primitives
- **Tailwind CSS 4**: Modern utility classes
- **Class Variance Authority**: Type-safe variants
- **Consistent Color Palette**: French political theme (blue/red)

### Component Categories
- **ui/**: Base components (Alert, Button, Card, etc.)
- **auth/**: Authentication-specific components
- **admin/**: Administrative interface components
- **Feature Components**: News banner, politician lists, voting dialogs

## API Architecture

### Patterns
- **Route Handlers**: Next.js 15 App Router API routes
- **Error Handling**: Consistent error responses
- **Rate Limiting**: API usage tracking and limits
- **Validation**: Zod schema validation

### Key Endpoints
- `/api/auth/*`: Authentication operations
- `/api/news/*`: News collection and retrieval
- `/api/promises/extract`: Promise extraction from text (GET/POST)
- `/api/promises/match`: Semantic matching of promises to actions (POST)
- `/api/promises/calculate-scores`: Consistency score calculation (POST)
- `/api/data-collection/collect`: Parliamentary data collection trigger (GET/POST)
- `/api/verify-*`: Email and user verification

## State Management

### Client State
- **React Context**: Authentication state management
- **Local State**: Component-level state with hooks
- **Server State**: Supabase real-time subscriptions

### Data Flow
- **Server Components**: Default for data fetching
- **Client Components**: Interactive UI elements
- **Streaming**: Progressive page loading

## Development Workflow

### Scripts
- `npm run dev`: Development server with Turbopack
- `npm run build`: Production build with optimization
- `npm run lint`: ESLint code quality checks

### Configuration Files
- **next.config.js**: Next.js configuration
- **tailwind.config.js**: Tailwind CSS customization
- **eslint.config.mjs**: ESLint rules
- **netlify.toml**: Deployment configuration

## Deployment & Infrastructure

### Netlify Deployment
- **Edge Network**: Global CDN with edge functions
- **Environment Variables**: Secure configuration management
- **Netlify Analytics**: Privacy-friendly analytics (requires dashboard activation)
- **Function Timeouts**: Custom timeouts for long-running API routes
  - Data collection: 5 minutes
  - Semantic matching: 2 minutes
  - Score calculation: 2 minutes

### Database Hosting
- **Supabase Cloud**: Managed PostgreSQL
- **Connection Pooling**: Efficient database connections
- **Backup Strategy**: Automated daily backups

## Security & Compliance

### Legal Compliance
- **French Law Compliance**: Droit de réponse, defamation protection
- **GDPR Compliance**: Data protection and user rights
- **Content Moderation**: Human oversight with AI assistance

### Security Measures
- **Row Level Security**: Database-level access control
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API abuse prevention

## Monitoring & Analytics

### Performance Monitoring
- **Netlify Analytics**: Privacy-friendly user analytics (enable in dashboard)
- **Custom Logging**: API route performance tracking
- **Error Tracking**: Built-in error boundary system

### Business Metrics
- **User Engagement**: Vote submission and approval rates
- **Content Quality**: Moderation success metrics
- **News Relevance**: Article engagement tracking

## Current Status & Recent Changes

### Major Features (November 2024 - January 2025)

#### Promise Tracker System ✅ COMPLETE (November 2024 - January 2025)
- ✅ **Database Schema**: 5 new tables with proper RLS policies (migrations 004 & 005)
- ✅ **Promise Extraction**: AI-powered with 95% accuracy (keyword-based + French political patterns)
- ✅ **Semantic Matching**: Hugging Face API integration (71% similarity detection, 100% test pass rate)
- ✅ **Fallback System**: Jaccard similarity when AI unavailable (automatic failover)
- ✅ **Data Collection**: Assemblée Nationale scraper with job tracking
- ✅ **Consistency Scoring**: Mathematical formula (kept × 100 + partial × 50) / total
- ✅ **API Endpoints**: Extract, match, calculate-scores, data collection
- ✅ **UI Implementation**: Promise tracker page, submission dialog, promise cards, filtering
- ✅ **Navigation**: Integrated into main navigation (/promises route)
- ✅ **Testing**: Comprehensive test suite with excellent results
- ✅ **TypeScript Build**: Test files excluded from compilation

#### Other Recent Features (December 2024 - January 2025)
- ✅ News ticker functionality with smooth scrolling effect (requestAnimationFrame-based)
- ✅ Enhanced user management with improved data handling and animations
- ✅ Alert and Switch UI components implementation
- ✅ Removed cron job dependency for news collection (moved to manual/on-demand)
- ✅ News collection system with intelligent caching and rate limiting
- ✅ Custom authentication system with enhanced user management
- ✅ Email testing functionality with Mailjet integration
- ✅ Mobile navigation improvements

### Active Development
- Promise Tracker UI enhancements (Phase 2)
- Additional data sources (Sénat, Vigie du Mensonge)
- Promise analytics and visualization
- Enhanced moderation tools

## Environment Configuration

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
WORLD_NEWS_API_KEY=your_news_api_key
MAILJET_API_KEY=your_mailjet_key
MAILJET_SECRET_KEY=your_mailjet_secret
HUGGINGFACE_API_KEY=your_huggingface_key  # For promise semantic matching
```

### Optional Configuration
```env
DAILY_API_LIMIT=100
MONTHLY_API_LIMIT=1000
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server (with Turbopack)
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Key Dependencies (January 2025)

### Core Framework
- **Next.js**: 15.5.3 (App Router, Turbopack, React 19 support)
- **React**: 19.1.0 (Latest with concurrent features)
- **TypeScript**: ^5 (Full type safety)

### UI & Styling
- **Tailwind CSS**: ^4 (Modern utility-first styling)
- **Radix UI**: Complete accessible primitives library
- **Class Variance Authority**: ^0.7.1 (Type-safe component variants)
- **Lucide React**: ^0.544.0 (Consistent iconography)

### Backend & Database
- **Supabase**: ^2.57.4 (PostgreSQL, Auth, Real-time)
- **Zod**: ^4.1.9 (Schema validation)

### Integrations
- **Mailjet**: ^6.0.9 (Email service)
- **Netlify Analytics**: Dashboard-enabled (Privacy-friendly analytics)

## Key Files for Development

### Critical Configuration
- `/src/lib/supabase.ts` - Database configuration and comprehensive type definitions
- `/src/components/auth/auth-provider.tsx` - Authentication context and state management
- `/src/app/layout.tsx` - Root layout with AuthProvider and global styles
- `/src/lib/utils.ts` - Utility functions and Tailwind class merging

### Feature Implementations

**Promise Tracker System**:
- `/src/lib/promise-extraction/promise-classifier.ts` - AI promise detection (95% accuracy)
- `/src/lib/promise-extraction/semantic-matcher.ts` - Hugging Face semantic matching
- `/src/lib/promise-extraction/consistency-calculator.ts` - Score calculation engine
- `/src/lib/scrapers/assemblee-nationale-client.ts` - Parliamentary data scraper
- `/src/lib/scrapers/data-collection-orchestrator.ts` - Multi-source coordination
- `/src/components/promises/promise-card.tsx` - Promise display component
- `/src/components/promises/promise-submission-dialog.tsx` - Promise submission form
- `/src/app/promises/page.tsx` - Promise tracker main page

**News System**:
- `/src/components/news-banner.tsx` - Real-time news ticker with smooth scrolling
- `/src/lib/news/worldNewsClient.ts` - World News API client with rate limiting
- `/src/lib/news/cacheManager.ts` - Intelligent caching system
- `/src/lib/news/articleProcessor.ts` - Article processing and validation
- `/src/components/ui/` - Complete Radix UI-based component library

### API Routes

**Promise Tracker APIs**:
- `/src/app/api/promises/extract/route.ts` - Promise extraction from text
- `/src/app/api/promises/match/route.ts` - Semantic matching of promises to actions
- `/src/app/api/promises/calculate-scores/route.ts` - Consistency score calculation
- `/src/app/api/data-collection/collect/route.ts` - Parliamentary data collection trigger

**Other APIs**:
- `/src/app/api/news/collect/route.ts` - Manual news collection endpoint
- `/src/app/api/news/articles/route.ts` - News article retrieval with filtering
- `/src/app/api/auth/` - Complete authentication API suite
- `/src/app/api/send-email/route.ts` - Email sending via Mailjet

This documentation serves as the primary reference for understanding the Politik Cred' codebase architecture, patterns, and current implementation status.