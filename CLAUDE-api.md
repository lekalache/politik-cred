# CLAUDE API - Politik Cred' API Documentation

This document provides comprehensive documentation of the Politik Cred' API endpoints, patterns, and integration strategies.

## Table of Contents
1. [API Architecture Overview](#api-architecture-overview)
2. [Authentication APIs](#authentication-apis)
3. [News Collection APIs](#news-collection-apis)
4. [Data Management APIs](#data-management-apis)
5. [Utility APIs](#utility-apis)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Rate Limiting and Security](#rate-limiting-and-security)

---

## API Architecture Overview

### Next.js 15 App Router API Pattern
All APIs follow the new App Router route handler pattern with consistent structure and error handling.

**Route Handler Structure:**
```typescript
// /src/app/api/[feature]/[action]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validated = schema.parse(body)

    // Business logic
    const result = await processRequest(validated)

    // Success response
    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 })

  } catch (error) {
    // Error handling
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
```

**API Conventions:**
- **RESTful Design**: HTTP methods match operations (GET, POST, PUT, DELETE)
- **JSON Responses**: Consistent JSON format for all responses
- **Error Codes**: Standard HTTP status codes with descriptive messages
- **Request Validation**: Zod schema validation for all inputs
- **Type Safety**: Full TypeScript integration

---

## Authentication APIs

### Sign Up
Creates new user account with email verification requirement.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```typescript
{
  email: string      // Valid email address
  password: string   // Minimum 8 characters
  name: string       // User's display name
}
```

**Response:**
```typescript
// Success (201)
{
  success: true,
  message: "Account created. Please check your email for verification."
}

// Error (400/409)
{
  error: "Email already exists" | "Invalid email format" | "Password too weak"
}
```

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1)
    })

    const validated = schema.parse({ email, password, name })

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: { name: validated.name }
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create extended user profile
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: validated.email,
        name: validated.name,
        role: 'user',
        verification_status: 'unverified'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email for verification.'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid input data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create account'
    }, { status: 500 })
  }
}
```

### Sign In
Authenticates existing user and returns session.

**Endpoint:** `POST /api/auth/signin`

**Request Body:**
```typescript
{
  email: string
  password: string
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  user: {
    id: string
    email: string
    name: string
    role: 'user' | 'moderator' | 'admin'
    verification_status: string
  }
}

// Error (401)
{
  error: "Invalid credentials" | "Account not verified"
}
```

### Sign Out
Terminates user session.

**Endpoint:** `POST /api/auth/signout`

**Response:**
```typescript
// Success (200)
{
  success: true,
  message: "Signed out successfully"
}
```

---

## News Collection APIs

### Collect News
Manually trigger French political news collection with intelligent caching and rate limiting. Replaces previous cron-based automation.

**Endpoint:** `POST /api/news/collect`

**Request Body:**
```typescript
{
  forceRefresh?: boolean    // Skip cache if true
  limit?: number           // Max articles (1-50, default: 25)
  searchText?: string      // Custom search terms
  source?: string          // Specific news source
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  jobId: string,
  fromCache: boolean,
  results: {
    collected: number,     // Articles from API
    saved: number,         // New articles saved
    duplicates: number,    // Duplicate articles found
    invalid: number,       // Invalid articles rejected
    errors: number         // Processing errors
  },
  stats: {
    totalArticles: number,
    todayArticles: number,
    averageRelevance: number
  },
  usage: APIUsageStats[],  // Last 7 days API usage
  available: number        // Total available from API
}

// Rate Limited (429)
{
  error: "Daily API limit reached. Please try again tomorrow."
}

// API Error (502)
{
  error: "External API error. Please try again later."
}
```

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  let jobId: string | null = null

  try {
    // Create job tracking entry
    const { data: job, error: jobError } = await supabase
      .from('news_collection_jobs')
      .insert({
        job_type: 'manual',
        status: 'running'
      })
      .select('id')
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to initialize job tracking' },
        { status: 500 }
      )
    }

    jobId = job.id

    // Parse request parameters
    const body = await request.json().catch(() => ({}))
    const {
      forceRefresh = false,
      limit = 25,
      searchText = null,
      source = null
    } = body

    // Check API limits
    const canCollect = await worldNewsClient.checkDailyLimit()
    if (!canCollect) {
      await updateJobStatus(jobId, 'failed', 'Daily API limit reached')
      return NextResponse.json(
        { error: 'Daily API limit reached. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    // Prepare search parameters
    const searchParams = {
      language: 'fr',
      text: searchText || 'politique OR gouvernement OR élections OR parlement',
      'source-countries': 'fr',
      sort: 'publish-time',
      'sort-direction': 'DESC',
      number: Math.min(limit, 50)
    }

    if (source) {
      searchParams.sources = source
    }

    let apiResponse
    let fromCache = false

    // Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await cacheManager.getCached(searchParams)
      if (cached) {
        apiResponse = cached.data
        fromCache = true
        console.log(`📦 Using cached results (${cached.cacheAge}ms old)`)
      }
    }

    // Make API call if no cache or forced refresh
    if (!apiResponse) {
      console.log('🌐 Making API call to World News API')
      const response = await worldNewsClient.searchFrenchPolitics(searchParams)
      apiResponse = response

      // Cache the response
      const ttl = cacheManager.getTTLForSearchType(searchParams)
      await cacheManager.setCached(searchParams, apiResponse, ttl)
    }

    // Process articles
    const processingResults = await articleProcessor.processArticles(apiResponse)

    // Update job status
    await updateJobStatus(jobId, 'completed', null, {
      articles_collected: apiResponse.articles?.length || 0,
      articles_new: processingResults.saved,
      articles_updated: 0,
      api_calls_made: fromCache ? 0 : 1
    })

    // Get updated stats
    const stats = await articleProcessor.getArticleStats()
    const usageStats = await worldNewsClient.getUsageStats()

    return NextResponse.json({
      success: true,
      jobId,
      fromCache,
      results: {
        collected: apiResponse.articles?.length || 0,
        saved: processingResults.saved,
        duplicates: processingResults.duplicates,
        invalid: processingResults.invalid,
        errors: processingResults.errors
      },
      stats: {
        totalArticles: stats?.totalArticles || 0,
        todayArticles: stats?.todayArticles || 0,
        averageRelevance: stats?.averageRelevance || 0
      },
      usage: usageStats.slice(0, 7),
      available: apiResponse.available || 0
    })

  } catch (error: any) {
    console.error('News collection error:', error)

    if (jobId) {
      await updateJobStatus(jobId, 'failed', error?.message || 'Unknown error')
    }

    // Handle specific error types
    if (error?.message?.includes('Daily API limit')) {
      return NextResponse.json(
        { error: 'Daily API limit reached' },
        { status: 429 }
      )
    }

    if (error?.message?.includes('API request failed')) {
      return NextResponse.json(
        { error: 'External API error. Please try again later.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to collect news. Please try again.' },
      { status: 500 }
    )
  }
}
```

### Get News Articles
Retrieve stored political news articles with filtering and pagination.

**Endpoint:** `GET /api/news/articles`

**Query Parameters:**
```typescript
{
  limit?: number           // Results per page (default: 20, max: 100)
  offset?: number          // Pagination offset
  sortBy?: string          // Sort field (published_at, relevance_score)
  sortOrder?: 'asc' | 'desc'
  minRelevance?: number    // Minimum relevance score (0-100)
  fromDate?: string        // ISO date string
  toDate?: string          // ISO date string
  source?: string          // Filter by news source
  keywords?: string        // Comma-separated keywords
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  articles: NewsArticle[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  },
  meta: {
    totalSources: number,
    dateRange: {
      earliest: string,
      latest: string
    },
    averageRelevance: number
  }
}
```

### Manual News Refresh (Admin Only)
Admin-triggered news collection with cache bypass and enhanced options.

**Endpoint:** `POST /api/news/refresh`

**Authentication:** Admin role required

**Request Body:**
```typescript
{
  topic?: string           // Specific topic search (e.g., "macron", "elections")
  sources?: string | string[]  // Specific sources (e.g., "lemonde.fr")
  clearCache?: boolean     // Clear expired cache entries
  limit?: number          // Max articles (1-30, default: 30)
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  jobId: string,
  refreshType: 'topic' | 'sources' | 'general',
  results: {
    collected: number,
    saved: number,
    duplicates: number,
    invalid: number,
    errors: string[]
  },
  stats: {
    totalArticles: number,
    todayArticles: number,
    averageRelevance: number,
    sourcesCount: number
  },
  available: number,
  searchParams: {
    text: string,
    sources: string,
    limit: number
  }
}

// Unauthorized (401)
{
  error: "Admin access required" | "Account not verified"
}
```

### Get Collection Statistics
Retrieve news collection system statistics.

**Endpoint:** `GET /api/news/collect`

**Response:**
```typescript
// Success (200)
{
  stats: {
    articles: {
      totalArticles: number,
      todayArticles: number,
      averageRelevance: number,
      topSources: Array<{
        source: string,
        count: number
      }>
    },
    usage: APIUsageStats[],      // Last 7 days
    cache: {
      totalEntries: number,
      hitRate: number,
      avgAge: number
    },
    recentJobs: NewsCollectionJob[]
  }
}
```

---

## Data Management APIs

### Email Verification
Handle email verification tokens for user accounts.

**Endpoint:** `GET /api/verify-email`

**Query Parameters:**
```typescript
{
  token: string    // Email verification token
  email: string    // User's email address
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  message: "Email verified successfully",
  redirectUrl: "/dashboard"
}

// Error (400)
{
  error: "Invalid or expired token" | "Email already verified"
}
```

### User Verification
Admin endpoint for verifying user accounts and assigning roles.

**Endpoint:** `POST /api/verify-user`

**Authentication:** Admin role required

**Request Body:**
```typescript
{
  userId: string,
  action: 'verify' | 'unverify' | 'promote' | 'demote',
  newRole?: 'user' | 'moderator' | 'admin'
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  message: "User updated successfully",
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    verification_status: string
  }
}

// Unauthorized (403)
{
  error: "Insufficient permissions"
}
```

---

## Utility APIs

### Email Sending
Send various types of emails through Mailjet integration.

**Endpoint:** `POST /api/send-email`

**Request Body:**
```typescript
{
  type: 'verification' | 'notification' | 'moderation',
  to: string,              // Recipient email
  data: {                  // Template data
    name?: string,
    verificationUrl?: string,
    politicianName?: string,
    voteDetails?: object
  }
}
```

**Response:**
```typescript
// Success (200)
{
  success: true,
  messageId: string,
  message: "Email sent successfully"
}

// Error (400/500)
{
  error: "Failed to send email" | "Invalid recipient" | "Template error"
}
```

### Mailjet Configuration Check
Verify Mailjet API configuration and test connectivity.

**Endpoint:** `GET /api/mailjet-config`

**Response:**
```typescript
// Success (200)
{
  configured: boolean,
  apiKey: string,           // Masked for security
  secretKey: string,        // Masked for security
  testResult: {
    success: boolean,
    message: string,
    responseTime: number
  }
}

// Configuration Error (500)
{
  error: "Mailjet not configured",
  details: "Missing API keys or invalid configuration"
}
```

---

## Error Handling Patterns

### Standard Error Response Format
All APIs use consistent error response structure.

```typescript
// Client Error (4xx)
{
  error: string,           // Human-readable error message
  code?: string,           // Machine-readable error code
  details?: object,        // Additional error context
  timestamp: string        // ISO timestamp
}

// Server Error (5xx)
{
  error: string,
  requestId?: string,      // For error tracking
  timestamp: string
}
```

### Error Code Categories
Standardized error codes for different error types.

```typescript
// Authentication Errors (401-403)
'AUTH_REQUIRED'          // Authentication required
'AUTH_INVALID'           // Invalid credentials
'AUTH_EXPIRED'           // Session expired
'INSUFFICIENT_PERMISSIONS' // Access denied

// Validation Errors (400)
'VALIDATION_ERROR'       // Input validation failed
'MISSING_REQUIRED_FIELD' // Required field missing
'INVALID_FORMAT'         // Invalid data format
'OUT_OF_RANGE'          // Value out of allowed range

// Resource Errors (404-409)
'NOT_FOUND'             // Resource not found
'ALREADY_EXISTS'        // Resource already exists
'RESOURCE_CONFLICT'     // Resource conflict

// Rate Limiting (429)
'RATE_LIMITED'          // Rate limit exceeded
'QUOTA_EXCEEDED'        // API quota exceeded

// External Service Errors (502-504)
'EXTERNAL_API_ERROR'    // Third-party API error
'SERVICE_UNAVAILABLE'   // External service down
'TIMEOUT'               // Request timeout
```

### Error Handling Implementation
```typescript
// Centralized error handler
function handleError(error: unknown, request: NextRequest): NextResponse {
  const requestId = crypto.randomUUID()

  // Log error with context
  console.error(`[${requestId}] API Error:`, {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  })

  // Validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.errors,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }

  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any

    if (dbError.code === '23505') { // Unique constraint violation
      return NextResponse.json({
        error: 'Resource already exists',
        code: 'ALREADY_EXISTS',
        requestId,
        timestamp: new Date().toISOString()
      }, { status: 409 })
    }
  }

  // Generic server error
  return NextResponse.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString()
  }, { status: 500 })
}
```

---

## Rate Limiting and Security

### API Rate Limiting
Protect against abuse with intelligent rate limiting.

```typescript
// News API rate limiting
class RateLimiter {
  async checkDailyLimit(service: string): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', {
      service_name: service,
      daily_limit: this.limits[service]
    })
    return data
  }

  async trackUsage(service: string, endpoint: string, status: number) {
    await supabase.from('api_usage_log').upsert({
      service,
      endpoint,
      requests_count: 1,
      response_status: status,
      date: new Date().toISOString().split('T')[0]
    }, {
      onConflict: 'service,endpoint,date'
    })
  }
}

// Usage in route handlers
export async function POST(request: NextRequest) {
  const canProceed = await rateLimiter.checkDailyLimit('worldnews')
  if (!canProceed) {
    return NextResponse.json(
      { error: 'Daily API limit reached' },
      { status: 429 }
    )
  }

  try {
    const result = await processRequest()
    await rateLimiter.trackUsage('worldnews', '/search', 200)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    await rateLimiter.trackUsage('worldnews', '/search', 500)
    throw error
  }
}
```

### Request Validation
Comprehensive input validation for all endpoints.

```typescript
// Common validation schemas
const commonSchemas = {
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  url: z.string().url().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
}

// Endpoint-specific validation
const voteSchema = z.object({
  politician_id: z.string().uuid(),
  vote_type: z.enum(['positive', 'negative']),
  points: z.number().min(1).max(10),
  category: z.enum(['integrity', 'competence', 'transparency', 'consistency', 'leadership', 'other']),
  evidence_title: z.string().min(10).max(500),
  evidence_description: z.string().min(50).max(2000),
  evidence_url: z.string().url().optional(),
  evidence_type: z.enum(['article', 'video', 'document', 'social_media', 'speech', 'interview', 'other'])
})

// Validation middleware
function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<T> => {
    try {
      const body = await request.json()
      return schema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request data', error.errors)
      }
      throw new Error('Failed to parse request body')
    }
  }
}
```

### Authentication Middleware
Protect sensitive endpoints with authentication checks.

```typescript
// Authentication helper
async function requireAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new AuthError('Authentication required')
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      throw new AuthError('Invalid authentication token')
    }

    // Get extended user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return { user, profile }
  } catch (error) {
    throw new AuthError('Authentication failed')
  }
}

// Role-based authorization
async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const { profile } = await requireAuth(request)

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError('Insufficient permissions')
  }

  return profile
}

// Usage in protected routes
export async function POST(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireRole(request, ['admin'])

    // Process admin-only operation
    const result = await processAdminRequest(user)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    throw error
  }
}
```

This API documentation ensures that Politik Cred' maintains secure, consistent, and well-documented endpoints that support the platform's political transparency mission while adhering to French legal requirements and modern API best practices.