// ============================================================
// COMPOSANT — En-tête de document imprimé (dynamique par agence)
// À utiliser dans TOUS les documents imprimés (quittance, mandat, etc.)
// ============================================================
import React from "react";
import { AgencySettings } from "../types";

interface PrintHeaderProps {
  agency: AgencySettings | null;
  documentType?: string;
  documentRef?: string;
  compact?: boolean;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  agency,
  documentType,
  documentRef,
  compact = false,
}) => {
  if (!agency) return null;

  return (
    <div className={`print-header ${compact ? "print-header-compact" : ""}`}>
      {/* En-tête personnalisé (image optionnelle) */}
      {agency.enteteUrl && (
        <div className={compact ? "mb-1.5" : "mb-4"}>
          <img
            src={agency.enteteUrl}
            alt="En-tête"
            className={`w-full object-contain ${compact ? "max-h-12" : "max-h-32"}`}
          />
        </div>
      )}

      {/* En-tête standard centré */}
      {!agency.enteteUrl && (
        <>
          <div
            className={`text-center border-b-2 border-neutral-900 ${
              compact ? "pb-2 mb-2" : "pb-4 mb-4"
            }`}
          >
            {/* Ligne 1 : Logo + Nom agence */}
            <div className="flex items-center justify-center gap-4">
              {agency.logoUrl && (
                <img
                  src={agency.logoUrl}
                  alt="Logo"
                  className={`object-contain ${compact ? "w-12 h-12" : "w-20 h-20"}`}
                />
              )}
              <div>
                <h1
                  className={`font-black uppercase text-[#0F1B2D] tracking-wide ${
                    compact ? "text-base" : "text-2xl"
                  }`}
                >
                  {agency.nomAgence || "MON AGENCE"}
                </h1>
                {agency.slogan1 && (
                  <p
                    className={`text-[#C9A96E] font-semibold uppercase tracking-wider ${
                      compact ? "text-[9px]" : "text-xs"
                    }`}
                  >
                    {agency.slogan1}
                  </p>
                )}
              </div>
            </div>

            {/* Ligne 2 : Coordonnées centrées */}
            <div
              className={`mt-2 text-neutral-700 ${
                compact ? "text-[8px] space-y-0.5" : "text-[11px] space-y-0.5"
              }`}
            >
              {agency.adresse && (
                <div>
                  📍 {agency.adresse}
                  {agency.ville ? ` – ${agency.ville}` : ""}
                  {agency.pays ? `, ${agency.pays}` : ""}
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
                {agency.telephone && <span>📞 {agency.telephone}</span>}
                {agency.email && <span>✉️ {agency.email}</span>}
              </div>
              {(agency.rcNumero ||
                agency.nineaNumero ||
                agency.boitePostale) && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
                  {agency.rcNumero && <span>RC : {agency.rcNumero}</span>}
                  {agency.nineaNumero && (
                    <span>NINEA : {agency.nineaNumero}</span>
                  )}
                  {agency.boitePostale && (
                    <span>B.P. : {agency.boitePostale}</span>
                  )}
                </div>
              )}
              {agency.siteWeb && <div>🌐 {agency.siteWeb}</div>}
            </div>
          </div>

          {/* Titre du document (optionnel) */}
          {(documentType || documentRef) && (
            <div className="text-center mb-4">
              {documentType && (
                <h2
                  className={`font-black uppercase tracking-widest text-neutral-900 ${
                    compact ? "text-sm" : "text-lg"
                  }`}
                >
                  {documentType}
                </h2>
              )}
              {documentRef && (
                <p className="text-xs text-neutral-600 mt-1 font-mono">
                  Réf. : {documentRef}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
