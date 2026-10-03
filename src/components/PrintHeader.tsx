// ============================================================
// COMPOSANT — En-tête de document imprimé (dynamique par agence)
// À utiliser dans TOUS les documents imprimés (quittance, mandat, etc.)
// ============================================================
import React from 'react';
import { AgencySettings } from '../types';

interface PrintHeaderProps {
  agency: AgencySettings | null;
  documentType?: string;
  documentRef?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  agency,
  documentType,
  documentRef,
}) => {
  if (!agency) return null;

  return (
    <div className="print-header">
      {/* En-tête personnalisé (image optionnelle) */}
      {agency.enteteUrl && (
        <div className="mb-4">
          <img
            src={agency.enteteUrl}
            alt="En-tête"
            className="w-full max-h-32 object-contain"
          />
        </div>
      )}

      {/* En-tête standard (si pas d'image personnalisée) */}
      {!agency.enteteUrl && (
        <div className="flex items-start justify-between border-b-2 border-[#C9A96E] pb-4 mb-4">
          <div className="flex items-center gap-4">
            {agency.logoUrl && (
              <img
                src={agency.logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-[#0F1B2D]">
                {agency.nomAgence}
              </h1>
              {agency.slogan1 && (
                <p className="text-sm text-[#C9A96E] font-semibold">
                  {agency.slogan1}
                </p>
              )}
              {agency.slogan2 && (
                <p className="text-xs text-[#0F1B2D]/70">{agency.slogan2}</p>
              )}
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            {agency.adresse && <div>📍 {agency.adresse}</div>}
            {agency.telephone && <div>📞 {agency.telephone}</div>}
            {agency.email && <div>✉️ {agency.email}</div>}
            {agency.rcNumero && <div>RC : {agency.rcNumero}</div>}
            {agency.nineaNumero && <div>NINEA : {agency.nineaNumero}</div>}
            {agency.boitePostale && <div>B.P. : {agency.boitePostale}</div>}
            {agency.siteWeb && <div>🌐 {agency.siteWeb}</div>}
          </div>
        </div>
      )}

      {/* Titre du document */}
      {(documentType || documentRef) && (
        <div className="text-center my-4">
          {documentType && (
            <h2 className="text-xl font-bold text-[#0F1B2D] uppercase tracking-wider">
              {documentType}
            </h2>
          )}
          {documentRef && (
            <p className="text-sm text-[#C9A96E] font-mono font-bold">
              N° {documentRef}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PIED DE PAGE — Signature + cachet + pied personnalisé
// ============================================================
interface PrintFooterProps {
  agency: AgencySettings | null;
  showSignature?: boolean;
  showStamp?: boolean;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  agency,
  showSignature = true,
  showStamp = true,
}) => {
  if (!agency) return null;

  return (
    <div className="print-footer mt-8">
      {/* Signature et cachet */}
      {(showSignature || showStamp) && (
        <div className="flex justify-between items-end mt-12 mb-4">
          <div className="text-center">
            <p className="text-xs text-[#0F1B2D] mb-2">Le Client</p>
            <div className="border-b border-[#0F1B2D] w-40 h-16"></div>
          </div>

          <div className="text-center">
            <p className="text-xs text-[#0F1B2D] mb-2">
              {agency.gerantTitre || 'Le Gérant'}
            </p>
            <div className="relative w-40 h-16">
              {showStamp && agency.cachetUrl && (
                <img
                  src={agency.cachetUrl}
                  alt="Cachet"
                  className="absolute inset-0 m-auto w-24 h-24 object-contain opacity-90"
                />
              )}
              {showSignature && agency.gerantSignatureUrl && (
                <img
                  src={agency.gerantSignatureUrl}
                  alt="Signature"
                  className="absolute inset-0 m-auto w-32 h-12 object-contain"
                />
              )}
            </div>
            <p className="text-xs font-bold text-[#0F1B2D] mt-1">
              {agency.gerantNom || '____________________'}
            </p>
          </div>
        </div>
      )}

      {/* Pied de page personnalisé */}
      {agency.piedPageUrl ? (
        <div className="border-t border-[#C9A96E]/30 pt-2">
          <img
            src={agency.piedPageUrl}
            alt="Pied de page"
            className="w-full max-h-16 object-contain"
          />
        </div>
      ) : (
        <div className="border-t-2 border-[#C9A96E] pt-3 text-center text-[10px] text-[#0F1B2D]/70">
          <p className="font-bold">{agency.nomAgence}</p>
          <p>
            {agency.adresse} {agency.telephone && `— Tél : ${agency.telephone}`}{' '}
            {agency.rcNumero && `— RC : ${agency.rcNumero}`}{' '}
            {agency.nineaNumero && `— NINEA : ${agency.nineaNumero}`}
          </p>
        </div>
      )}
    </div>
  );
};