// ============================================================
// HOOK — Gestion des paramètres d'agence (chargé une fois, cache)
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { AgencySettings } from '../types';
import { uploadAgencyAsset, AgencyAssetType } from '../lib/supabase/storage';

const CACHE_KEY = 'fital_immo_agency_settings';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: AgencySettings;
  timestamp: number;
}

export function useAgencySettings(agencyId?: string) {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres
  const load = useCallback(async (force = false) => {
    if (!agencyId || !supabase) return;

    // Vérifier le cache
    if (!force) {
      try {
        const cached = sessionStorage.getItem(`${CACHE_KEY}_${agencyId}`);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
            setSettings(entry.data);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        // Mapper les champs DB (snake_case) → TS (camelCase)
        const mapped: AgencySettings = {
          nomAgence: data.name || '',
          slogan: data.slogan || '',
          telephone: data.phone || '',
          email: data.email || '',
          adresse: data.address || '',
          ville: data.city || '',
          pays: data.country || 'Sénégal',
          ninea: data.ninea || '',
          devise: 'FCFA',
          tauxGeranceDefaut: data.taux_gerance_defaut || 10,
          penaliteDefaut: data.penalite_defaut || 10,
          tvaTaux: data.tva_taux || 18,
          prefixFacture: data.prefix_facture || 'FAC-',
          prefixQuittance: data.prefix_quittance || 'QUI-',
          prefixPaiement: data.prefix_paiement || 'PAY-',
          prefixContrat: data.prefix_contrat || 'BAIL-',
          prefixBonCaisse: data.prefix_bon_caisse || 'BCA-',
          waveNumero: data.wave_numero,
          orangeMoneyCode: data.orange_money_code,
          whatsappBusiness: data.whatsapp_business,
          standardTelephone: data.standard_telephone,

          // Nouveaux champs
          gerantNom: data.gerant_nom,
          gerantTitre: data.gerant_titre || 'Gérant',
          gerantSignatureUrl: data.gerant_signature_url,
          slogan1: data.slogan_1,
          slogan2: data.slogan_2,
          logoUrl: data.logo_url,
          cachetUrl: data.cachet_url,
          enteteUrl: data.entete_url,
          piedPageUrl: data.pied_page_url,
          rcNumero: data.rc_numero,
          nineaNumero: data.ninea_numero,
          boitePostale: data.boite_postale,
          siteWeb: data.site_web,
        };

        setSettings(mapped);

        // Mettre en cache
        try {
          sessionStorage.setItem(
            `${CACHE_KEY}_${agencyId}`,
            JSON.stringify({ data: mapped, timestamp: Date.now() })
          );
        } catch {}
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  // Charger au montage
  useEffect(() => {
    load();
  }, [load]);

  // Mise à jour des paramètres
  const updateSettings = useCallback(
    async (patch: Partial<AgencySettings>): Promise<{ success: boolean; error?: string }> => {
      if (!agencyId || !supabase) return { success: false, error: 'Non configuré' };

      try {
        // Mapper TS → DB (camelCase → snake_case)
        const dbPatch: Record<string, any> = {};
        if (patch.nomAgence !== undefined) dbPatch.name = patch.nomAgence;
        if (patch.slogan !== undefined) dbPatch.slogan = patch.slogan;
        if (patch.telephone !== undefined) dbPatch.phone = patch.telephone;
        if (patch.email !== undefined) dbPatch.email = patch.email;
        if (patch.adresse !== undefined) dbPatch.address = patch.adresse;
        if (patch.ville !== undefined) dbPatch.city = patch.ville;
        if (patch.pays !== undefined) dbPatch.country = patch.pays;
        if (patch.ninea !== undefined) dbPatch.ninea = patch.ninea;
        if (patch.gerantNom !== undefined) dbPatch.gerant_nom = patch.gerantNom;
        if (patch.gerantTitre !== undefined) dbPatch.gerant_titre = patch.gerantTitre;
        if (patch.gerantSignatureUrl !== undefined) dbPatch.gerant_signature_url = patch.gerantSignatureUrl;
        if (patch.slogan1 !== undefined) dbPatch.slogan_1 = patch.slogan1;
        if (patch.slogan2 !== undefined) dbPatch.slogan_2 = patch.slogan2;
        if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
        if (patch.cachetUrl !== undefined) dbPatch.cachet_url = patch.cachetUrl;
        if (patch.enteteUrl !== undefined) dbPatch.entete_url = patch.enteteUrl;
        if (patch.piedPageUrl !== undefined) dbPatch.pied_page_url = patch.piedPageUrl;
        if (patch.rcNumero !== undefined) dbPatch.rc_numero = patch.rcNumero;
        if (patch.nineaNumero !== undefined) dbPatch.ninea_numero = patch.nineaNumero;
        if (patch.boitePostale !== undefined) dbPatch.boite_postale = patch.boitePostale;
        if (patch.siteWeb !== undefined) dbPatch.site_web = patch.siteWeb;

        const { error: updateError } = await supabase
          .from('agencies')
          .update(dbPatch)
          .eq('id', agencyId);

        if (updateError) return { success: false, error: updateError.message };

        // Recharger
        await load(true);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [agencyId, load]
  );

  // Upload d'un asset
  const uploadAsset = useCallback(
    async (type: AgencyAssetType, file: File) => {
      if (!agencyId) return { url: null, error: 'Pas d\'agence' };

      const result = await uploadAgencyAsset(agencyId, type, file);
      if (result.url) {
        // Mettre à jour le state + cache
        await updateSettings({ [`${type}Url`]: result.url } as any);
      }
      return result;
    },
    [agencyId, updateSettings]
  );

  return {
    settings,
    loading,
    error,
    reload: () => load(true),
    updateSettings,
    uploadAsset,
  };
}