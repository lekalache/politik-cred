-- 🔥 POLITIKCRED - Mise à jour du schéma pour la Direction Artistique
-- "Il est crédible lauiss ?" - On stylise la base de données !
-- Script SQL pour Supabase

-- Ajout des colonnes pour la Direction Artistique POLITIKCRED
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS card_color VARCHAR(7) DEFAULT '#1E3A8A',
ADD COLUMN IF NOT EXISTS cartoon_expression VARCHAR(20) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS credibility_badge VARCHAR(5) DEFAULT '⚖️',
ADD COLUMN IF NOT EXISTS credibility_label VARCHAR(50) DEFAULT 'Moyen lauiss...',
ADD COLUMN IF NOT EXISTS highlight BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crown VARCHAR(5) DEFAULT '👤';

-- Index pour optimiser les requêtes sur les nouveaux champs
CREATE INDEX IF NOT EXISTS idx_politicians_cartoon_expression ON politicians(cartoon_expression);
CREATE INDEX IF NOT EXISTS idx_politicians_highlight ON politicians(highlight);
CREATE INDEX IF NOT EXISTS idx_politicians_credibility_score ON politicians(credibility_score);

-- Commentaires POLITIKCRED pour documenter les nouveaux champs
COMMENT ON COLUMN politicians.avatar_url IS 'URL vers l''image cartoon du politicien (style Family Guy POLITIKCRED)';
COMMENT ON COLUMN politicians.card_color IS 'Couleur de la carte basée sur l''orientation politique (Direction Artistique)';
COMMENT ON COLUMN politicians.cartoon_expression IS 'Expression cartoon: confident, neutral, skeptical';
COMMENT ON COLUMN politicians.credibility_badge IS 'Badge emoji basé sur le score de crédibilité';
COMMENT ON COLUMN politicians.credibility_label IS 'Label street: "Il assure lauiss !", "Moyen lauiss...", "Louche lauiss !"';
COMMENT ON COLUMN politicians.highlight IS 'Mise en valeur pour les rôles importants';
COMMENT ON COLUMN politicians.crown IS 'Emoji de fonction/statut selon le rôle';

-- Fonction pour mettre à jour automatiquement les éléments visuels
CREATE OR REPLACE FUNCTION update_visual_elements()
RETURNS TRIGGER AS $$
BEGIN
    -- Mise à jour automatique de card_color basée sur political_orientation
    NEW.card_color := CASE NEW.political_orientation
        WHEN 'left' THEN '#DC2626'
        WHEN 'center-left' THEN '#059669'
        WHEN 'center' THEN '#1E3A8A'
        WHEN 'center-right' THEN '#D97706'
        WHEN 'right' THEN '#7C2D12'
        ELSE '#1E3A8A'
    END;

    -- Mise à jour automatique de cartoon_expression, credibility_badge et credibility_label (POLITIKCRED style)
    IF NEW.credibility_score >= 80 THEN
        NEW.cartoon_expression := 'confident';
        NEW.credibility_badge := '🏆';
        NEW.credibility_label := 'Il assure lauiss !';
    ELSIF NEW.credibility_score >= 60 THEN
        NEW.cartoon_expression := 'neutral';
        NEW.credibility_badge := '⚖️';
        NEW.credibility_label := 'Moyen lauiss...';
    ELSE
        NEW.cartoon_expression := 'skeptical';
        NEW.credibility_badge := '⚠️';
        NEW.credibility_label := 'Louche lauiss !';
    END IF;

    -- Mise à jour automatique de highlight et crown basée sur position
    IF NEW.position ILIKE '%Premier ministre%' THEN
        NEW.highlight := TRUE;
        NEW.crown := '👑';
    ELSIF NEW.position ILIKE '%Ministre d''État%' THEN
        NEW.highlight := TRUE;
        NEW.crown := '⭐';
    ELSIF NEW.position ILIKE '%Député%' THEN
        NEW.highlight := FALSE;
        NEW.crown := '🗳️';
    ELSIF NEW.position ILIKE '%Sénateur%' THEN
        NEW.highlight := FALSE;
        NEW.crown := '🏛️';
    ELSIF NEW.position ILIKE '%Maire%' THEN
        NEW.highlight := FALSE;
        NEW.crown := '🏙️';
    ELSE
        NEW.highlight := FALSE;
        NEW.crown := '👤';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour appliquer automatiquement les éléments visuels
DROP TRIGGER IF EXISTS trigger_update_visual_elements ON politicians;
CREATE TRIGGER trigger_update_visual_elements
    BEFORE INSERT OR UPDATE ON politicians
    FOR EACH ROW
    EXECUTE FUNCTION update_visual_elements();

-- Vue POLITIKCRED pour afficher les politiciens avec leurs éléments visuels complets
-- "Il est crédible lauiss ?" - Toutes les infos stylées dans une vue !
CREATE OR REPLACE VIEW politicians_with_da AS
SELECT
    id,
    name,
    first_name,
    last_name,
    party,
    position,
    political_orientation,
    credibility_score,
    avatar_url,
    card_color,
    cartoon_expression,
    credibility_badge,
    credibility_label,
    highlight,
    crown,
    is_active,
    verification_status,
    created_at,
    updated_at,
    -- Champs calculés pour l'interface POLITIKCRED
    CASE
        WHEN credibility_score >= 80 THEN 'Très fiable'
        WHEN credibility_score >= 60 THEN 'Fiable'
        ELSE 'Attention'
    END as credibility_level,

    CASE political_orientation
        WHEN 'left' THEN 'Gauche'
        WHEN 'center-left' THEN 'Centre-gauche'
        WHEN 'center' THEN 'Centre'
        WHEN 'center-right' THEN 'Centre-droit'
        WHEN 'right' THEN 'Droite'
        ELSE 'Non classé'
    END as orientation_label

FROM politicians
WHERE is_active = true
ORDER BY
    CASE
        WHEN highlight = true THEN 1
        ELSE 2
    END,
    credibility_score DESC,
    name;

-- Politique de sécurité (RLS) pour la vue
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;

-- Politique permettant la lecture publique (ajustez selon vos besoins)
CREATE POLICY "Politicians are viewable by everyone" ON politicians
FOR SELECT USING (true);

-- Politique d'insertion limitée aux utilisateurs autorisés
CREATE POLICY "Politicians can be inserted by authorized users" ON politicians
FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Index pour optimiser les performances de la vue
CREATE INDEX IF NOT EXISTS idx_politicians_da_performance
ON politicians(is_active, highlight, credibility_score DESC, name);