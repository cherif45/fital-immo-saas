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

NOTIFY pgrst, 'reload schema';
