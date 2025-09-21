-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  reputation_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Politicians table
CREATE TABLE politicians (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT,
  position TEXT,
  image_url TEXT,
  bio TEXT,
  credibility_score INTEGER DEFAULT 100 CHECK (credibility_score >= 0 AND credibility_score <= 200),
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('positive', 'negative')),
  points INTEGER NOT NULL CHECK (points > 0 AND points <= 10),
  evidence_title TEXT NOT NULL,
  evidence_description TEXT NOT NULL,
  evidence_url TEXT,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('article', 'video', 'document', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update politician score when vote is approved
CREATE OR REPLACE FUNCTION update_politician_score()
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
      updated_at = NOW()
    WHERE id = NEW.politician_id;
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Reverse the score change if vote is rejected after being approved
    UPDATE politicians
    SET
      credibility_score = CASE
        WHEN NEW.vote_type = 'positive' THEN
          GREATEST(credibility_score - NEW.points, 0)
        ELSE
          LEAST(credibility_score + NEW.points, 200)
      END,
      total_votes = total_votes - 1,
      updated_at = NOW()
    WHERE id = NEW.politician_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update politician score
CREATE TRIGGER vote_status_change
  AFTER UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_politician_score();

-- Function to prevent duplicate votes from same user for same politician
CREATE OR REPLACE FUNCTION check_duplicate_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM votes
    WHERE politician_id = NEW.politician_id
    AND user_id = NEW.user_id
    AND status = 'approved'
    AND evidence_title = NEW.evidence_title
  ) THEN
    RAISE EXCEPTION 'User has already voted on this politician with similar evidence';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check duplicate votes
CREATE TRIGGER prevent_duplicate_votes
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_vote();

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Everyone can read politicians
CREATE POLICY "Everyone can read politicians" ON politicians
  FOR SELECT TO authenticated USING (true);

-- Only admins can create/update politicians
CREATE POLICY "Admins can manage politicians" ON politicians
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can read all votes
CREATE POLICY "Users can read votes" ON votes
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can create votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending votes
CREATE POLICY "Users can update own pending votes" ON votes
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  );

-- Moderators and admins can update vote status
CREATE POLICY "Moderators can moderate votes" ON votes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Insert some sample politicians
INSERT INTO politicians (name, party, position, bio) VALUES
('Emmanuel Macron', 'Renaissance', 'Président de la République', 'Président de la République française depuis 2017.'),
('Marine Le Pen', 'Rassemblement National', 'Députée', 'Présidente du Rassemblement National.'),
('Jean-Luc Mélenchon', 'La France Insoumise', 'Député', 'Fondateur de La France Insoumise.');