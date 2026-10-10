ALTER TABLE public.agency_settings
    ADD COLUMN IF NOT EXISTS login_background_color VARCHAR(20) DEFAULT '#0A111D',
    ADD COLUMN IF NOT EXISTS login_card_color VARCHAR(20) DEFAULT '#162133',
    ADD COLUMN IF NOT EXISTS login_surface_color VARCHAR(20) DEFAULT '#0A111D',
    ADD COLUMN IF NOT EXISTS login_text_color VARCHAR(20) DEFAULT '#F0EDE8',
    ADD COLUMN IF NOT EXISTS login_muted_color VARCHAR(20) DEFAULT '#A8B4C4';

INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', TRUE)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT agency_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_agency_id() TO authenticated;

DROP POLICY IF EXISTS "agency_logos_public_read" ON storage.objects;
CREATE POLICY "agency_logos_public_read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "agency_logos_upload_own_agency" ON storage.objects;
CREATE POLICY "agency_logos_upload_own_agency" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'agency-logos'
        AND (storage.foldername(name))[1] = public.get_user_agency_id()::text
    );

DROP POLICY IF EXISTS "agency_logos_update_own_agency" ON storage.objects;
CREATE POLICY "agency_logos_update_own_agency" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'agency-logos'
        AND (storage.foldername(name))[1] = public.get_user_agency_id()::text
    )
    WITH CHECK (
        bucket_id = 'agency-logos'
        AND (storage.foldername(name))[1] = public.get_user_agency_id()::text
    );

DROP POLICY IF EXISTS "agency_logos_delete_own_agency" ON storage.objects;
CREATE POLICY "agency_logos_delete_own_agency" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'agency-logos'
        AND (storage.foldername(name))[1] = public.get_user_agency_id()::text
    );

CREATE OR REPLACE FUNCTION public.sync_agency_login_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'agency_settings' THEN
        UPDATE public.agencies
        SET name = NEW.nom_agence
        WHERE id = NEW.agency_id
          AND name IS DISTINCT FROM NEW.nom_agence;
    ELSIF TG_TABLE_NAME = 'agencies' THEN
        UPDATE public.agency_settings
        SET nom_agence = NEW.name
        WHERE agency_id = NEW.id
          AND nom_agence IS DISTINCT FROM NEW.name;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_agency_login_name_from_settings_insert ON public.agency_settings;
CREATE TRIGGER sync_agency_login_name_from_settings_insert
    AFTER INSERT ON public.agency_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_agency_login_name();

DROP TRIGGER IF EXISTS sync_agency_login_name_from_settings_update ON public.agency_settings;
CREATE TRIGGER sync_agency_login_name_from_settings_update
    AFTER UPDATE OF nom_agence ON public.agency_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_agency_login_name();

DROP TRIGGER IF EXISTS sync_agency_login_name_from_agency ON public.agencies;
CREATE TRIGGER sync_agency_login_name_from_agency
    AFTER UPDATE OF name ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_agency_login_name();

UPDATE public.agencies AS a
SET name = s.nom_agence
FROM public.agency_settings AS s
WHERE s.agency_id = a.id
  AND NULLIF(trim(s.nom_agence), '') IS NOT NULL
  AND upper(trim(s.nom_agence)) <> 'FITAL-IMMO'
  AND a.name IS DISTINCT FROM s.nom_agence;

UPDATE public.agency_settings AS s
SET nom_agence = a.name
FROM public.agencies AS a
WHERE s.agency_id = a.id
  AND (NULLIF(trim(s.nom_agence), '') IS NULL OR upper(trim(s.nom_agence)) = 'FITAL-IMMO')
  AND NULLIF(trim(a.name), '') IS NOT NULL
  AND s.nom_agence IS DISTINCT FROM a.name;

DROP FUNCTION IF EXISTS public.get_public_agency_login(text);

CREATE FUNCTION public.get_public_agency_login(p_slug text)
RETURNS TABLE (
    agency_id uuid,
    agency_name text,
    slogan text,
    logo_url text,
    primary_color text,
    login_background_color text,
    login_card_color text,
    login_surface_color text,
    login_text_color text,
    login_muted_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT
        a.id,
        COALESCE(NULLIF(s.nom_agence, ''), a.name)::text,
        COALESCE(NULLIF(s.slogan, ''), 'Gestion Immobilière, Syndic & Recouvrement')::text,
        COALESCE(NULLIF(s.logo_url, ''), a.logo_url)::text,
        COALESCE(NULLIF(s.primary_color, ''), a.primary_color, '#C9A96E')::text,
        COALESCE(s.login_background_color, '#0A111D')::text,
        COALESCE(s.login_card_color, '#162133')::text,
        COALESCE(s.login_surface_color, '#0A111D')::text,
        COALESCE(s.login_text_color, '#F0EDE8')::text,
        COALESCE(s.login_muted_color, '#A8B4C4')::text
    FROM public.agencies AS a
    LEFT JOIN public.agency_settings AS s ON s.agency_id = a.id
    WHERE a.slug = lower(trim(p_slug))
      AND a.status IN ('active', 'trial')
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_agency_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agency_login(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
