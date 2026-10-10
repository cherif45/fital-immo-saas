CREATE OR REPLACE FUNCTION public.get_public_agency_login(p_slug text)
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
