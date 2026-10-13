-- ============================================================
-- Migration : 2026-10-14
-- Correction : get_owner_bulletin_data retourne les locataires
-- via units.proprietaire_id, buildings.proprietaire_id
-- (car certains units ont un proprietaire_id fantome)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_owner_bulletin_data(p_agency_id uuid, p_owner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'payments', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          p.id, p.ref, p.quittance_numero, p.locataire_id, p.bien_id,
          p.proprietaire_id, p.contrat_id, p.periode,
          p.loyer_base, p.charges, p.tva, p.tom, p.penalites,
          p.indemnites_occupation, p.montant_total, p.montant_paye, p.montant_restant,
          p.statut, p.mode_paiement, p.moyen_paiement_code,
          p.date_paiement, p.date_echeance, p.type_recu, p.recu_par, p.created_at,
          t.nom as locataire_nom_calc,
          t.prenom as locataire_prenom_calc,
          t.ref as locataire_ref,
          t.bien_id as tenant_bien_id,
          COALESCE(pr.nom, b.nom, u.nom) as bien_nom_calc
        FROM payments p
        LEFT JOIN tenants t ON t.id = p.locataire_id
        LEFT JOIN properties pr ON pr.id = p.bien_id
        LEFT JOIN units u ON u.id = p.bien_id
        LEFT JOIN buildings b ON b.id = u.building_id
        WHERE p.agency_id = p_agency_id
          AND p.proprietaire_id = p_owner_id
          AND p.deleted_at IS NULL
        ORDER BY p.date_paiement DESC NULLS LAST, p.created_at DESC
        LIMIT 5000
      ) t
    ),
    'properties', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          id, nom, ref, type, adresse, quartier, ville,
          proprietaire_id, loyer_base, charges, statut, etage,
          nombre_pieces, superficie, locataire_actuel_id
        FROM properties 
        WHERE agency_id = p_agency_id 
          AND proprietaire_id = p_owner_id
          AND deleted_at IS NULL
      ) t
    ),
    'buildings', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          id, nom, ref, type, adresse, quartier, ville,
          proprietaire_id, loyer_base, charges, statut,
          nombre_pieces, superficie, locataire_actuel_id, numero_porte
        FROM buildings 
        WHERE agency_id = p_agency_id 
          AND proprietaire_id = p_owner_id
          AND deleted_at IS NULL
      ) t
    ),
    'units', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          u.id, u.nom, u.type, u.etage, u.statut,
          u.proprietaire_id, u.building_id, u.loyer_base, u.charges,
          u.nombre_pieces, u.superficie, u.locataire_actuel_id,
          b.nom as batiment_nom, b.ref as batiment_ref, b.adresse as batiment_adresse
        FROM units u
        LEFT JOIN buildings b ON b.id = u.building_id
        WHERE u.agency_id = p_agency_id 
          AND (
            u.proprietaire_id = p_owner_id
            OR b.proprietaire_id = p_owner_id
          )
      ) t
    ),
    'tenants', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          t.id, t.nom, t.prenom, t.ref, t.bien_id,
          t.proprietaire_id, t.statut, t.date_entree, t.date_sortie,
          t.loyer_mensuel, t.telephone, t.cni
        FROM tenants t
        LEFT JOIN units u ON u.id = t.bien_id
        LEFT JOIN buildings b ON b.id = u.building_id
        WHERE t.agency_id = p_agency_id 
          AND t.deleted_at IS NULL
          AND (
            t.proprietaire_id = p_owner_id
            OR u.proprietaire_id = p_owner_id
            OR b.proprietaire_id = p_owner_id
          )
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;