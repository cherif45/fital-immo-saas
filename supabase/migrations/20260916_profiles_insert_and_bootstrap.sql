-- Migration : politiques INSERT profiles + bootstrap premier administrateur
-- Exécuter dans Supabase SQL Editor si la table profiles reste vide après création de comptes

-- 1. Permettre à un utilisateur Auth de créer son propre profil (première connexion / bootstrap)
DROP POLICY IF EXISTS "profiles_insert_own_policy" ON public.profiles;
CREATE POLICY "profiles_insert_own_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- 2. Permettre aux administrateurs de créer des profils pour leur agence
DROP POLICY IF EXISTS "profiles_insert_admin_policy" ON public.profiles;
CREATE POLICY "profiles_insert_admin_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        agency_id = public.get_user_agency_id()
        AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    );

-- 3. Permettre aux admins de mettre à jour les profils de leur agence
DROP POLICY IF EXISTS "profiles_update_admin_policy" ON public.profiles;
CREATE POLICY "profiles_update_admin_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid()
        OR (
            agency_id = public.get_user_agency_id()
            AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN')
        )
    );
