-- Additional tables and functions for moderation system

-- Add moderation fields to existing tables
ALTER TABLE votes ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE votes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('vote', 'comment', 'user', 'politician')),
    item_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'unflag', 'ban', 'unban', 'warn')),
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_moderation_action UNIQUE (moderator_id, item_type, item_id, created_at)
);

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_item_type TEXT NOT NULL CHECK (reported_item_type IN ('vote', 'comment', 'user', 'politician')),
    reported_item_id UUID NOT NULL,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content quality scores table
CREATE TABLE IF NOT EXISTS content_quality_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_type TEXT NOT NULL CHECK (content_type IN ('vote', 'comment')),
    content_id UUID NOT NULL,
    ai_score DECIMAL(3,2) CHECK (ai_score >= 0 AND ai_score <= 1),
    human_score DECIMAL(3,2) CHECK (human_score >= 0 AND human_score <= 1),
    credibility_score DECIMAL(3,2) CHECK (credibility_score >= 0 AND credibility_score <= 1),
    bias_score DECIMAL(3,2) CHECK (bias_score >= 0 AND bias_score <= 1),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    quality_factors JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_quality_score UNIQUE (content_type, content_id)
);

-- Automated moderation rules table
CREATE TABLE IF NOT EXISTS moderation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'pattern', 'ai_threshold', 'user_behavior')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    severity_level INTEGER DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 5),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL CHECK (item_type IN ('vote', 'comment', 'user_report')),
    item_id UUID NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    assigned_to UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'escalated')),
    triggered_by_rule UUID REFERENCES moderation_rules(id),
    auto_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_queue_item UNIQUE (item_type, item_id)
);

-- Trust scores table for users
CREATE TABLE IF NOT EXISTS user_trust_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) DEFAULT 50.0 CHECK (overall_score >= 0 AND overall_score <= 100),
    accuracy_score DECIMAL(5,2) DEFAULT 50.0 CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
    reliability_score DECIMAL(5,2) DEFAULT 50.0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    contribution_score DECIMAL(5,2) DEFAULT 50.0 CHECK (contribution_score >= 0 AND contribution_score <= 100),
    behavior_score DECIMAL(5,2) DEFAULT 50.0 CHECK (behavior_score >= 0 AND behavior_score <= 100),
    warning_count INTEGER DEFAULT 0,
    ban_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE (
    total_pending BIGINT,
    total_approved BIGINT,
    total_rejected BIGINT,
    total_flagged BIGINT,
    avg_review_time INTERVAL,
    accuracy_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM votes WHERE status = 'pending') +
        (SELECT COUNT(*) FROM comments WHERE is_flagged = true) as total_pending,

        (SELECT COUNT(*) FROM votes WHERE status = 'approved') as total_approved,

        (SELECT COUNT(*) FROM votes WHERE status = 'rejected') as total_rejected,

        (SELECT COUNT(*) FROM comments WHERE is_flagged = true) +
        (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') as total_flagged,

        (SELECT AVG(reviewed_at - created_at)
         FROM votes
         WHERE reviewed_at IS NOT NULL) as avg_review_time,

        (SELECT
            CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE (COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / COUNT(*)) * 100
            END
         FROM votes
         WHERE status IN ('approved', 'rejected')) as accuracy_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user trust score
CREATE OR REPLACE FUNCTION calculate_user_trust_score(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    accuracy_score DECIMAL := 50.0;
    reliability_score DECIMAL := 50.0;
    contribution_score DECIMAL := 50.0;
    behavior_score DECIMAL := 50.0;
    overall_score DECIMAL := 50.0;
    vote_count INTEGER;
    approved_votes INTEGER;
    total_points INTEGER;
    warning_count INTEGER;
    ban_count INTEGER;
BEGIN
    -- Get user stats
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status = 'approved'),
           COALESCE(SUM(points), 0)
    INTO vote_count, approved_votes, total_points
    FROM votes
    WHERE user_id = user_uuid;

    -- Get warning and ban counts
    SELECT
        COUNT(*) FILTER (WHERE action = 'warn'),
        COUNT(*) FILTER (WHERE action = 'ban')
    INTO warning_count, ban_count
    FROM moderation_actions
    WHERE item_type = 'user' AND item_id = user_uuid;

    -- Calculate accuracy score (based on approved votes)
    IF vote_count > 0 THEN
        accuracy_score := LEAST(100, (approved_votes::DECIMAL / vote_count) * 100);
    END IF;

    -- Calculate reliability score (based on consistency)
    reliability_score := GREATEST(0, 100 - (warning_count * 10) - (ban_count * 25));

    -- Calculate contribution score (based on total points)
    contribution_score := LEAST(100, 50 + (total_points / 10));

    -- Calculate behavior score (inversely related to reports)
    SELECT COUNT(*) INTO warning_count
    FROM user_reports
    WHERE reported_user_id = user_uuid AND status = 'resolved';

    behavior_score := GREATEST(0, 100 - (warning_count * 5));

    -- Calculate overall score
    overall_score := (accuracy_score + reliability_score + contribution_score + behavior_score) / 4;

    -- Insert or update trust score
    INSERT INTO user_trust_scores (
        user_id, overall_score, accuracy_score, reliability_score,
        contribution_score, behavior_score, warning_count, ban_count
    )
    VALUES (
        user_uuid, overall_score, accuracy_score, reliability_score,
        contribution_score, behavior_score, warning_count, ban_count
    )
    ON CONFLICT (user_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        accuracy_score = EXCLUDED.accuracy_score,
        reliability_score = EXCLUDED.reliability_score,
        contribution_score = EXCLUDED.contribution_score,
        behavior_score = EXCLUDED.behavior_score,
        warning_count = EXCLUDED.warning_count,
        ban_count = EXCLUDED.ban_count,
        last_calculated_at = NOW(),
        updated_at = NOW();

    RETURN overall_score;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-moderate content
CREATE OR REPLACE FUNCTION auto_moderate_content()
RETURNS TRIGGER AS $$
DECLARE
    rule_record RECORD;
    should_flag BOOLEAN := FALSE;
    priority_level INTEGER := 1;
BEGIN
    -- Check against moderation rules
    FOR rule_record IN
        SELECT * FROM moderation_rules
        WHERE is_active = true
        ORDER BY severity_level DESC
    LOOP
        -- Simple keyword detection
        IF rule_record.rule_type = 'keyword' THEN
            IF NEW.content ~* ANY(SELECT jsonb_array_elements_text(rule_record.conditions->'keywords')) THEN
                should_flag := TRUE;
                priority_level := rule_record.severity_level;
            END IF;
        END IF;

        -- Exit early if high priority flag found
        IF should_flag AND priority_level >= 4 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Add to moderation queue if flagged
    IF should_flag THEN
        INSERT INTO moderation_queue (item_type, item_id, priority, auto_flagged, triggered_by_rule)
        VALUES (TG_TABLE_NAME, NEW.id, priority_level, true, rule_record.id)
        ON CONFLICT (item_type, item_id) DO NOTHING;

        -- Update item status if high priority
        IF priority_level >= 4 THEN
            NEW.status := 'flagged';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-moderation
DROP TRIGGER IF EXISTS auto_moderate_comments ON comments;
CREATE TRIGGER auto_moderate_comments
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION auto_moderate_content();

-- Function to update user reputation after moderation action
CREATE OR REPLACE FUNCTION update_user_reputation_after_moderation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user reputation based on moderation action
    IF NEW.action = 'approve' AND NEW.item_type = 'vote' THEN
        UPDATE users
        SET reputation_score = reputation_score + 5
        WHERE id = (SELECT user_id FROM votes WHERE id = NEW.item_id);
    ELSIF NEW.action = 'reject' AND NEW.item_type = 'vote' THEN
        UPDATE users
        SET reputation_score = GREATEST(0, reputation_score - 2)
        WHERE id = (SELECT user_id FROM votes WHERE id = NEW.item_id);
    END IF;

    -- Recalculate trust score
    IF NEW.item_type = 'user' THEN
        PERFORM calculate_user_trust_score(NEW.item_id);
    ELSE
        PERFORM calculate_user_trust_score(
            CASE
                WHEN NEW.item_type = 'vote' THEN (SELECT user_id FROM votes WHERE id = NEW.item_id)
                WHEN NEW.item_type = 'comment' THEN (SELECT user_id FROM comments WHERE id = NEW.item_id)
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reputation updates
DROP TRIGGER IF EXISTS update_reputation_after_moderation ON moderation_actions;
CREATE TRIGGER update_reputation_after_moderation
    AFTER INSERT ON moderation_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_reputation_after_moderation();

-- Row Level Security policies for moderation tables
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust_scores ENABLE ROW LEVEL SECURITY;

-- Policies for moderation_actions
CREATE POLICY "Moderators and admins can view all moderation actions" ON moderation_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Moderators and admins can insert moderation actions" ON moderation_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Policies for user_reports
CREATE POLICY "Users can view their own reports" ON user_reports
    FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON user_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Moderators can view all reports" ON user_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Policies for content_quality_scores
CREATE POLICY "Anyone can view quality scores" ON content_quality_scores
    FOR SELECT USING (true);

CREATE POLICY "System can manage quality scores" ON content_quality_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'system')
        )
    );

-- Policies for moderation_rules
CREATE POLICY "Admins can manage moderation rules" ON moderation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policies for moderation_queue
CREATE POLICY "Moderators can view moderation queue" ON moderation_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Moderators can update moderation queue" ON moderation_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Policies for user_trust_scores
CREATE POLICY "Users can view their own trust scores" ON user_trust_scores
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Moderators can view all trust scores" ON user_trust_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "System can manage trust scores" ON user_trust_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'system')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_item ON moderation_actions(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_quality_content ON content_quality_scores(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_overall ON user_trust_scores(overall_score DESC);

-- Insert some default moderation rules
INSERT INTO moderation_rules (name, description, rule_type, conditions, actions, severity_level, created_by) VALUES
('Spam Keywords', 'Detect common spam keywords', 'keyword',
 '{"keywords": ["spam", "casino", "bitcoin", "crypto", "make money fast"]}',
 '{"flag": true, "priority": 3}', 3,
 (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO moderation_rules (name, description, rule_type, conditions, actions, severity_level, created_by) VALUES
('Harassment Detection', 'Detect harassment and offensive language', 'keyword',
 '{"keywords": ["idiot", "crétin", "imbécile", "connard", "salaud"]}',
 '{"flag": true, "priority": 4}', 4,
 (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Function to clean up old moderation data
CREATE OR REPLACE FUNCTION cleanup_old_moderation_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete moderation actions older than 1 year
    DELETE FROM moderation_actions
    WHERE created_at < NOW() - INTERVAL '1 year';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete resolved reports older than 6 months
    DELETE FROM user_reports
    WHERE status = 'resolved' AND created_at < NOW() - INTERVAL '6 months';

    -- Delete completed queue items older than 3 months
    DELETE FROM moderation_queue
    WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '3 months';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;