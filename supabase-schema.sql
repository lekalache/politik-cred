-- Core database schema for Politics Trust platform
-- This creates the essential tables needed for the application

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    reputation_score INTEGER DEFAULT 50,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    is_verified BOOLEAN DEFAULT false,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    profile_picture TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Politicians table
CREATE TABLE IF NOT EXISTS politicians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    party TEXT,
    position TEXT,
    constituency TEXT,
    image_url TEXT,
    bio TEXT,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    political_orientation TEXT CHECK (political_orientation IN ('left', 'center-left', 'center', 'center-right', 'right')),
    social_media JSONB DEFAULT '{}',
    contact_info JSONB DEFAULT '{}',
    education TEXT,
    career_history TEXT,
    key_policies TEXT[] DEFAULT '{}',
    controversies TEXT[] DEFAULT '{}',
    achievements TEXT[] DEFAULT '{}',
    credibility_score INTEGER DEFAULT 100,
    total_votes INTEGER DEFAULT 0,
    positive_votes INTEGER DEFAULT 0,
    negative_votes INTEGER DEFAULT 0,
    trending_score INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('positive', 'negative')),
    points INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL CHECK (category IN ('integrity', 'competence', 'transparency', 'consistency', 'leadership')),
    evidence_title TEXT NOT NULL,
    evidence_description TEXT NOT NULL,
    evidence_url TEXT,
    evidence_type TEXT DEFAULT 'other' CHECK (evidence_type IN ('article', 'video', 'document', 'other')),
    source_credibility INTEGER DEFAULT 5 CHECK (source_credibility BETWEEN 1 AND 10),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, politician_id, category, evidence_title)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_flagged BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (vote_id IS NOT NULL OR politician_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_politicians_name ON politicians(name);
CREATE INDEX IF NOT EXISTS idx_politicians_party ON politicians(party);
CREATE INDEX IF NOT EXISTS idx_politicians_active ON politicians(is_active);
CREATE INDEX IF NOT EXISTS idx_votes_politician ON votes(politician_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);
CREATE INDEX IF NOT EXISTS idx_comments_vote ON comments(vote_id);
CREATE INDEX IF NOT EXISTS idx_comments_politician ON comments(politician_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile and others' public info
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Politicians are publicly readable
CREATE POLICY "Politicians are publicly readable" ON politicians
    FOR SELECT USING (true);

-- Only admins can modify politicians
CREATE POLICY "Only admins can modify politicians" ON politicians
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Votes policies
CREATE POLICY "Anyone can read approved votes" ON votes
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can read their own votes" ON votes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create votes" ON votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending votes" ON votes
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Moderators can read all votes" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('moderator', 'admin')
        )
    );

CREATE POLICY "Moderators can update vote status" ON votes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('moderator', 'admin')
        )
    );

-- Comments policies
CREATE POLICY "Anyone can read active comments" ON comments
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions to update politician scores
CREATE OR REPLACE FUNCTION update_politician_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Update politician statistics when vote is approved/rejected
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'approved' THEN
        UPDATE politicians
        SET
            total_votes = total_votes + 1,
            positive_votes = CASE WHEN NEW.vote_type = 'positive' THEN positive_votes + 1 ELSE positive_votes END,
            negative_votes = CASE WHEN NEW.vote_type = 'negative' THEN negative_votes + 1 ELSE negative_votes END,
            credibility_score = credibility_score + (CASE WHEN NEW.vote_type = 'positive' THEN NEW.points ELSE -NEW.points END),
            updated_at = NOW()
        WHERE id = NEW.politician_id;
    END IF;

    -- Update user reputation
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'approved' THEN
            UPDATE users SET reputation_score = reputation_score + 5 WHERE id = NEW.user_id;
        ELSIF NEW.status = 'rejected' THEN
            UPDATE users SET reputation_score = GREATEST(0, reputation_score - 2) WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_politician_scores_trigger ON votes;
CREATE TRIGGER update_politician_scores_trigger
    AFTER UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_politician_scores();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_politicians_updated_at BEFORE UPDATE ON politicians FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();