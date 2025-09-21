-- Database seeding script for Politics Trust platform
-- Run this after the main schema and user trigger are set up

-- Insert sample politicians
INSERT INTO politicians (id, name, first_name, last_name, party, position, image_url, bio, credibility_score) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Emmanuel Macron',
  'Emmanuel',
  'Macron',
  'Renaissance',
  'Président de la République',
  '/assets/politicians/macron.png',
  'Président de la République française depuis 2017, ancien ministre de l''Économie.',
  85
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  'Marine Le Pen',
  'Marine',
  'Le Pen',
  'Rassemblement National',
  'Députée du Pas-de-Calais',
  '/assets/politicians/lepen.png',
  'Présidente du Rassemblement National, députée du Pas-de-Calais.',
  65
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  'Sébastien Lecornu',
  'Sébastien',
  'Lecornu',
  'Renaissance',
  'Ministre des Armées',
  '/assets/politicians/lecornu.png',
  'Ministre des Armées depuis 2022, ancien ministre des Outre-mer.',
  75
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d482',
  'Jean-Luc Mélenchon',
  'Jean-Luc',
  'Mélenchon',
  'La France Insoumise',
  'Député des Bouches-du-Rhône',
  '/assets/politicians/melenchon.png',
  'Député des Bouches-du-Rhône, président du groupe La France insoumise à l''Assemblée nationale.',
  70
) ON CONFLICT (id) DO NOTHING;

-- Create a moderator account (you'll need to update the email and password)
-- Note: This user will need to be created in Supabase Auth first, then we update their role
-- For demo purposes, we'll create a placeholder that can be updated with real auth ID

-- Insert demo moderator user (replace with actual auth UUID after signup)
INSERT INTO users (
  id,
  email,
  name,
  role,
  reputation_score,
  is_verified
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Placeholder UUID - replace with real auth UUID
  'moderator@politikcred.fr',
  'Demo Moderator',
  'moderator',
  100,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;

-- Insert demo admin user
INSERT INTO users (
  id,
  email,
  name,
  role,
  reputation_score,
  is_verified
) VALUES (
  '00000000-0000-0000-0000-000000000002', -- Placeholder UUID - replace with real auth UUID
  'admin@politikcred.fr',
  'Demo Admin',
  'admin',
  150,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;

-- Insert some sample votes to test moderation
INSERT INTO votes (
  politician_id,
  user_id,
  vote_type,
  points,
  category,
  evidence_title,
  evidence_description,
  evidence_url,
  evidence_type,
  source_credibility,
  status
) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', -- Macron
  '00000000-0000-0000-0000-000000000001', -- Demo moderator
  'positive',
  7,
  'leadership',
  'Discours sur la souveraineté européenne',
  'Emmanuel Macron a prononcé un discours remarqué sur la nécessité de renforcer la souveraineté européenne face aux défis géopolitiques actuels.',
  'https://exemple.fr/discours-souverainete-europe',
  'speech',
  8,
  'approved'
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d480', -- Le Pen
  '00000000-0000-0000-0000-000000000001', -- Demo moderator
  'negative',
  5,
  'consistency',
  'Changement de position sur l''euro',
  'Marine Le Pen a modifié sa position concernant la sortie de l''euro, créant une confusion dans son programme économique.',
  'https://exemple.fr/changement-position-euro',
  'article',
  7,
  'pending'
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d481', -- Lecornu
  '00000000-0000-0000-0000-000000000001', -- Demo moderator
  'positive',
  6,
  'competence',
  'Gestion de la crise des sous-marins',
  'Sébastien Lecornu a efficacement géré la crise diplomatique suite à l''annulation du contrat des sous-marins avec l''Australie.',
  'https://exemple.fr/gestion-crise-sous-marins',
  'document',
  9,
  'pending'
) ON CONFLICT (user_id, politician_id, category, evidence_title) DO NOTHING;

-- Function to update moderator role for existing auth user
CREATE OR REPLACE FUNCTION update_user_role(user_email TEXT, new_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = user_email;

  IF auth_user_id IS NULL THEN
    RETURN 'User not found in auth.users with email: ' || user_email;
  END IF;

  -- Update or insert the user in public.users
  INSERT INTO public.users (id, email, name, role, is_verified)
  VALUES (auth_user_id, user_email, 'Moderator', new_role, true)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();

  RETURN 'Successfully updated user role to: ' || new_role;
END;
$$;

-- Instructions for setting up moderator account:
-- 1. Create a Supabase account with email: moderator@politikcred.fr
-- 2. Run: SELECT update_user_role('moderator@politikcred.fr', 'moderator');
-- 3. Similarly for admin: SELECT update_user_role('admin@politikcred.fr', 'admin');

-- Create indexes for better performance on new queries
CREATE INDEX IF NOT EXISTS idx_votes_user_status ON votes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);

-- View for user vote statistics
CREATE OR REPLACE VIEW user_vote_stats AS
SELECT
  u.id as user_id,
  u.name,
  u.email,
  COUNT(v.id) as total_votes,
  COUNT(CASE WHEN v.status = 'approved' THEN 1 END) as approved_votes,
  COUNT(CASE WHEN v.status = 'rejected' THEN 1 END) as rejected_votes,
  COUNT(CASE WHEN v.status = 'pending' THEN 1 END) as pending_votes,
  ROUND(
    CASE
      WHEN COUNT(v.id) > 0 THEN
        (COUNT(CASE WHEN v.status = 'approved' THEN 1 END)::FLOAT / COUNT(v.id)) * 100
      ELSE 0
    END, 1
  ) as approval_rate,
  u.reputation_score
FROM users u
LEFT JOIN votes v ON u.id = v.user_id
GROUP BY u.id, u.name, u.email, u.reputation_score;