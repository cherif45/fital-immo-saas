
-- ================================================================
-- FITAL-IMMO
-- Correction attribution des donnÃ©es du bulletin propriÃ©taire
-- Date : 07/11/2026
--
-- IMPORTANT :
--   - Ne modifie aucune donnÃ©e mÃ©tier.
--   - Ne modifie aucune politique RLS.
--   - Conserve les contrÃ´les d'accÃ¨s de la RPC actuelle.
--   - Conserve les droits existants.
--   - Ã€ tester sur Supabase avant production.
-- ================================================================

BEGIN;

-- ------------------------------------------------
-- 1. PRÃ‰CONTRÃ”LE DU SCHÃ‰MA
-- ------------------------------------------------

DO $preflight$
DECLARE
  missing_columns TEXT;
BEGIN
  IF to_regprocedure(
    'public.get_owner_bulletin_data(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'RPC get_owner_bulletin_data introuvable';
  END IF;

  IF to_regprocedure(
    'public.current_user_is_saas_admin()'
  ) IS NULL
  OR to_regprocedure(
    'public.current_user_agency_id()'
  ) IS NULL THEN
    RAISE EXCEPTION 'Fonctions auxiliaires de sÃ©curitÃ© absentes';
  END IF;

  SELECT string_agg(
    required.table_name || '.' || required.column_name,
    ', '
  )
  INTO missing_columns
  FROM (
    VALUES
      ('profiles','id'),
      ('profiles','role'),
      ('profiles','statut'),
      ('profiles','proprietaire_id'),
      ('owners','id'),
      ('owners','agency_id'),
      ('owners','deleted_at'),

      ('payments','id'),
      ('payments','agency_id'),
      ('payments','ref'),
      ('payments','quittance_numero'),
      ('payments','locataire_id'),
      ('payments','bien_id'),
      ('payments','bien_nom'),
      ('payments','locataire_nom'),
      ('payments','proprietaire_id'),
      ('payments','contrat_id'),
      ('payments','periode'),
      ('payments','loyer_base'),
      ('payments','charges'),
      ('payments','tva'),
      ('payments','tom'),
      ('payments','penalites'),
      ('payments','indemnites_occupation'),
      ('payments','montant_total'),
      ('payments','montant_paye'),
      ('payments','montant_restant'),
      ('payments','statut'),
      ('payments','mode_paiement'),
      ('payments','moyen_paiement_code'),
      ('payments','date_paiement'),
      ('payments','date_echeance'),
      ('payments','type_recu'),
      ('payments','recu_par'),
      ('payments','created_at'),
      ('payments','deleted_at'),

      ('tenants','id'),
      ('tenants','agency_id'),
      ('tenants','nom'),
      ('tenants','prenom'),
      ('tenants','ref'),
      ('tenants','bien_id'),
      ('tenants','proprietaire_id'),
      ('tenants','statut'),
      ('tenants','date_entree'),
      ('tenants','date_sortie'),
      ('tenants','loyer_mensuel'),

      ('tenants','telephone'),
      ('tenants','cni'),
      ('tenants','deleted_at'),

      ('properties','id'),
      ('properties','agency_id'),
      ('properties','nom'),
      ('properties','ref'),
      ('properties','type'),
      ('properties','adresse'),
      ('properties','quartier'),
      ('properties','ville'),
      ('properties','proprietaire_id'),
      ('properties','loyer_base'),
      ('properties','charges'),
      ('properties','statut'),
      ('properties','etage'),
      ('properties','nombre_pieces'),
      ('properties','superficie'),
      ('properties','deleted_at'),

      ('buildings','id'),
      ('buildings','agency_id'),
      ('buildings','nom'),
      ('buildings','ref'),
      ('buildings','type'),
      ('buildings','adresse'),
      ('buildings','quartier'),
      ('buildings','ville'),
      ('buildings','proprietaire_id'),
      ('buildings','loyer_base'),
      ('buildings','charges'),
      ('buildings','statut'),
      ('buildings','nombre_pieces'),
      ('buildings','superficie'),
      ('buildings','numero_porte'),
      ('buildings','taux_commission'),
      ('buildings','deleted_at'),

      ('units','id'),
      ('units','agency_id'),
      ('units','nom'),
      ('units','type'),
      ('units','etage'),
      ('units','statut'),
      ('units','proprietaire_id'),
      ('units','building_id'),
      ('units','loyer_base'),
      ('units','charges'),
      ('units','nombre_pieces'),
      ('units','superficie'),
      ('units','locataire_actuel_id')
  ) AS required(table_name, column_name)

  LEFT JOIN information_schema.columns actual
    ON actual.table_schema = 'public'
   AND actual.table_name = required.table_name
   AND actual.column_name = required.column_name

  WHERE actual.column_name IS NULL;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration annulÃ©e. Colonnes absentes : %',
      missing_columns;
  END IF;
END;
$preflight$;

-- ------------------------------------------------
-- 2. REMPLACEMENT DE LA RPC
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_owner_bulletin_data(
  p_agency_id uuid,
  p_owner_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$

DECLARE
  result JSON;
  v_role TEXT;
  v_profile_owner_id UUID;

BEGIN

  -- ParamÃ¨tres obligatoires
  IF p_agency_id IS NULL OR p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Agence et propriÃ©taire obligatoires'
      USING ERRCODE = '42501';
  END IF;

  -- Authentification
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise'
      USING ERRCODE = '42501';
  END IF;

  -- Profil actif
  SELECT role, proprietaire_id
  INTO v_role, v_profile_owner_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND statut = 'actif';

  -- Autorisation identique Ã  la RPC actuelle
  IF v_role IS NULL OR NOT (
    public.current_user_is_saas_admin()
    OR (
      p_agency_id = public.current_user_agency_id()
      AND (
        v_role IN (
          'SUPER_ADMIN',
          'ADMIN',
          'GESTIONNAIRE',
          'CAISSIER'
        )
        OR (
          v_role = 'PROPRIETAIRE'
          AND v_profile_owner_id = p_owner_id
        )
      )
    )
  ) THEN
    RAISE EXCEPTION
      'AccÃ¨s interdit aux donnÃ©es du propriÃ©taire'
      USING ERRCODE = '42501';
  END IF;

  -- VÃ©rification du propriÃ©taire
  IF NOT EXISTS (
    SELECT 1
    FROM public.owners
    WHERE id = p_owner_id
      AND agency_id = p_agency_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'PropriÃ©taire introuvable dans cette agence'
      USING ERRCODE = '42501';
  END IF;

  -- ------------------------------------------------
  -- CONSTRUCTION DU BULLETIN
  -- ------------------------------------------------

  SELECT json_build_object(

    -- PAIEMENTS
    'payments', (
      SELECT COALESCE(
        json_agg(row_to_json(t)),
        '[]'::json
      )
      FROM (
        SELECT
          p.id,
          p.ref,
          p.quittance_numero,
          p.locataire_id,
          p.bien_id,
          p.proprietaire_id,
          p.contrat_id,
          p.periode,
          p.loyer_base,
          p.charges,
          p.tva,
          p.tom,
          p.penalites,
          p.indemnites_occupation,
          p.montant_total,
          p.montant_paye,
          p.montant_restant,
          p.statut,
          p.mode_paiement,
          p.moyen_paiement_code,
          p.date_paiement,
          p.date_echeance,
          p.type_recu,
          p.recu_par,
          p.created_at,

          tenant.nom AS locataire_nom_calc,
          tenant.prenom AS locataire_prenom_calc,
          tenant.loyer_mensuel,
          tenant.ref AS locataire_ref,
          tenant.bien_id AS tenant_bien_id,

          COALESCE(
            pr.nom,
            b_direct.nom,
            b_unit.nom,
            u.nom,
            p.bien_nom
          ) AS bien_nom_calc

        FROM public.payments p

        LEFT JOIN public.tenants tenant
          ON tenant.id = p.locataire_id
         AND tenant.agency_id = p.agency_id

        LEFT JOIN public.properties pr
          ON pr.id = p.bien_id
         AND pr.agency_id = p.agency_id
         AND pr.deleted_at IS NULL

        LEFT JOIN public.units u
          ON u.id = p.bien_id
         AND u.agency_id = p.agency_id

        LEFT JOIN public.buildings b_direct
          ON b_direct.id = p.bien_id
         AND b_direct.agency_id = p.agency_id
         AND b_direct.deleted_at IS NULL

        LEFT JOIN public.buildings b_unit
          ON b_unit.id = u.building_id
         AND b_unit.agency_id = p.agency_id
         AND b_unit.deleted_at IS NULL

        WHERE p.agency_id = p_agency_id
          AND p.deleted_at IS NULL
          AND (
            p.proprietaire_id = p_owner_id

            OR EXISTS (
              SELECT 1
              FROM public.properties pr2
              WHERE pr2.id = p.bien_id
                AND pr2.agency_id = p.agency_id
                AND pr2.proprietaire_id = p_owner_id
                AND pr2.deleted_at IS NULL
            )

            OR EXISTS (
              SELECT 1
              FROM public.buildings b2
              WHERE b2.id = p.bien_id
                AND b2.agency_id = p.agency_id
                AND b2.proprietaire_id = p_owner_id
                AND b2.deleted_at IS NULL
            )

            OR EXISTS (
              SELECT 1
              FROM public.units u2
              LEFT JOIN public.buildings b2
                ON b2.id = u2.building_id
               AND b2.agency_id = u2.agency_id
               AND b2.deleted_at IS NULL
              WHERE u2.id = p.bien_id
                AND u2.agency_id = p.agency_id
                AND (
                  u2.proprietaire_id = p_owner_id
                  OR b2.proprietaire_id = p_owner_id
                )
            )
            OR EXISTS (
              SELECT 1
              FROM public.tenants tenant_owner
              WHERE tenant_owner.id = p.locataire_id
                AND tenant_owner.agency_id = p.agency_id
                AND tenant_owner.deleted_at IS NULL
                AND (
                  tenant_owner.proprietaire_id = p_owner_id
                  OR EXISTS (
                    SELECT 1
                    FROM public.properties pr_owner
                    WHERE pr_owner.id = tenant_owner.bien_id
                      AND pr_owner.agency_id = p.agency_id
                      AND pr_owner.proprietaire_id = p_owner_id
                      AND pr_owner.deleted_at IS NULL
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM public.buildings b_owner
                    WHERE b_owner.id = tenant_owner.bien_id
                      AND b_owner.agency_id = p.agency_id
                      AND b_owner.proprietaire_id = p_owner_id
                      AND b_owner.deleted_at IS NULL
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM public.units u_owner
                    LEFT JOIN public.buildings b_owner
                      ON b_owner.id = u_owner.building_id
                     AND b_owner.agency_id = u_owner.agency_id
                     AND b_owner.deleted_at IS NULL
                    WHERE u_owner.id = tenant_owner.bien_id
                      AND u_owner.agency_id = p.agency_id
                      AND (
                        u_owner.proprietaire_id = p_owner_id
                        OR b_owner.proprietaire_id = p_owner_id
                      )
                  )
                )
            )
          )

        ORDER BY
          p.date_paiement DESC NULLS LAST,
          p.created_at DESC

        LIMIT 5000
      ) t
    ),

    -- PROPRIÃ‰TÃ‰S
    'properties', (
      SELECT COALESCE(
        json_agg(row_to_json(t)),
        '[]'::json
      )
      FROM (
        SELECT
          id, nom, ref, type, adresse, quartier, ville,
          proprietaire_id, loyer_base, charges, statut,
          etage, nombre_pieces, superficie,
          locataire_actuel_id
        FROM public.properties
        WHERE agency_id = p_agency_id
          AND proprietaire_id = p_owner_id
          AND deleted_at IS NULL
      ) t
    ),

    -- IMMEUBLES
    'buildings', (
      SELECT COALESCE(
        json_agg(row_to_json(t)),
        '[]'::json
      )
      FROM (
        SELECT
          id, nom, ref, type, adresse, quartier, ville,
          proprietaire_id, loyer_base, charges, statut,
          nombre_pieces, superficie, locataire_actuel_id,
          numero_porte, taux_commission
        FROM public.buildings
        WHERE agency_id = p_agency_id
          AND proprietaire_id = p_owner_id
          AND deleted_at IS NULL
      ) t
    ),

    -- UNITÃ‰S
    'units', (
      SELECT COALESCE(
        json_agg(row_to_json(t)),
        '[]'::json
      )
      FROM (
        SELECT
          u.id,
          u.nom,
          u.type,
          u.etage,
          u.statut,
          u.proprietaire_id,
          u.building_id,
          u.loyer_base,
          u.charges,
          u.nombre_pieces,
          u.superficie,
          u.locataire_actuel_id,
          b.nom AS batiment_nom,
          b.ref AS batiment_ref,
          b.adresse AS batiment_adresse

        FROM public.units u

        LEFT JOIN public.buildings b
          ON b.id = u.building_id
         AND b.agency_id = u.agency_id
         AND b.deleted_at IS NULL

        WHERE u.agency_id = p_agency_id
          AND (
            u.proprietaire_id = p_owner_id
            OR b.proprietaire_id = p_owner_id
          )
      ) t
    ),

    -- LOCATAIRES
    'tenants', (
      SELECT COALESCE(
        json_agg(row_to_json(t)),
        '[]'::json
      )
      FROM (
        SELECT
          tenant.id,
          tenant.nom,
          tenant.prenom,
          tenant.ref,
          tenant.bien_id,
          tenant.proprietaire_id,
          tenant.statut,
          tenant.date_entree,
          tenant.date_sortie,

          tenant.telephone,
          tenant.cni

        FROM public.tenants tenant

        WHERE tenant.agency_id = p_agency_id
          AND tenant.deleted_at IS NULL
          AND (
            tenant.proprietaire_id = p_owner_id

            -- Lien direct vers une propriÃ©tÃ©
            OR EXISTS (
              SELECT 1
              FROM public.properties pr
              WHERE pr.id = tenant.bien_id
                AND pr.agency_id = tenant.agency_id
                AND pr.proprietaire_id = p_owner_id
                AND pr.deleted_at IS NULL
            )

            -- Lien direct vers un immeuble
            OR EXISTS (
              SELECT 1
              FROM public.buildings b
              WHERE b.id = tenant.bien_id
                AND b.agency_id = tenant.agency_id
                AND b.proprietaire_id = p_owner_id
                AND b.deleted_at IS NULL
            )

            -- Lien vers une unitÃ© ou son immeuble
            OR EXISTS (
              SELECT 1
              FROM public.units u
              LEFT JOIN public.buildings b
                ON b.id = u.building_id
               AND b.agency_id = u.agency_id
               AND b.deleted_at IS NULL
              WHERE u.id = tenant.bien_id
                AND u.agency_id = tenant.agency_id
                AND (
                  u.proprietaire_id = p_owner_id
                  OR b.proprietaire_id = p_owner_id
                )
            )

            -- Lien courant via l'unité et son immeuble propriétaire
            OR EXISTS (
              SELECT 1
              FROM public.units current_unit
              JOIN public.buildings current_building
                ON current_building.id = current_unit.building_id
               AND current_building.agency_id = current_unit.agency_id
               AND current_building.deleted_at IS NULL
              WHERE current_unit.agency_id = tenant.agency_id
                AND current_unit.locataire_actuel_id = tenant.id
                AND current_building.proprietaire_id = p_owner_id
            )
          )
      ) t
    )

  )
  INTO result;

  RETURN result;

END;
$function$;

-- ------------------------------------------------
-- 3. PRÃ‰SERVER LES DROITS EXISTANTS
-- ------------------------------------------------

-- CREATE OR REPLACE conserve normalement les ACL existantes.
-- On vÃ©rifie qu'elles sont toujours prÃ©sentes avant COMMIT.

DO $permissions$
DECLARE
  acl TEXT[];
BEGIN
  SELECT proacl
  INTO acl
  FROM pg_catalog.pg_proc
  WHERE oid = 'public.get_owner_bulletin_data(uuid,uuid)'::regprocedure;

  IF NOT (
    has_function_privilege(
      'authenticated',
      'public.get_owner_bulletin_data(uuid,uuid)',
      'EXECUTE'
    )
  ) THEN
    RAISE EXCEPTION
      'Permission EXECUTE manquante pour authenticated';
  END IF;

  IF NOT (
    has_function_privilege(
      'service_role',
      'public.get_owner_bulletin_data(uuid,uuid)',
      'EXECUTE'
    )
  ) THEN
    RAISE EXCEPTION
      'Permission EXECUTE manquante pour service_role';
  END IF;

  IF acl IS NULL THEN
    RAISE EXCEPTION
      'ACL absente : arrÃªt de la migration pour vÃ©rification';
  END IF;
END;
$permissions$;

COMMIT;
