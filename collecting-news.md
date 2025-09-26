# French Political News Feature - Next.js/Supabase Implementation

## Project Context
- **Framework**: Next.js application
- **Database**: Supabase (PostgreSQL)
- **Budget**: Free tier constraints for all services
- **API**: World News API (https://worldnewsapi.com/docs/search-news/)

## Objective
Implement a French political news collection feature that integrates seamlessly with existing Next.js/Supabase stack while maximizing free tier usage and minimizing costs.

## Architecture Overview

### Next.js Integration
- **API Routes**: `/api/news/` endpoints for news operations
- **Cron Jobs**: Vercel Cron or API routes with external cron triggers
- **Server Actions**: For manual news updates from admin interface
- **Client Components**: News display and management UI

### Supabase Database Design

#### Tables Structure
```sql
-- Articles table
CREATE TABLE articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id varchar UNIQUE, -- World News API article ID
  title text NOT NULL,
  content text,
  summary text,
  url varchar NOT NULL,
  source varchar,
  author varchar,
  published_at timestamptz,
  language varchar(2) DEFAULT 'fr',
  category varchar DEFAULT 'politics',
  keywords text[], -- Array of keywords
  image_url varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API usage tracking
CREATE TABLE api_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service varchar NOT NULL, -- 'worldnews'
  endpoint varchar,
  requests_count integer DEFAULT 1,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Cache table for API responses
CREATE TABLE news_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key varchar UNIQUE NOT NULL, -- hash of search parameters
  search_params jsonb,
  response_data jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_cache_expires_at ON news_cache(expires_at);
CREATE INDEX idx_api_usage_date ON api_usage_log(date, service);
```

## Implementation Structure

### File Organization
```
/pages/api/news/
├── collect.js              # Main collection endpoint
├── refresh.js              # Manual refresh trigger
└── stats.js               # Usage statistics

/lib/news/
├── worldNewsClient.js      # API client with rate limiting
├── cacheManager.js         # Supabase cache operations
├── articleProcessor.js     # Data processing & deduplication
└── usageTracker.js        # API usage monitoring

/components/news/
├── NewsGrid.js            # Display articles grid
├── NewsFilters.js         # Filter by date/source
└── AdminPanel.js          # Manual collection controls

/utils/
└── newsConfig.js          # Configuration constants
```

## Core Implementation Features

### 1. Smart Caching with Supabase
```javascript
// Cache strategy using Supabase
const getCachedResults = async (searchParams) => {
  const cacheKey = generateCacheKey(searchParams);
  const { data } = await supabase
    .from('news_cache')
    .select('response_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  return data?.response_data || null;
};
```

### 2. Free Tier Optimization
- **Supabase Free Tier**: 500MB storage, 2GB bandwidth
- **Vercel Free Tier**: 100GB bandwidth, 1000 serverless function invocations
- **World News API**: Track daily/monthly limits in database
- **Edge Functions**: Use Supabase Edge Functions for background processing if needed

### 3. Data Collection Strategy
```javascript
const frenchPoliticsConfig = {
  language: 'fr',
  text: 'politique OR gouvernement OR élections OR parlement',
  source_countries: 'fr',
  sort: 'publish-time',
  sort_direction: 'DESC',
  number: 25, // Optimize batch size for free tier
};
```

### 4. Rate Limiting & Usage Tracking
```javascript
// Track API usage in Supabase
const trackAPIUsage = async (service, endpoint) => {
  await supabase.from('api_usage_log').upsert({
    service,
    endpoint,
    date: new Date().toISOString().split('T')[0],
    requests_count: 1
  }, {
    onConflict: 'service,endpoint,date',
    count: 'exact'
  });
};
```

## Next.js API Routes Implementation

### `/api/news/collect` - Main Collection Endpoint
- Check daily API usage limits
- Implement intelligent caching
- Process and deduplicate articles
- Store in Supabase with conflict resolution
- Return summary statistics

### `/api/news/refresh` - Manual Refresh
- Admin-triggered collection
- Bypass some cache restrictions
- Immediate UI feedback
- Usage tracking and limits

### Cron Job Integration
```javascript
// /api/cron/collect-news
export default async function handler(req, res) {
  // Verify cron secret for security
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Collect news with full error handling
  // Update cache and database
  // Log results
}
```

## Free Tier Optimizations

### Database Efficiency
- **Row-Level Security**: Secure access patterns
- **Efficient Queries**: Use indexes, limit results
- **Data Retention**: Archive old articles to manage storage
- **Compression**: Store article content efficiently

### API Cost Management
- **Incremental Updates**: Only fetch new articles since last update
- **Smart Batching**: Optimize request sizes
- **Cache Everything**: 6-24 hour cache for most queries
- **Fallback Strategies**: Graceful degradation when limits hit

### Vercel Function Optimization
- **Cold Start Reduction**: Keep functions warm with minimal calls
- **Efficient Bundling**: Minimize package sizes
- **Edge Functions**: Use for simple operations when possible

## Frontend Integration

### News Display Component
```javascript
// Server-side data fetching with caching
export async function getServerSideProps() {
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(20);
    
  return { props: { articles } };
}
```

### Real-time Updates
- Use Supabase real-time subscriptions for live updates
- WebSocket connections for admin panel
- Optimistic UI updates

## Configuration Management

### Environment Variables
```env
# World News API
WORLD_NEWS_API_KEY=your_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Cron Security
CRON_SECRET=your_secret_token

# Rate Limiting
DAILY_API_LIMIT=100
MONTHLY_API_LIMIT=1000
```

## Monitoring & Analytics

### Supabase Dashboard Queries
- Daily article collection stats
- API usage tracking
- Cache hit rates
- Storage usage monitoring
- Error logging and alerts

### Admin Interface Features
- Manual news collection trigger
- Usage statistics dashboard
- Cache management controls
- Article management (delete, categorize)

## Deployment Strategy

### Vercel Deployment
- Automatic deployments from Git
- Environment variable management
- Cron job configuration via vercel.json
- Edge function deployment for performance

### Supabase Setup
- Database migrations via SQL scripts
- Row Level Security policies
- API key management
- Real-time subscription setup

## Success Metrics
- Collect 30-50 French political articles daily within free tiers
- Maintain 80%+ cache hit rate
- Stay under API limits with buffer room
- Sub-2 second page load times
- Zero data loss during collection failures

## Deliverables
1. **Complete Next.js integration** with all API routes
2. **Supabase database schema** with migrations
3. **Admin dashboard** for monitoring 