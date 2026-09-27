import React from 'react';
import { Printer, X, FileSignature } from 'lucide-react';
import { LeaseContract, Property, Tenant, Owner, Building, Unit, AgencySettings } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface LeaseContractModalProps {
  contract: LeaseContract;
  property?: Property;
  building?: Building;
  unit?: Unit;
  tenant?: Tenant;
  owner?: Owner;
  settings?: AgencySettings;
  onClose: () => void;
}

// ============================================================
// Helper : Montant en lettres
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaines = ['', 'cent', 'deux cent', 'trois cent', 'quatre cent', 'cinq cent', 'six cent', 'sept cent', 'huit cent', 'neuf cent'];

  function convert(num: number): string {
    if (num === 0) return '';
    if (num < 10) return unites[num];
    if (num < 20) {
      const speciaux = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      return speciaux[num - 10];
    }
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 7 || d === 9) return dizaines[d - 1] + '-' + convert(10 + u);
      if (d === 8 && u === 0) return 'quatre-vingts';
      return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
    }
    const c = Math.floor(num / 100);
    const r = num % 100;
    let prefix = centaines[c];
    if (c > 1 && r === 0) prefix += 's';
    return prefix + (r > 0 ? ' ' + convert(r) : '');
  }

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = '';
  if (milliards > 0) result += convert(milliards) + ' milliard' + (milliards > 1 ? 's' : '') + ' ';
  if (millions > 0) result += convert(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
  if (milliers > 0) result += (milliers === 1 ? 'mille' : convert(milliers) + ' mille') + ' ';
  if (reste > 0) result += convert(reste);

  return result.trim();
}

export const LeaseContractModal: React.FC<LeaseContractModalProps> = ({
  contract,
  property,
  building,
  unit,
  tenant,
  owner,
  settings,
  onClose,
}) => {
  const nomAgence = settings?.nomAgence || 'FITAL-IMMO';
  const slogan = settings?.slogan || 'Gérance · Location · Vente · Achat';
  const ninea = settings?.ninea || '008920194 2V8';
  const adresse = settings?.adresse || 'Avenue Cheikh Anta Diop, Dakar';
  const telephone = settings?.standardTelephone || settings?.telephone || '+221 33 820 40 50';
  const email = settings?.email || 'contact@fital-immo.sn';

  // ============================================================
  // CALCULS
  // ============================================================
  const loyerBase = contract.loyerBase || 0;
  const charges = contract.charges || 0;
  const loyerTotal = loyerBase;
  const cautionMois = contract.cautionMois || 2;
  const cautionMontant = contract.cautionMontant || (loyerBase * cautionMois);
  const fraisAdhesion = contract.fraisAdhesion || 0;

  // Infos locataire
  const locataireNom = contract.locataireNom || (tenant ? `${tenant.prenom} ${tenant.nom}` : '—');
  const locataireCNI = tenant?.cni || '—';
  const locataireTel = tenant?.telephone || '—';
  const locataireProfession = tenant?.profession || '—';
  const locataireEmployeur = tenant?.employeur || '—';
  const locataireAdresse = tenant?.observations || 'Dakar, Sénégal';

  // Infos bailleur
  const proprietaireNom = contract.proprietaireNom || (owner ? `${owner.prenom} ${owner.nom}` : '—');
  const proprietaireAdresse = owner?.adresse || 'Dakar, Sénégal';
  const proprietaireTel = owner?.telephone || '—';
  const proprietairePieceLabel = owner?.typePiece === 'PASSEPORT' ? 'Passeport'
    : owner?.typePiece === 'CARTE_CONSULAIRE' ? 'Carte Consulaire'
    : owner?.typePiece === 'AUTRE' ? 'Pièce d\'identité'
    : 'CNI';
  const proprietaireCNI = owner?.cni || '';   // 🆕

  // Infos bien
  const bienNom = contract.bienNom || unit?.nom || property?.nom || '—';
  const bienAdresse = building?.adresse || property?.adresse || '—';
  const bienQuartier = building?.quartier || property?.quartier || '—';
  const bienType = unit?.type || property?.type || building?.type || 'Appartement';

  const dateDebut = contract.dateDebut ? formatDate(contract.dateDebut) : '—';
  const dateFin = contract.dateFin ? formatDate(contract.dateFin) : '—';
  const dateDuJour = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (masqué à l'impression) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Contrat de Bail d'Habitation</h2>
              <p className="text-xs text-[#A8B4C4]">
                Réf : {contract.ref} · Type : {contract.typeContrat}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu imprimable */}
        <div className="p-6 sm:p-10 bg-white text-neutral-900 print:p-6">
          {/* En-tête */}
          <div className="text-center border-b-2 border-neutral-900 pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wide text-neutral-900">
              {nomAgence}
            </h1>
            <div className="text-xs text-neutral-600 mt-1 font-semibold uppercase tracking-wider">
              {slogan}
            </div>
            <div className="text-[11px] text-neutral-600 mt-2">
              {adresse} · Tél : {telephone} · Email : {email}
            </div>
            <div className="text-[11px] text-neutral-600">
              NINEA : {ninea}
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-neutral-900 underline">
              CONTRAT DE BAIL D'HABITATION
            </h2>
            <div className="text-xs text-neutral-600 mt-1 font-mono">
              N° {contract.ref}
            </div>
          </div>

          {/* Préambule */}
          <div className="mb-6 text-sm text-neutral-800 leading-relaxed text-justify">
            <p className="mb-3">
              <strong>ENTRE LES SOUSSIGNÉS :</strong>
            </p>

                        <div className="mb-4 pl-4 border-l-4 border-neutral-400">
              <p className="mb-2">
                <strong>Le Bailleur :</strong> Monsieur/Madame <strong>{proprietaireNom}</strong>,
                {proprietaireCNI && (
                  <>
                    {' '}titulaire de la {proprietairePieceLabel} n° <strong>{proprietaireCNI}</strong>,
                  </>
                )}{' '}
                demeurant à {proprietaireAdresse}, téléphone : {proprietaireTel},
                ci-après désigné <strong>« le Bailleur »</strong>,
              </p>
              <p className="text-xs italic text-neutral-600">
                Agissant par l'intermédiaire de l'agence {nomAgence}, en qualité de mandataire de gérance.
              </p>
            </div>

            <p className="my-3 text-center font-bold">ET</p>

            <div className="mb-4 pl-4 border-l-4 border-neutral-400">
              <p className="mb-2">
                <strong>Le Locataire :</strong> Monsieur/Madame <strong>{locataireNom}</strong>,
                {locataireCNI && locataireCNI !== '—' && (
                  <>
                    {' '}titulaire de la{' '}
                    {tenant?.typePiece === 'PASSEPORT' ? 'Passeport'
                      : tenant?.typePiece === 'CARTE_CONSULAIRE' ? 'Carte Consulaire'
                      : tenant?.typePiece === 'AUTRE' ? "Pièce d'identité"
                      : 'CNI'}{' '}
                    n° <strong>{locataireCNI}</strong>,
                  </>
                )}
                exerçant la profession de <strong>{locataireProfession}</strong>
                {locataireEmployeur !== '—' && ` au sein de la société ${locataireEmployeur}`},
                demeurant à {locataireAdresse}, téléphone : {locataireTel},
                ci-après désigné <strong>« le Locataire »</strong>,
              </p>
            </div>

            <p className="mb-3">
              <strong>IL A ÉTÉ CONVENU CE QUI SUIT :</strong>
            </p>

            <p className="mb-4 text-sm">
              Le Bailleur donne en location au Locataire, qui accepte, le bien immobilier désigné ci-après,
              aux conditions suivantes :
            </p>
          </div>

          {/* Désignation du bien */}
          <div className="mb-6 p-4 border border-neutral-300 bg-neutral-50 rounded">
            <div className="text-[11px] uppercase font-bold text-neutral-500 mb-2">
              DÉSIGNATION DU BIEN LOUÉ
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-neutral-500">Désignation : </span>
                <strong className="text-neutral-900">{bienNom}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Type : </span>
                <strong className="text-neutral-900">{bienType}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Adresse : </span>
                <strong className="text-neutral-900">{bienAdresse}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Quartier : </span>
                <strong className="text-neutral-900">{bienQuartier}</strong>
              </div>
            </div>
          </div>

          {/* LES 16 ARTICLES */}
          <div className="space-y-4 text-sm text-neutral-800 leading-relaxed text-justify">
            {/* ARTICLE 1 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 1 — OBJET DU CONTRAT</h3>
              <p>
                Le présent contrat a pour objet la location du bien immobilier désigné ci-dessus, à usage
                exclusif d'habitation, pour une durée de <strong>douze (12) mois</strong> à compter du{' '}
                <strong>{dateDebut}</strong> et se terminant le <strong>{dateFin}</strong>.
                Il pourra être renouvelé par tacite reconduction sauf dénonciation par l'une des parties,
                dans les conditions prévues à l'Article 10.
              </p>
            </div>

            {/* ARTICLE 2 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 2 — AVANCE (CAUTION)</h3>
              <p>
                Le Locataire verse ce jour, entre les mains du Bailleur ou de son mandataire,
                une avance sur caution d'un montant de <strong>{formatNumber(cautionMontant)} FCFA</strong>{' '}
                ({nombreEnLettres(cautionMontant)} Francs CFA), correspondant à{' '}
                <strong>{cautionMois} mois de loyer</strong>.
              </p>
              <p className="mt-2">
                Cette avance ne constitue pas un loyer et reste la propriété du Locataire. Elle sera
                restituée à la fin du bail, après état des lieux de sortie et déduction faite, le cas échéant,
                des réparations locatives et des sommes restant dues.
              </p>
            </div>

            {/* ARTICLE 3 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 3 — LOYER</h3>
              <p>
                Le loyer mensuel est fixé à <strong>{formatNumber(loyerTotal)} FCFA</strong>{' '}
                ({nombreEnLettres(loyerTotal)} Francs CFA), se décomposant comme suit :
              </p>
              <ul className="ml-6 mt-2 list-disc">
                <li>Loyer de base : <strong>{formatNumber(loyerBase)} FCFA</strong></li>
                <li>Charges locatives : <strong>{formatNumber(charges)} FCFA</strong></li>
              </ul>
              <p className="mt-2">
                Le loyer sera payable d'avance le <strong>05 de chaque mois</strong> auprès de
                l'agence {nomAgence} ou par tout autre moyen convenu avec elle.
              </p>
            </div>

            {/* ARTICLE 4 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 4 — USAGE DES LIEUX</h3>
              <p>
                Le bien loué est destiné exclusivement à l'habitation personnelle du Locataire et de sa
                famille. Toute utilisation à usage commercial, professionnel ou artisanal est formellement
                interdite sans l'accord écrit préalable du Bailleur.
              </p>
              <p className="mt-2">
                Le Locataire ne pourra sous-louer le bien, en totalité ou en partie, ni céder son droit au
                présent bail, sans l'autorisation écrite et préalable du Bailleur.
              </p>
            </div>

            {/* ARTICLE 5 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 5 — MODIFICATIONS</h3>
              <p>
                Le Locataire ne pourra effectuer aucune modification, transformation ou adjonction dans le
                bien loué sans l'autorisation écrite préalable du Bailleur. Toute modification non autorisée
                pourra entraîner la remise en état aux frais du Locataire ou la résiliation du bail.
              </p>
            </div>

            {/* ARTICLE 6 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 6 — CHARGES D'EXPLOITATION</h3>
              <p>
                Le Locataire s'engage à régler directement les charges suivantes :
              </p>
              <ul className="ml-6 mt-2 list-disc">
                <li>Consommation d'eau (SEN'EAU)</li>
                <li>Consommation d'électricité (SENELEC / Woyofal)</li>
                <li>Frais d'enlèvement des ordures ménagères</li>
                <li>Frais de gardiennage (le cas échéant)</li>
                <li>Abonnement internet et téléphone (le cas échéant)</li>
              </ul>
              <p className="mt-2">
                Le défaut de paiement de ces charges pourra entraîner la résiliation du bail après mise en demeure.
              </p>
            </div>

            {/* ARTICLE 7 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 7 — CHARGES DE PROPRIÉTÉ</h3>
              <p>
                Le Bailleur conserve à sa charge les travaux de grosse réparation et de reconstruction
                (toiture, murs porteurs, fondations, etc.), ainsi que les impôts et taxes afférents à la
                propriété (impôt foncier, taxe sur les propriétés bâties, etc.).
              </p>
              <p className="mt-2">
                Les réparations locatives, d'entretien courant et les menues réparations sont à la charge
                exclusive du Locataire.
              </p>
            </div>

            {/* ARTICLE 8 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 8 — ASSURANCES</h3>
              <p>
                Le Locataire s'engage à souscrire auprès d'une compagnie d'assurance agréée une police
                d'assurance habitation couvrant les risques d'incendie, dégâts d'eau et responsabilité civile
                locative. Il devra fournir une copie de l'attestation au Bailleur dans le mois suivant la
                signature du présent contrat.
              </p>
            </div>

            {/* ARTICLE 9 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 9 — TRAVAUX</h3>
              <p>
                Le Locataire doit maintenir le bien loué en bon état de propreté et effectuer les menues
                réparations nécessaires à son bon usage. Il doit signaler sans délai au Bailleur ou à
                l'agence tout désordre ou dégât constaté.
              </p>
              <p className="mt-2">
                Le Bailleur pourra, après avis préalable, faire exécuter dans le bien loué tous travaux
                urgents nécessités par la sécurité ou la salubrité.
              </p>
            </div>

            {/* ARTICLE 10 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 10 — RÉSILIATION</h3>
              <p>
                Le présent bail pourra être résilié par l'une ou l'autre des parties, moyennant un préavis
                écrit de <strong>deux (2) mois</strong> avant la date d'échéance, conformément aux usages
                locatifs en vigueur au Sénégal.
              </p>
              <p className="mt-2">
                En cas de manquement grave du Locataire à ses obligations (non-paiement du loyer, trouble
                de voisinage, dégradations, etc.), le Bailleur pourra résilier le bail de plein droit après
                mise en demeure restée sans effet.
              </p>
            </div>

            {/* ARTICLE 11 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 11 — CAUTION</h3>
              <p>
                La caution versée conformément à l'Article 2 sera restituée au Locataire dans un délai
                maximum d'<strong>un (1) mois</strong> suivant la remise des clés, après établissement
                contradictoire de l'état des lieux de sortie.
              </p>
              <p className="mt-2">
                Le Bailleur pourra déduire de cette caution : les loyers et charges impayés, le coût des
                réparations locatives, et les sommes dues au titre des dégradations constatées.
              </p>
            </div>

            {/* ARTICLE 12 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 12 — PAIEMENT</h3>
              <p>
                Le loyer est payable <strong>d'avance, mensuellement, le 05 de chaque mois</strong>.
                Tout retard de paiement entraînera l'application de pénalités dans les conditions prévues
                à l'Article 13.
              </p>
              <p className="mt-2">
                Les paiements pourront être effectués :
              </p>
              <ul className="ml-6 mt-2 list-disc">
                <li>En espèces au guichet de l'agence ;</li>
                <li>Par virement bancaire sur le compte de l'agence ;</li>
                <li>Par Wave ou Orange Money aux numéros officiels de l'agence ;</li>
                <li>Par tout autre moyen convenu entre les parties.</li>
              </ul>
            </div>

            {/* ARTICLE 13 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 13 — PÉNALITÉS DE RETARD</h3>
              <p>
                Tout retard de paiement du loyer supérieur à <strong>dix (10) jours</strong> après
                l'échéance entraînera automatiquement l'application de pénalités de retard d'un montant
                équivalent à <strong>10% du loyer mensuel</strong>, sans préjudice des poursuites ultérieures.
              </p>
              <p className="mt-2">
                À défaut de règlement dans les trente (30) jours suivant la mise en demeure, le Bailleur
                pourra engager la procédure de recouvrement conformément à la réglementation en vigueur.
              </p>
            </div>

            {/* ARTICLE 14 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 14 — IMPÔTS ET TAXES</h3>
              <p>
                Les impôts et taxes relatifs à la propriété (impôt foncier, taxe sur les propriétés bâties,
                TOM, etc.) sont à la charge du Bailleur.
              </p>
              <p className="mt-2">
                Les charges locatives et les taxes liées à l'occupation des lieux sont à la charge du
                Locataire.
              </p>
            </div>

            {/* ARTICLE 15 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 15 — CLAUSE RÉSOLUTOIRE</h3>
              <p>
                Le présent contrat sera résilié de plein droit, sans qu'il soit besoin d'une mise en demeure
                préalable, en cas de :
              </p>
              <ul className="ml-6 mt-2 list-disc">
                <li>Non-paiement du loyer ou des charges deux (2) mois consécutifs ;</li>
                <li>Non-versement de la caution ou de l'avance prévue à l'Article 2 ;</li>
                <li>Dégradations graves du bien loué ;</li>
                <li>Usage illicite ou non conforme du bien ;</li>
                <li>Sous-location non autorisée.</li>
              </ul>
              <p className="mt-2">
                Dans tous ces cas, le Bailleur pourra faire procéder à l'expulsion du Locataire dans les
                conditions prévues par la réglementation en vigueur.
              </p>
            </div>

            {/* ARTICLE 16 */}
            <div>
              <h3 className="font-bold text-neutral-900 underline mb-2">ARTICLE 16 — ÉLECTION DE DOMICILE</h3>
              <p>
                Pour l'exécution du présent contrat, les parties élisent domicile :
              </p>
              <ul className="ml-6 mt-2 list-disc">
                <li>
                  <strong>Le Bailleur :</strong> en l'étude de l'agence {nomAgence}, sise{' '}
                  {adresse}, qui représente le Bailleur pour toute signification ;
                </li>
                <li>
                  <strong>Le Locataire :</strong> dans les lieux loués eux-mêmes.
                </li>
              </ul>
              <p className="mt-2">
                Tout changement d'adresse devra être notifié par écrit à l'autre partie dans un délai
                de quinze (15) jours.
              </p>
            </div>
          </div>

          {/* Fait à, date */}
          <div className="mt-10 text-center text-sm">
            <p>
              Fait à <strong>Dakar</strong>, le <strong>{dateDuJour}</strong>
            </p>
            <p className="text-xs text-neutral-600 mt-1 italic">
              En trois (3) exemplaires originaux, dont un remis à chaque partie.
            </p>
          </div>

                    {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 mt-12 pt-6 border-t-2 border-neutral-300">
            <div>
              <div className="font-bold text-neutral-700 text-xs mb-2 uppercase">
                Le Bailleur
              </div>
              <div className="h-24 border border-dashed border-neutral-400 rounded-lg"></div>
              <div className="text-[10px] text-neutral-600 mt-2 text-center">
                {proprietaireNom}
              </div>
            </div>

            <div>
              <div className="font-bold text-neutral-700 text-xs mb-2 uppercase">
                Le Locataire
              </div>
              <div className="h-24 border border-dashed border-neutral-400 rounded-lg"></div>
              <div className="text-[10px] text-neutral-600 mt-2 text-center">
                {locataireNom}
              </div>
              <div className="text-[9px] text-neutral-500 mt-1 text-center italic">
                (Lu et approuvé)
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                Rédigé par
              </div>
              <div className="text-xs font-bold text-neutral-900">
                {contract.createdByNom || 'Service Gérance'}
              </div>
              <div className="text-[10px] uppercase font-semibold text-neutral-500 mb-2">
                Rôle : {contract.createdByRole || '—'}
              </div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg"></div>
              <div className="text-[10px] text-neutral-600 mt-2 text-center">
                {nomAgence}
              </div>
              <div className="text-[9px] text-neutral-500 mt-1 text-center italic">
                Cachet & Signature Agence
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-neutral-300 text-center text-[10px] text-neutral-500">
            {nomAgence} · NINEA : {ninea} · {adresse} · Tél : {telephone}
            <br />
            Contrat généré automatiquement le {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};