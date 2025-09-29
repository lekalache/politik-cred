# CLAUDE Memory Bank - Politik Cred' Project

**Project**: Politik Cred' - French Political Credibility Platform
**Framework**: Next.js 15 + React 19 + TypeScript
**Backend**: Supabase (PostgreSQL + Auth + RLS)
**Updated**: 2025-01-02

## Project Overview

Politik Cred' is a French political transparency platform that enables citizens to evaluate the credibility of their political representatives through evidence-based community voting. The platform features a sophisticated moderation system, real-time French political news integration, and comprehensive user management with role-based access.

### Key Features
- **Credibility Scoring System**: 0-200 point scale for politician evaluation
- **Evidence-Based Voting**: Users submit votes with required evidence (articles, videos, documents)
- **News Integration**: Real-time French political news with ticker functionality
- **Moderation System**: Human moderation with AI-assisted fact-checking
- **User Management**: Role-based system (user/moderator/admin)
- **Legal Compliance**: Full French law compliance including droit de réponse

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
- **Vercel Analytics**: Performance monitoring

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── news/          # News collection & retrieval
│   │   └── [utility]/     # Email, verification APIs
│   ├── admin/             # Admin dashboard pages
│   ├── transparency/      # Public transparency page
│   └── [pages]/          # Public pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── admin/            # Admin-specific components
│   ├── ui/               # Reusable UI components (Radix-based)
│   └── [features]/       # Feature-specific components
└── lib/                  # Utilities and business logic
    ├── news/             # News collection system
    ├── auth.ts           # Authentication utilities
    ├── supabase.ts       # Database configuration
    └── [utilities]/      # Various utility modules
```

## Database Architecture

### Core Tables
- **users**: User profiles with reputation and role management
- **politicians**: Political figure data with credibility scores
- **votes**: Evidence-based credibility votes with moderation status
- **comments**: Threaded discussion system
- **fact_checks**: AI and human fact-checking results
- **news_articles**: Cached French political news

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
- **vercel.json**: Deployment configuration

## Deployment & Infrastructure

### Vercel Deployment
- **Edge Runtime**: Global content delivery
- **Environment Variables**: Secure configuration management
- **Analytics Integration**: Performance monitoring
- **Speed Insights**: Core Web Vitals tracking

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
- **Vercel Analytics**: User analytics and insights
- **Speed Insights**: Performance metrics
- **Error Tracking**: Built-in error boundary system

### Business Metrics
- **User Engagement**: Vote submission and approval rates
- **Content Quality**: Moderation success metrics
- **News Relevance**: Article engagement tracking

## Current Status & Recent Changes

### Recent Features (December 2024 - January 2025)
- ✅ News ticker functionality with smooth scrolling effect (requestAnimationFrame-based)
- ✅ Enhanced user management with improved data handling and animations
- ✅ Alert and Switch UI components implementation
- ✅ Removed cron job dependency for news collection (moved to manual/on-demand)
- ✅ News collection system with intelligent caching and rate limiting
- ✅ Custom authentication system with enhanced user management
- ✅ Email testing functionality with Mailjet integration
- ✅ Mobile navigation improvements

### Active Development
- News banner animation improvements
- User engagement analytics
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
- **Vercel Analytics**: ^1.5.0 (User analytics)
- **Vercel Speed Insights**: ^1.2.0 (Performance monitoring)

## Key Files for Development

### Critical Configuration
- `/src/lib/supabase.ts` - Database configuration and comprehensive type definitions
- `/src/components/auth/auth-provider.tsx` - Authentication context and state management
- `/src/app/layout.tsx` - Root layout with AuthProvider, Analytics, and Speed Insights
- `/src/lib/utils.ts` - Utility functions and Tailwind class merging

### Feature Implementations
- `/src/components/news-banner.tsx` - Real-time news ticker with smooth scrolling
- `/src/lib/news/worldNewsClient.ts` - World News API client with rate limiting
- `/src/lib/news/cacheManager.ts` - Intelligent caching system
- `/src/lib/news/articleProcessor.ts` - Article processing and validation
- `/src/components/ui/` - Complete Radix UI-based component library

### API Routes
- `/src/app/api/news/collect/route.ts` - Manual news collection endpoint
- `/src/app/api/news/articles/route.ts` - News article retrieval with filtering
- `/src/app/api/auth/` - Complete authentication API suite
- `/src/app/api/send-email/route.ts` - Email sending via Mailjet

This documentation serves as the primary reference for understanding the Politik Cred' codebase architecture, patterns, and current implementation status.