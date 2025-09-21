-- Enhanced Politics Trust Database Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced Users table with reputation and contribution tracking
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  reputation_score INTEGER DEFAULT 100,
  contribution_score INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  total_votes_submitted INTEGER DEFAULT 0,
  approved_votes INTEGER DEFAULT 0,
  rejected_votes INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  location TEXT,
  political_preference TEXT CHECK (political_preference IN ('left', 'center-left', 'center', 'center-right', 'right', 'prefer-not-say')),
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'email_verified', 'phone_verified', 'identity_verified')),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Politicians table with comprehensive data
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
  trending_score INTEGER DEFAULT 0,
  last_updated_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Votes table with advanced evidence tracking
DROP TABLE IF EXISTS votes CASCADE;
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('positive', 'negative')),
  points INTEGER NOT NULL CHECK (points > 0 AND points <= 10),
  category TEXT NOT NULL CHECK (category IN ('integrity', 'competence', 'transparency', 'consistency', 'leadership', 'other')),
  evidence_title TEXT NOT NULL,
  evidence_description TEXT NOT NULL,
  evidence_url TEXT,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('article', 'video', 'document', 'social_media', 'speech', 'interview', 'other')),
  source_credibility INTEGER DEFAULT 5 CHECK (source_credibility >= 1 AND source_credibility <= 10),
  fact_check_status TEXT DEFAULT 'pending' CHECK (fact_check_status IN ('pending', 'verified', 'disputed', 'false')),
  ai_confidence_score DECIMAL(5,2) DEFAULT 0.00,
  community_rating DECIMAL(3,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderation_reason TEXT,
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments system for community discussion
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE user_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('vote_submitted', 'comment_posted', 'vote_moderated', 'profile_updated', 'login')),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fact-checking results
CREATE TABLE fact_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  checker_type TEXT NOT NULL CHECK (checker_type IN ('ai', 'human', 'external_api')),
  checker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('true', 'mostly_true', 'partially_true', 'mostly_false', 'false', 'unverifiable')),
  confidence_score DECIMAL(5,2) NOT NULL,
  explanation TEXT,
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vote ratings by community
CREATE TABLE vote_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vote_id, user_id)
);

-- User badges and achievements
CREATE TABLE user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('first_vote', 'fact_checker', 'trusted_contributor', 'expert', 'moderator_choice', 'accuracy_master')),
  badge_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Politician updates and changes tracking
CREATE TABLE politician_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced functions and triggers

-- Function to update user reputation based on vote accuracy
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Increase user reputation for approved votes
    UPDATE users
    SET
      reputation_score = LEAST(reputation_score + 5, 1000),
      approved_votes = approved_votes + 1,
      contribution_score = contribution_score + NEW.points,
      accuracy_rate = CASE
        WHEN total_votes_submitted > 0 THEN
          (approved_votes::DECIMAL / total_votes_submitted) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.user_id;

  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    -- Decrease user reputation for rejected votes
    UPDATE users
    SET
      reputation_score = GREATEST(reputation_score - 2, 0),
      rejected_votes = rejected_votes + 1,
      accuracy_rate = CASE
        WHEN total_votes_submitted > 0 THEN
          (approved_votes::DECIMAL / total_votes_submitted) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update politician score and stats
CREATE OR REPLACE FUNCTION update_politician_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE politicians
    SET
      credibility_score = CASE
        WHEN NEW.vote_type = 'positive' THEN
          LEAST(credibility_score + NEW.points, 200)
        ELSE
          GREATEST(credibility_score - NEW.points, 0)
      END,
      total_votes = total_votes + 1,
      positive_votes = CASE
        WHEN NEW.vote_type = 'positive' THEN positive_votes + 1
        ELSE positive_votes
      END,
      negative_votes = CASE
        WHEN NEW.vote_type = 'negative' THEN negative_votes + 1
        ELSE negative_votes
      END,
      updated_at = NOW()
    WHERE id = NEW.politician_id;

  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Reverse the changes if vote is rejected after being approved
    UPDATE politicians
    SET
      credibility_score = CASE
        WHEN NEW.vote_type = 'positive' THEN
          GREATEST(credibility_score - NEW.points, 0)
        ELSE
          LEAST(credibility_score + NEW.points, 200)
      END,
      total_votes = total_votes - 1,
      positive_votes = CASE
        WHEN NEW.vote_type = 'positive' THEN positive_votes - 1
        ELSE positive_votes
      END,
      negative_votes = CASE
        WHEN NEW.vote_type = 'negative' THEN negative_votes - 1
        ELSE negative_votes
      END,
      updated_at = NOW()
    WHERE id = NEW.politician_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track user activities
CREATE OR REPLACE FUNCTION track_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activities (user_id, activity_type, details)
    VALUES (NEW.user_id, 'vote_submitted', jsonb_build_object(
      'vote_id', NEW.id,
      'politician_id', NEW.politician_id,
      'vote_type', NEW.vote_type,
      'points', NEW.points
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update vote count when user submits
CREATE OR REPLACE FUNCTION update_user_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users
    SET
      total_votes_submitted = total_votes_submitted + 1,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER vote_status_change
  AFTER UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

CREATE TRIGGER politician_stats_update
  AFTER UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_politician_stats();

CREATE TRIGGER user_activity_tracker
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION track_user_activity();

CREATE TRIGGER user_vote_counter
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_vote_count();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_politicians_updated_at
  BEFORE UPDATE ON politicians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_updates ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public user profiles" ON users
  FOR SELECT USING (true);

-- Politicians policies
CREATE POLICY "Everyone can read politicians" ON politicians
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Verified users can update politicians" ON politicians
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (role IN ('admin', 'moderator') OR reputation_score >= 500)
    )
  );

-- Votes policies
CREATE POLICY "Users can read all votes" ON votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending votes" ON votes
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  );

CREATE POLICY "Moderators can moderate votes" ON votes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Comments policies
CREATE POLICY "Users can read comments" ON comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Sample data insertion
INSERT INTO politicians (name, first_name, last_name, party, position, bio, political_orientation, is_active) VALUES
('Emmanuel Macron', 'Emmanuel', 'Macron', 'Renaissance', 'Président de la République', 'Président de la République française depuis 2017.', 'center', true),
('Marine Le Pen', 'Marine', 'Le Pen', 'Rassemblement National', 'Députée', 'Présidente du Rassemblement National.', 'right', true),
('Jean-Luc Mélenchon', 'Jean-Luc', 'Mélenchon', 'La France Insoumise', 'Député', 'Fondateur de La France Insoumise.', 'left', true),
('Michel Barnier', 'Michel', 'Barnier', 'Les Républicains', 'Premier ministre', 'Premier ministre français depuis septembre 2024.', 'center-right', true),
('Gabriel Attal', 'Gabriel', 'Attal', 'Renaissance', 'Ancien Premier ministre', 'Plus jeune Premier ministre de la Ve République.', 'center', true);

-- Create indexes for performance
CREATE INDEX idx_votes_politician_id ON votes(politician_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_status ON votes(status);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_politicians_active ON politicians(is_active);
CREATE INDEX idx_politicians_credibility ON politicians(credibility_score DESC);
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);
CREATE INDEX idx_comments_vote_id ON comments(vote_id);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);