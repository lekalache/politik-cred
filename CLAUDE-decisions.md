# CLAUDE Decisions - Politik Cred' Technical Decisions

This document records the significant technical decisions made during the development of Politik Cred', including the reasoning behind each choice and the trade-offs considered.

## Table of Contents
1. [Framework and Runtime Decisions](#framework-and-runtime-decisions)
2. [Database and Backend Decisions](#database-and-backend-decisions)
3. [Authentication and Security Decisions](#authentication-and-security-decisions)
4. [UI/UX and Design Decisions](#uiux-and-design-decisions)
5. [News Integration Decisions](#news-integration-decisions)
6. [Deployment and Infrastructure Decisions](#deployment-and-infrastructure-decisions)
7. [Development Workflow Decisions](#development-workflow-decisions)

---

## Framework and Runtime Decisions

### Decision: Next.js 15 with App Router
**Date**: December 2024
**Status**: Active

**Context**: Needed a modern React framework for a French political platform with SEO requirements and server-side rendering capabilities.

**Decision**: Use Next.js 15 with the new App Router architecture.

**Reasoning**:
- **Server Components**: Better performance for content-heavy political information
- **SEO Optimization**: Critical for public political information discoverability
- **French Market**: Excellent performance in European CDN locations
- **App Router**: More intuitive routing and layout system
- **Streaming**: Progressive loading for better perceived performance

**Alternatives Considered**:
- **Remix**: Excellent for forms but less mature ecosystem
- **SvelteKit**: Great performance but smaller talent pool in France
- **Traditional SPA**: Poor SEO for political content

**Trade-offs**:
- ✅ Excellent SEO and performance
- ✅ Large French developer community
- ❌ Steeper learning curve for App Router
- ❌ Requires careful client/server component management

---

### Decision: React 19 Early Adoption
**Date**: December 2024
**Status**: Active

**Context**: New React features could benefit the real-time nature of political discussions.

**Decision**: Adopt React 19 for concurrent features and improved server components.

**Reasoning**:
- **Concurrent Features**: Better for real-time vote updates
- **Server Actions**: Simplified form handling for voting
- **Automatic Batching**: Improved performance for frequent updates
- **Suspense Improvements**: Better loading states

**Trade-offs**:
- ✅ Latest React features and performance
- ✅ Future-proofing the codebase
- ❌ Potential breaking changes in ecosystem
- ❌ Some third-party library compatibility issues

---

### Decision: TypeScript throughout
**Date**: Initial development
**Status**: Active

**Context**: Political data requires high accuracy and type safety is critical.

**Decision**: Use TypeScript for all code including configuration files.

**Reasoning**:
- **Data Accuracy**: Political information must be type-safe
- **Developer Experience**: Better IDE support and refactoring
- **Runtime Safety**: Catch errors before they affect users
- **Team Collaboration**: Self-documenting code

**Trade-offs**:
- ✅ Excellent developer experience and safety
- ✅ Better refactoring and maintenance
- ❌ Longer initial development time
- ❌ Additional build complexity

---

## Database and Backend Decisions

### Decision: Supabase as Backend-as-a-Service
**Date**: Initial development
**Status**: Active

**Context**: Needed a robust database with built-in authentication and real-time features for political platform.

**Decision**: Use Supabase for database, authentication, and real-time subscriptions.

**Reasoning**:
- **PostgreSQL**: Robust relational database for complex political data relationships
- **Row Level Security**: Database-level security critical for political platforms
- **Real-time**: Live updates for vote counts and discussions
- **Built-in Auth**: Reduces security attack surface
- **European Hosting**: GDPR compliance and low latency for French users

**Alternatives Considered**:
- **Firebase**: Limited SQL capabilities for complex queries
- **PlanetScale**: Great MySQL but lacks built-in auth
- **AWS RDS + Cognito**: More complex setup and management

**Trade-offs**:
- ✅ Comprehensive feature set
- ✅ GDPR compliant hosting
- ✅ Excellent PostgreSQL performance
- ❌ Vendor lock-in concerns
- ❌ Limited customization of auth flows

---

### Decision: Custom Authentication Layer
**Date**: September 2025
**Status**: Active

**Context**: Political platforms require enhanced authentication with role management and verification.

**Decision**: Build custom authentication layer on top of Supabase Auth.

**Reasoning**:
- **Role Management**: User/moderator/admin roles for political content moderation
- **Enhanced Security**: Additional verification steps for political platform
- **Custom User Profiles**: Extended user data for reputation and voting history
- **Email Verification**: Required for credible political participation

**Implementation**:
```typescript
// Custom auth with enhanced features
class CustomAuth {
  async signUp(email: string, password: string, name: string) {
    // Create user in Supabase Auth
    const { user } = await supabase.auth.signUp({ email, password })

    // Create extended profile
    await supabase.from('users').insert({
      id: user.id,
      email,
      name,
      role: 'user',
      verification_status: 'unverified'
    })
  }
}
```

**Trade-offs**:
- ✅ Full control over authentication flow
- ✅ Political platform specific features
- ❌ Additional complexity to maintain
- ❌ More code to secure and test

---

### Decision: Row Level Security (RLS) for Data Protection
**Date**: Initial development
**Status**: Active

**Context**: Political platforms face unique security challenges and require granular access control.

**Decision**: Implement comprehensive Row Level Security policies for all sensitive tables.

**Reasoning**:
- **Data Protection**: Users can only access their own data
- **Role-based Access**: Moderators and admins have appropriate permissions
- **Audit Trail Security**: Activity logs are protected
- **Database-level Security**: Cannot be bypassed by application bugs

**Implementation Example**:
```sql
-- Users can only view their own profile data
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Moderators can view all votes for moderation
CREATE POLICY "Moderators can view all votes" ON votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin')
  )
);
```

**Trade-offs**:
- ✅ Database-level security guarantees
- ✅ Cannot be bypassed by application code
- ❌ Complex policy management
- ❌ Debugging challenges

---

## Authentication and Security Decisions

### Decision: Human-First Moderation
**Date**: September 2025
**Status**: Active

**Context**: Political content moderation requires human judgment and French legal compliance.

**Decision**: Implement human-first moderation with AI assistance.

**Reasoning**:
- **Legal Compliance**: French defamation laws require human oversight
- **Political Nuance**: AI cannot understand political context adequately
- **Trust Building**: Users trust human-moderated political content more
- **Droit de Réponse**: French law requires human judgment for response rights

**Implementation**:
- All votes start as 'pending' status
- Human moderators review evidence and approve/reject
- AI provides confidence scores and flags for moderator attention
- Complete audit trail for legal compliance

**Trade-offs**:
- ✅ Legal compliance and trust
- ✅ High content quality
- ❌ Slower content approval
- ❌ Higher operational costs

---

### Decision: Evidence-Required Voting
**Date**: Initial development
**Status**: Active

**Context**: Political credibility assessment requires factual backing to prevent misinformation.

**Decision**: Require evidence (URLs, documents, videos) for all credibility votes.

**Reasoning**:
- **Factual Accuracy**: Prevents opinion-based or emotional voting
- **Legal Protection**: Evidence provides defense against defamation claims
- **Quality Control**: Higher barrier to entry improves content quality
- **Transparency**: Users can verify claims independently

**Implementation**:
```typescript
interface Vote {
  evidence_title: string      // Required: Human readable title
  evidence_description: string // Required: Context and explanation
  evidence_url: string | null  // Optional: Link to source
  evidence_type: 'article' | 'video' | 'document' | 'social_media'
  source_credibility: number  // AI-assessed source reliability
}
```

**Trade-offs**:
- ✅ High content quality and legal protection
- ✅ Builds user trust through transparency
- ❌ Higher barrier to participation
- ❌ More complex voting interface

---

## UI/UX and Design Decisions

### Decision: Radix UI + Tailwind CSS Design System
**Date**: Initial development
**Status**: Active

**Context**: Political platform needs accessible, professional UI that builds trust.

**Decision**: Use Radix UI primitives with Tailwind CSS for a custom design system.

**Reasoning**:
- **Accessibility**: Political platforms must be accessible to all citizens
- **Professional Appearance**: Builds trust in political information
- **French Design Sensibilities**: Clean, government-style aesthetics
- **Developer Experience**: Rapid development with consistency

**Implementation**:
- Radix UI for accessible component primitives
- Tailwind CSS 4 for styling system
- Class Variance Authority for type-safe component variants
- Custom color palette reflecting French political themes

**Trade-offs**:
- ✅ Excellent accessibility and developer experience
- ✅ Professional, trustworthy appearance
- ❌ Learning curve for Radix concepts
- ❌ Bundle size considerations

---

### Decision: French Political Color Scheme
**Date**: Initial development
**Status**: Active

**Context**: Political platform design should reflect French political culture while remaining neutral.

**Decision**: Use blue and red color scheme inspired by French flag while maintaining political neutrality.

**Reasoning**:
- **Cultural Familiarity**: French users recognize and trust these colors
- **Political Neutrality**: Colors don't favor any particular party
- **Visual Hierarchy**: Blue for primary actions, red for important alerts
- **Accessibility**: High contrast ratios for readability

**Color Palette**:
```typescript
const colors = {
  primary: "#1E3A8A",    // French blue - primary actions
  secondary: "#DC2626",   // French red - alerts and emphasis
  accent: "#059669",      // Green - success and positive actions
  warning: "#D97706",     // Orange - warnings and caution
  neutral: "#FAFAFA"      // Light gray - backgrounds
}
```

**Trade-offs**:
- ✅ Culturally appropriate and accessible
- ✅ Clear visual hierarchy
- ❌ Limited color options
- ❌ Risk of appearing government-affiliated

---

### Decision: Mobile-First Responsive Design
**Date**: Initial development
**Status**: Active

**Context**: Political engagement increasingly happens on mobile devices in France.

**Decision**: Design mobile-first with progressive enhancement for larger screens.

**Reasoning**:
- **Usage Patterns**: Most French political engagement happens on mobile
- **Accessibility**: Mobile-first ensures core functionality works everywhere
- **Performance**: Simpler mobile layouts load faster
- **Political Participation**: Lower barriers to political engagement

**Implementation**:
- Base styles for mobile (320px+)
- Progressive enhancement for tablet (768px+)
- Desktop enhancements (1024px+)
- Touch-friendly interaction targets

**Trade-offs**:
- ✅ Better mobile experience and accessibility
- ✅ Broader political participation
- ❌ Desktop interface may feel constrained
- ❌ More complex responsive testing

---

## News Integration Decisions

### Decision: World News API for French Political News
**Date**: December 2024
**Status**: Active

**Context**: Platform needs reliable French political news integration for context and engagement.

**Decision**: Use World News API with intelligent caching and rate limiting.

**Reasoning**:
- **French Language Support**: Native French content filtering
- **Political Focus**: Good coverage of French political news sources
- **API Reliability**: Stable service with good uptime
- **Cost Management**: Reasonable pricing for free/paid tiers

**Implementation**:
- Rate limiting to stay within daily/monthly limits
- Intelligent caching with TTL based on content type
- Relevance scoring for political content filtering
- Integration with French news sources (Le Monde, Le Figaro, etc.)

**Alternatives Considered**:
- **News API**: Limited French political coverage
- **RSS Feeds**: Inconsistent formatting and reliability
- **Web Scraping**: Legal and technical complexity

**Trade-offs**:
- ✅ Reliable French political news coverage
- ✅ API consistency and rate limiting
- ❌ External dependency and cost
- ❌ Limited control over content quality

---

### Decision: Real-time News Ticker
**Date**: December 2024
**Status**: Active

**Context**: Political platforms benefit from displaying current events for context.

**Decision**: Implement smooth-scrolling news ticker with pause-on-hover functionality.

**Reasoning**:
- **User Engagement**: Current events increase platform stickiness
- **Context**: Political news provides context for credibility discussions
- **Performance**: RequestAnimationFrame for smooth 60fps scrolling
- **UX**: Pause on hover for better readability

**Implementation**:
```typescript
// Speed-based animation for consistent scrolling
const scrollSpeed = 50 // pixels per second
const step = (timestamp: number) => {
  if (!isPausedRef.current) {
    const distance = (scrollSpeed * delta) / 1000
    offsetRef.current -= distance
    // Seamless infinite loop
    if (-offsetRef.current >= contentWidth) {
      offsetRef.current += contentWidth
    }
  }
}
```

**Trade-offs**:
- ✅ Excellent user experience and performance
- ✅ Increased user engagement
- ❌ Additional complexity and API costs
- ❌ Potential distraction from main content

---

### Decision: Cron Job Removal
**Date**: December 2024
**Status**: Active

**Context**: Automated news collection was causing deployment and cost issues.

**Decision**: Remove cron job dependency and move to manual/on-demand news collection.

**Reasoning**:
- **Deployment Simplicity**: Eliminates serverless function scheduling complexity
- **Cost Control**: Manual collection prevents unexpected API usage
- **Reliability**: Removes failure point from automated systems
- **Control**: Administrators can control when news is collected

**Migration**:
- Removed `vercel.json` cron configuration
- Added manual collection API endpoint
- Admin dashboard button for triggering collection
- Maintained all caching and rate limiting logic

**Trade-offs**:
- ✅ Simpler deployment and better cost control
- ✅ More reliable system operation
- ❌ Manual intervention required
- ❌ Less fresh news content

---

## Deployment and Infrastructure Decisions

### Decision: Vercel for Frontend Hosting
**Date**: Initial development
**Status**: Active

**Context**: Next.js application needs reliable hosting with good European performance.

**Decision**: Deploy to Vercel with European edge locations.

**Reasoning**:
- **Next.js Integration**: Optimal platform for Next.js applications
- **European Performance**: Edge locations in France and neighboring countries
- **Analytics Integration**: Built-in Vercel Analytics for user insights
- **Deployment Simplicity**: Git-based deployments with preview environments

**Configuration**:
```json
// vercel.json
{
  "regions": ["cdg1", "fra1", "ams1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Trade-offs**:
- ✅ Excellent Next.js integration and performance
- ✅ European GDPR compliance
- ❌ Vendor lock-in concerns
- ❌ Limited server-side customization

---

### Decision: Environment-based Configuration
**Date**: Initial development
**Status**: Active

**Context**: Political platform requires secure configuration management.

**Decision**: Use environment variables with validation and fallbacks.

**Reasoning**:
- **Security**: Sensitive keys not in source control
- **Flexibility**: Different configurations for development/production
- **Validation**: Runtime validation prevents misconfigurations
- **Fallbacks**: Graceful degradation when services unavailable

**Implementation**:
```typescript
// Runtime validation with fallbacks
export const validateSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    if (!supabaseUrl) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
      return false
    }
  }
  return true
}

// Build-time fallbacks for Vercel
const buildTimeUrl = supabaseUrl || 'https://placeholder.supabase.co'
```

**Trade-offs**:
- ✅ Secure and flexible configuration
- ✅ Graceful handling of missing variables
- ❌ Additional validation complexity
- ❌ Build-time vs runtime configuration challenges

---

## Development Workflow Decisions

### Decision: ESLint with Next.js Configuration
**Date**: September 2025
**Status**: Active

**Context**: Political platform code quality must be extremely high for trust and security.

**Decision**: Use ESLint with Next.js recommended configuration and additional political-platform-specific rules.

**Reasoning**:
- **Code Quality**: Political platforms require highest code quality standards
- **Team Consistency**: Consistent code style across development team
- **Error Prevention**: Catch potential issues before they reach production
- **Security**: Lint rules can catch security anti-patterns

**Configuration**:
```javascript
// eslint.config.mjs
export default [
  ...next,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'error'
    }
  }
]
```

**Trade-offs**:
- ✅ High code quality and consistency
- ✅ Error prevention and security
- ❌ Additional development overhead
- ❌ Learning curve for team members

---

### Decision: Turbopack for Development
**Date**: December 2024
**Status**: Active

**Context**: Political platform development requires fast iteration cycles.

**Decision**: Use Turbopack for development builds while maintaining Webpack for production.

**Reasoning**:
- **Development Speed**: Significantly faster development server startup
- **Hot Reload**: Faster hot module replacement for better developer experience
- **Future-Proofing**: Turbopack is the future of Next.js build system
- **Stability**: Keep Webpack for production until Turbopack is fully stable

**Configuration**:
```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack"
  }
}
```

**Trade-offs**:
- ✅ Excellent development experience and speed
- ✅ Future-proofing development workflow
- ❌ Different build tools for dev/prod
- ❌ Potential Turbopack stability issues

---

### Decision: Enhanced UI Component System with CVA
**Date**: December 2024
**Status**: Active

**Context**: Need for consistent, type-safe UI components with comprehensive accessibility features for political platform trust.

**Decision**: Implement enhanced component system using Class Variance Authority (CVA) with comprehensive variants and accessibility features.

**Reasoning**:
- **Type Safety**: CVA provides compile-time variant validation
- **Accessibility**: Enhanced focus management and ARIA support
- **Design Consistency**: Systematic approach to component variants
- **Political Neutrality**: Standardized styling approach for all political content

**Implementation**:
```typescript
// Enhanced button variants with comprehensive accessibility
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    }
  }
)
```

**Trade-offs**:
- ✅ Excellent type safety and consistency
- ✅ Enhanced accessibility for all users
- ✅ Better developer experience
- ❌ Learning curve for CVA patterns
- ❌ Additional complexity in component definitions

---

## Decision Impact Summary

### High Impact Decisions
1. **Next.js 15 + App Router**: Foundational choice affecting entire architecture
2. **Supabase Backend**: Comprehensive backend solution with built-in features
3. **Human-First Moderation**: Core differentiator for political platform trust
4. **Evidence-Required Voting**: Fundamental to platform credibility and legal compliance

### Medium Impact Decisions
1. **Custom Authentication**: Enhanced security and features for political platform
2. **Radix UI + Tailwind**: Professional, accessible interface for citizen trust
3. **World News API**: External dependency providing valuable context
4. **Vercel Deployment**: Reliable hosting with European compliance

### Low Impact Decisions
1. **TypeScript Throughout**: Development experience improvement
2. **Mobile-First Design**: Better accessibility and broader reach
3. **Turbopack Development**: Development speed improvement
4. **ESLint Configuration**: Code quality and consistency

### Future Decision Points
- **AI Integration**: Consider AI fact-checking as technology improves
- **Multi-language Support**: Expand beyond French for European markets
- **API Rate Limiting**: May need more sophisticated rate limiting strategies
- **Database Scaling**: Consider database sharding for larger user base

These decisions reflect the unique requirements of a political transparency platform operating under French law, prioritizing trust, security, legal compliance, and user experience.