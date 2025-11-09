-- Migration: Fix Promise Read Policy
-- Date: 2025-01-08
-- Description: Allow public read access to all promises (this is a transparency platform)

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can read verified promises" ON political_promises;
DROP POLICY IF EXISTS "Authenticated users can read all promises" ON political_promises;

-- Create a new policy that allows everyone to read all promises
CREATE POLICY "Anyone can read all promises" ON political_promises
    FOR SELECT USING (true);

-- Keep the insert/update/delete policies restricted to admins
-- (These should already exist from the previous migration)
