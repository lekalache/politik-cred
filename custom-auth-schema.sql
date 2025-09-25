-- Custom Authentication Schema (without Supabase Auth to avoid free tier limits)
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with custom authentication
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 100,
  contribution_score INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  total_votes_submitted INTEGER DEFAULT 0,
  approved_votes INTEGER DEFAULT 0,
  rejected_votes INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  location TEXT,
  political_preference TEXT CHECK (political_preference IN ('left', 'center-left', 'center', 'center-right', 'right', 'prefer-not-say')),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email verification tokens table
CREATE TABLE verification_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (optional - for session management)
CREATE TABLE user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Politicians table (updated to work with custom users table)
DROP TABLE IF EXISTS politicians CASCADE;
CREATE TABLE politicians (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  position TEXT,
  constituency TEXT,
  image_url TEXT,
  bio TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-say')),
  political_orientation TEXT CHECK (political_orientation IN ('left', 'center-left', 'center', 'center-right', 'right')),
  social_media JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  education TEXT,
  career_history TEXT,
  key_policies TEXT[],
  controversies TEXT[],
  achievements TEXT[],
  credibility_score INTEGER DEFAULT 100 CHECK (credibility_score >= 0 AND credibility_score <= 200),
  total_votes INTEGER DEFAULT 0,
  positive_votes INTEGER DEFAULT 0,
  negative_votes INTEGER DEFAULT 0,
  transparency_score INTEGER DEFAULT 100,
  consistency_score INTEGER DEFAULT 100,
  integrity_score INTEGER DEFAULT 100,
  engagement_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table (updated to work with custom users table)
DROP TABLE IF EXISTS votes CASCADE;
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  politician_id UUID NOT NULL REFERENCES politicians(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('positive', 'negative', 'rectification')),
  category TEXT NOT NULL CHECK (category IN ('transparency', 'consistency', 'integrity', 'engagement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sources TEXT[] NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  impact_score INTEGER DEFAULT 1 CHECK (impact_score >= 1 AND impact_score <= 10),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'disputed')),
  moderation_notes TEXT,
  ai_analysis JSONB DEFAULT '{}',
  community_rating DECIMAL(3,2) DEFAULT 0.00,
  total_community_votes INTEGER DEFAULT 0,
  duplicate_of UUID REFERENCES votes(id),
  is_duplicate BOOLEAN DEFAULT FALSE,
  priority_score INTEGER DEFAULT 1,
  submission_ip INET,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, politician_id, title) -- Prevent exact duplicates from same user
);

-- Comments table (updated to work with custom users table)
DROP TABLE IF EXISTS comments CASCADE;
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User vote reactions table
DROP TABLE IF EXISTS user_vote_reactions CASCADE;
CREATE TABLE user_vote_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  vote_id UUID NOT NULL REFERENCES votes(id),
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('support', 'oppose', 'needs_more_evidence', 'well_sourced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, vote_id) -- One reaction per user per vote
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_expires ON verification_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_politician_id ON votes(politician_id);
CREATE INDEX idx_votes_status ON votes(status);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_comments_vote_id ON comments(vote_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_politicians_credibility_score ON politicians(credibility_score);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_politicians BEFORE UPDATE ON politicians FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_votes BEFORE UPDATE ON votes FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_comments BEFORE UPDATE ON comments FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Insert default admin user (password should be hashed in real implementation)
-- Default password: 'admin123' (this should be changed immediately)
INSERT INTO users (id, email, name, password_hash, role, is_verified)
VALUES (
  uuid_generate_v4(),
  'admin@politik-cred.fr',
  'Admin User',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'admin',
  TRUE
);