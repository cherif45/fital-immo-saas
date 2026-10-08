-- =====================================================
-- Migration : 20261008_fix_daily_activity_rpc.sql
-- Objectif  : Retirer le hack qui excluait les vrais
--             paiements du jour dans get_daily_activity
-- Impact    : KPI "Encaissé" du calendrier remonte
--             enfin les paiements réels
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_daily_activity(
    p_agency_id uuid,
    p_year integer,
    p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  date_start DATE;
  date_end DATE;
BEGIN
  date_start := make_date(p_year, p_month, 1);
  date_end := (date_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT json_agg(row_to_json(t)) FROM (
    SELECT 
      d.jour::TEXT as jour,
      COALESCE(enc.encaissements, 0) as encaissements,
      COALESCE(enc.nb_paiements, 0) as nb_paiements,
      COALESCE(dec.decaissements, 0) as decaissements,
      COALESCE(dec.nb_decaissements, 0) as nb_decaissements,
      COALESCE(enc.encaissements, 0) - COALESCE(dec.decaissements, 0) as solde,
      COALESCE(alertes.nb_alertes, 0) as nb_alertes
    FROM generate_series(date_start, date_end, INTERVAL '1 day') as d(jour)
    LEFT JOIN (
      SELECT 
        date_paiement as jour,
        SUM(montant_paye) as encaissements,
        COUNT(*) as nb_paiements
      FROM payments
      WHERE agency_id = p_agency_id
        AND date_paiement BETWEEN date_start AND date_end
        AND deleted_at IS NULL
        AND statut = 'Payé'
      GROUP BY date_paiement
    ) enc ON enc.jour = d.jour::DATE
    LEFT JOIN (
      SELECT 
        date_operation::DATE as jour,
        SUM(CASE WHEN type IN ('SORTIE', 'DECAISSEMENT') THEN montant ELSE 0 END) as decaissements,
        COUNT(CASE WHEN type IN ('SORTIE', 'DECAISSEMENT') THEN 1 END) as nb_decaissements
      FROM cash_movements
      WHERE agency_id = p_agency_id
        AND date_operation::DATE BETWEEN date_start AND date_end
      GROUP BY date_operation::DATE
    ) dec ON dec.jour = d.jour::DATE
    LEFT JOIN (
      SELECT 
        date_echeance as jour,
        COUNT(*) as nb_alertes
      FROM payments
      WHERE agency_id = p_agency_id
        AND date_echeance BETWEEN date_start AND date_end
        AND statut IN ('Impayé', 'Partiel', 'En attente')
        AND deleted_at IS NULL
      GROUP BY date_echeance
    ) alertes ON alertes.jour = d.jour::DATE
    ORDER BY d.jour
  ) t INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;