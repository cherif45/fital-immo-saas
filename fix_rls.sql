
-- ============================================================
-- POLICIES RLS POUR LA TABLE AGENCIES
-- ============================================================
-- Objectif : permettre aux utilisateurs de modifier leur propre agence
-- Sans casser l'existant
-- ============================================================

-- 1. S'assurer que le RLS est active (sans risque si deja fait)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- 2. LECTURE : tout le monde authentifie peut lire son agence
DROP POLICY IF EXISTS "agencies_read_own" ON agencies;
CREATE POLICY "agencies_read_own" ON agencies
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT agency_id FROM profiles 
        WHERE id = auth.uid() 
        AND statut = 'actif'
    )
);

-- 3. MISE A JOUR : un ADMIN peut modifier SON agence
DROP POLICY IF EXISTS "agencies_update_own" ON agencies;
CREATE POLICY "agencies_update_own" ON agencies
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT agency_id FROM profiles 
        WHERE id = auth.uid() 
        AND statut = 'actif'
        AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN_SAAS')
    )
)
WITH CHECK (
    id IN (
        SELECT agency_id FROM profiles 
        WHERE id = auth.uid() 
        AND statut = 'actif'
        AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN_SAAS')
    )
);

-- 4. SUPER ADMIN SAAS : peut tout faire sur toutes les agences
DROP POLICY IF EXISTS "agencies_super_admin_all" ON agencies;
CREATE POLICY "agencies_super_admin_all" ON agencies
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'SUPER_ADMIN_SAAS'
        AND statut = 'actif'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'SUPER_ADMIN_SAAS'
        AND statut = 'actif'
    )
);

-- ============================================================
-- FIN
-- ============================================================
