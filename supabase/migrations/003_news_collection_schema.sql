-- Migration: News Collection System for French Political News
-- Date: 2024-01-26
-- Description: Creates tables for news articles, API usage tracking, and caching

-- Articles table for storing collected news
CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id varchar UNIQUE, -- World News API article ID
  title text NOT NULL,
  content text,
  summary text,
  url varchar NOT NULL UNIQUE, -- Prevent duplicate URLs
  source varchar,
  author varchar,
  published_at timestamptz,
  language varchar(2) DEFAULT 'fr',
  category varchar DEFAULT 'politics',
  keywords text[], -- Array of keywords for search
  image_url varchar,
  sentiment varchar, -- positive, negative, neutral
  relevance_score integer DEFAULT 50, -- 0-100 relevance to politics
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API usage tracking to monitor free tier limits
CREATE TABLE IF NOT EXISTS api_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service varchar NOT NULL, -- 'worldnews', 'other'
  endpoint varchar,
  requests_count integer DEFAULT 1,
  response_status integer, -- HTTP status code
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service, endpoint, date)
);

-- Cache table for API responses to minimize API calls
CREATE TABLE IF NOT EXISTS news_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key varchar UNIQUE NOT NULL, -- hash of search parameters
  search_params jsonb,
  response_data jsonb,
  article_count integer DEFAULT 0,
  expires_at timestamptz,
  hit_count integer DEFAULT 0, -- Track cache usage
  created_at timestamptz DEFAULT now()
);

-- News collection jobs tracking
CREATE TABLE IF NOT EXISTS news_collection_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type varchar NOT NULL, -- 'scheduled', 'manual', 'refresh'
  status varchar DEFAULT 'running', -- 'running', 'completed', 'failed'
  articles_collected integer DEFAULT 0,
  articles_new integer DEFAULT 0,
  articles_updated integer DEFAULT 0,
  api_calls_made integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON articles USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON news_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_key ON news_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(date, service);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_log(service, date DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON news_collection_jobs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON news_collection_jobs(job_type, started_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to articles table
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_collection_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for articles (for website visitors)
CREATE POLICY "Articles are publicly readable" ON articles
    FOR SELECT USING (true);

-- Admin access for all operations (you'll need to define admin role)
CREATE POLICY "Admins have full access to articles" ON articles
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins have full access to api_usage_log" ON api_usage_log
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins have full access to news_cache" ON news_cache
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins have full access to news_collection_jobs" ON news_collection_jobs
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM news_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(service_name varchar DEFAULT 'worldnews')
RETURNS TABLE(
    date date,
    total_requests integer,
    unique_endpoints integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        api_usage_log.date,
        SUM(requests_count)::integer as total_requests,
        COUNT(DISTINCT endpoint)::integer as unique_endpoints
    FROM api_usage_log
    WHERE service = service_name
    GROUP BY api_usage_log.date
    ORDER BY api_usage_log.date DESC
    LIMIT 30;
END;
$$ LANGUAGE plpgsql;

-- Function to check daily API limits
CREATE OR REPLACE FUNCTION check_daily_api_limit(
    service_name varchar DEFAULT 'worldnews',
    daily_limit integer DEFAULT 100
)
RETURNS boolean AS $$
DECLARE
    today_usage integer;
BEGIN
    SELECT COALESCE(SUM(requests_count), 0) INTO today_usage
    FROM api_usage_log
    WHERE service = service_name
    AND date = CURRENT_DATE;

    RETURN today_usage < daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
INSERT INTO articles (title, content, url, source, published_at, keywords) VALUES
(
    'Test Article: French Political News',
    'This is a test article for the French political news system.',
    'https://example.com/test-article-1',
    'Test Source',
    CURRENT_TIMESTAMP,
    ARRAY['politique', 'test', 'france']
) ON CONFLICT (url) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON articles TO anon;
GRANT ALL ON articles, api_usage_log, news_cache, news_collection_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_usage_stats(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_api_limit(varchar, integer) TO authenticated;