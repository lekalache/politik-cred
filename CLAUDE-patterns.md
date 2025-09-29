# CLAUDE Patterns - Politik Cred' Architecture

This document outlines the key architectural patterns, design principles, and implementation strategies used throughout the Politik Cred' codebase.

## Table of Contents
1. [Component Architecture Patterns](#component-architecture-patterns)
2. [Data Flow Patterns](#data-flow-patterns)
3. [API Design Patterns](#api-design-patterns)
4. [Database Patterns](#database-patterns)
5. [Security Patterns](#security-patterns)
6. [News Integration Patterns](#news-integration-patterns)
7. [UI/UX Patterns](#uiux-patterns)

---

## Component Architecture Patterns

### 1. **Server-First Architecture**
Default to Server Components for performance and SEO, only use Client Components when necessary.

```typescript
// Server Component (default)
export default function PoliticianList() {
  // Direct database access, no useState needed
  const politicians = await getPoliticians()
  return <div>{/* render */}</div>
}

// Client Component (when needed)
"use client"
export function VoteDialog() {
  const [isOpen, setIsOpen] = useState(false)
  // Interactive logic here
}
```

**Pattern Benefits:**
- Improved performance and SEO
- Reduced JavaScript bundle size
- Better caching strategies

### 2. **Compound Component Pattern**
Complex UI components are built using compound patterns for flexibility.

```typescript
// Alert compound component
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>

// Usage in news banner error state
<Alert>
  <AlertCircle className="w-5 h-5" />
  <AlertTitle>News System</AlertTitle>
  <AlertDescription>System in deployment</AlertDescription>
</Alert>
```

### 3. **Provider Pattern for Context**
Centralized state management using React Context for cross-cutting concerns.

```typescript
// Auth Provider wraps entire app
<AuthProvider>
  <App />
</AuthProvider>

// Custom hook for consuming context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 4. **Composition over Inheritance**
Components favor composition and prop drilling over complex inheritance hierarchies.

```typescript
// Flexible component composition
<Card className="border-l-4 border-[#1E3A8A]">
  <CardContent className="p-4">
    <Scale className="w-8 h-8 text-[#1E3A8A] mx-auto mb-2" />
    <h3 className="font-semibold mb-1">Score de crédibilité</h3>
    <p className="text-sm text-gray-600">0 à 200 points</p>
  </CardContent>
</Card>
```

---

## Data Flow Patterns

### 1. **Unidirectional Data Flow**
Data flows down through props, events bubble up through callbacks.

```typescript
// Parent manages state
const [selectedPolitician, setSelectedPolitician] = useState<string | null>(null)

// Child receives data and reports events
<PoliticianList onVoteClick={handleVoteClick} />
<VoteDialog
  politicianId={selectedPolitician}
  onClose={() => setSelectedPolitician(null)}
/>
```

### 2. **Optimistic Updates**
UI updates immediately while background sync occurs.

```typescript
// Immediate UI feedback
const handleVote = async (voteData) => {
  // Update UI optimistically
  setLocalState(newState)

  try {
    // Sync with server
    await submitVote(voteData)
  } catch (error) {
    // Revert on error
    setLocalState(previousState)
    showError(error)
  }
}
```

### 3. **Real-time Data Synchronization**
Supabase real-time subscriptions for live updates.

```typescript
// Real-time politician score updates
useEffect(() => {
  const subscription = supabase
    .channel('politician-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'politicians'
    }, handleUpdate)
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

---

## API Design Patterns

### 1. **RESTful Route Handlers**
Consistent HTTP method usage with proper status codes.

```typescript
// /api/news/collect/route.ts
export async function POST(request: NextRequest) {
  try {
    const result = await collectNews()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error.message.includes('API limit')) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Get collection statistics
  const stats = await getCollectionStats()
  return NextResponse.json({ stats })
}
```

### 2. **Request Validation Pattern**
Consistent input validation using Zod schemas.

```typescript
const requestSchema = z.object({
  forceRefresh: z.boolean().optional(),
  limit: z.number().min(1).max(50).optional(),
  searchText: z.string().optional()
})

const body = await request.json()
const validated = requestSchema.parse(body)
```

### 3. **Error Response Standardization**
Consistent error response format across all endpoints.

```typescript
// Standard error response format
{
  error: "Human-readable error message",
  code?: "MACHINE_READABLE_CODE",
  details?: { /* additional context */ }
}

// Standard success response format
{
  success: true,
  data: { /* response payload */ },
  meta?: { /* pagination, etc */ }
}
```

---

## Database Patterns

### 1. **Row Level Security (RLS)**
Database-level security for all sensitive operations.

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Moderators can view all votes
CREATE POLICY "Moderators can view all votes" ON votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin')
  )
);
```

### 2. **Typed Database Schema**
Full TypeScript integration with database schema.

```typescript
// Generated types from Supabase
export type Database = {
  public: {
    Tables: {
      politicians: {
        Row: {
          id: string
          name: string
          credibility_score: number
          // ... complete type definition
        }
      }
    }
  }
}

// Type-safe queries
const { data: politicians } = await supabase
  .from('politicians')
  .select('id, name, credibility_score')
  .returns<Database['public']['Tables']['politicians']['Row'][]>()
```

### 3. **Audit Trail Pattern**
Complete logging of all data modifications.

```typescript
// Automatic audit logging
const auditLog = {
  user_id: currentUser.id,
  activity_type: 'vote_submitted',
  details: { politician_id, vote_type, evidence_url },
  ip_address: getClientIP(request),
  user_agent: request.headers.get('user-agent')
}

await supabase.from('user_activities').insert(auditLog)
```

---

## Security Patterns

### 1. **Defense in Depth**
Multiple layers of security validation.

```typescript
// Client-side validation (UX)
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

// Server-side validation (Security)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const validated = schema.parse(body) // Throws if invalid

  // Additional business logic validation
  if (await isEmailBanned(validated.email)) {
    throw new Error('Email not allowed')
  }
}

// Database constraints (Data integrity)
-- email UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
```

### 2. **Rate Limiting Pattern**
API abuse prevention with graceful degradation.

```typescript
class WorldNewsClient {
  async checkDailyLimit(): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', {
      service_name: 'worldnews',
      daily_limit: this.dailyLimit
    })
    return data
  }

  async makeRequest(endpoint: string, params: any) {
    if (!await this.checkDailyLimit()) {
      throw new Error('Daily API limit reached')
    }
    // Proceed with request
  }
}
```

### 3. **Input Sanitization**
All user inputs are validated and sanitized.

```typescript
// Evidence URL validation
const validateEvidenceUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    const allowedDomains = ['lemonde.fr', 'lefigaro.fr', 'liberation.fr']
    return allowedDomains.some(domain => parsed.hostname.endsWith(domain))
  } catch {
    return false
  }
}
```

---

## News Integration Patterns

### 1. **Cache-First Architecture**
Intelligent caching reduces API calls and improves performance.

```typescript
class CacheManager {
  async getCached(searchParams: any): Promise<CachedResult | null> {
    const key = this.generateCacheKey(searchParams)
    const cached = await this.storage.get(key)

    if (cached && !this.isExpired(cached)) {
      return {
        data: cached.data,
        cacheAge: Date.now() - cached.timestamp
      }
    }

    return null
  }

  getTTLForSearchType(params: any): number {
    // Breaking news: 5 minutes
    if (params.sort === 'publish-time') return 5 * 60 * 1000
    // General search: 1 hour
    return 60 * 60 * 1000
  }
}
```

### 2. **Pipeline Processing**
News articles go through validation and enrichment pipeline.

```typescript
class ArticleProcessor {
  async processArticles(apiResponse: any): Promise<ProcessingResult> {
    const results = {
      saved: 0, duplicates: 0, invalid: 0, errors: 0
    }

    for (const rawArticle of apiResponse.articles) {
      try {
        // Validate article structure
        const cleanArticle = this.validateArticle(rawArticle)
        if (!cleanArticle) {
          results.invalid++
          continue
        }

        // Check for duplicates
        if (await this.isDuplicate(cleanArticle)) {
          results.duplicates++
          continue
        }

        // Enrich with AI scoring
        cleanArticle.relevance_score = this.calculateRelevance(rawArticle)
        cleanArticle.sentiment = this.analyzeSentiment(rawArticle.title, rawArticle.summary)

        // Save to database
        await this.saveArticle(cleanArticle)
        results.saved++

      } catch (error) {
        console.error('Article processing error:', error)
        results.errors++
      }
    }

    return results
  }
}
```

### 3. **Real-time Ticker Implementation**
Smooth scrolling news ticker with pause on hover and precise content width measurement.

```typescript
export function NewsBanner() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [contentWidth, setContentWidth] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const offsetRef = useRef(0)
  const isPausedRef = useRef(false)

  const scrollSpeed = 50 // pixels per second - tuned for readability
  const COPY_COUNT = 2

  // Measure content width for seamless infinite loop
  useEffect(() => {
    const measureWidth = () => {
      if (!trackRef.current) return
      // Reset transform before measuring
      trackRef.current.style.transform = 'translateX(0px)'
      offsetRef.current = 0

      const totalWidth = trackRef.current.scrollWidth
      const singleSequenceWidth = totalWidth / COPY_COUNT

      if (singleSequenceWidth > 0) {
        setContentWidth(singleSequenceWidth)
      } else {
        requestAnimationFrame(measureWidth)
      }
    }

    measureWidth()
    window.addEventListener('resize', measureWidth)
    return () => window.removeEventListener('resize', measureWidth)
  }, [news])

  // Speed-based animation using requestAnimationFrame
  useEffect(() => {
    if (!trackRef.current || contentWidth === 0) return

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }

      const delta = timestamp - (lastTimestampRef.current ?? timestamp)
      lastTimestampRef.current = timestamp

      if (!isPausedRef.current) {
        const distance = (scrollSpeed * delta) / 1000
        offsetRef.current -= distance

        // Seamless infinite loop
        if (-offsetRef.current >= contentWidth) {
          offsetRef.current += contentWidth
        }

        trackRef.current!.style.transform = `translateX(${offsetRef.current}px)`
      }
      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [contentWidth, news])
}
```

---

## UI/UX Patterns

### 1. **Design System Consistency**
Centralized design tokens and component variants.

```typescript
// Class Variance Authority for type-safe variants
const alertVariants = cva(
  "relative w-full rounded-lg border p-4", // base styles
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive"
      }
    },
    defaultVariants: { variant: "default" }
  }
)

// Consistent color palette
const colors = {
  primary: "#1E3A8A",    // French blue
  secondary: "#DC2626",   // French red
  accent: "#059669",      // Success green
  warning: "#D97706"      // Warning orange
}
```

### 2. **Progressive Enhancement**
Features work without JavaScript, enhanced with interactivity.

```typescript
// Base functionality in Server Component
export default function PoliticianList() {
  return (
    <div>
      {politicians.map(politician => (
        <PoliticianCard key={politician.id} politician={politician} />
      ))}
    </div>
  )
}

// Enhanced with client-side interactivity
"use client"
export function InteractivePoliticianCard({ politician }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card onClick={() => setIsExpanded(!isExpanded)}>
      {/* Enhanced interactive features */}
    </Card>
  )
}
```

### 3. **Accessibility-First Design**
All components built with accessibility as a priority.

```typescript
// Semantic HTML and ARIA attributes
<Alert role="alert">
  <AlertTitle>Status Update</AlertTitle>
  <AlertDescription>System maintenance in progress</AlertDescription>
</Alert>

// Keyboard navigation support
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
}

// Focus management
useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus()
  }
}, [isOpen])
```

### 4. **Responsive Design Patterns**
Mobile-first approach with progressive enhancement.

```css
/* Mobile-first base styles */
.news-banner {
  @apply py-3 px-4;
}

/* Tablet enhancements */
@media (min-width: 768px) {
  .news-banner {
    @apply py-4 px-6;
  }
}

/* Desktop enhancements */
@media (min-width: 1024px) {
  .news-banner {
    @apply py-6 px-8;
  }
}
```

### 5. **Loading and Error States**
Consistent handling of async operations.

```typescript
// Loading states with skeleton UI
if (loading) {
  return <NewsBannerSkeleton />
}

// Error states with retry functionality
if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="w-5 h-5" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription>
        Unable to load news.
        <Button variant="link" onClick={retry}>Try again</Button>
      </AlertDescription>
    </Alert>
  )
}

// Success state
return <NewsBanner articles={articles} />
```

---

## Pattern Benefits Summary

### Performance Patterns
- **Server Components**: Reduced client-side JavaScript
- **Caching Strategies**: Minimized API calls and database queries
- **Real-time Updates**: Efficient data synchronization

### Security Patterns
- **Multi-layer Validation**: Client, server, and database validation
- **Row Level Security**: Database-level access control
- **Rate Limiting**: API abuse prevention

### Maintainability Patterns
- **Type Safety**: Full TypeScript coverage
- **Component Composition**: Flexible, reusable components
- **Consistent Error Handling**: Standardized error responses

### User Experience Patterns
- **Progressive Enhancement**: Works without JavaScript
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive Design**: Mobile-first approach

These patterns ensure the Politik Cred' platform is secure, performant, maintainable, and provides an excellent user experience across all devices and user capabilities.