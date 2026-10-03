// ============================================================
// COMPOSANT — Bloc signature utilisateur (traçabilité)
// Affiche : "Encaissé par : Nom (Fonction) + signature"
// ============================================================
import React, { useState, useEffect } from 'react';
import { getUserSignatureInfo } from '../lib/supabase/signatureService';
import { formatDate } from '../lib/utils';

interface UserSignatureBlockProps {
  userId?: string;
  label?: string;
  date?: string | Date;
  compact?: boolean;
}

export const UserSignatureBlock: React.FC<UserSignatureBlockProps> = ({
  userId,
  label = 'Créé par',
  date,
  compact = false,
}) => {
  const [user, setUser] = useState<{
    nom: string;
    prenom: string;
    fonction?: string;
    signatureUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getUserSignatureInfo(userId).then(setUser);
  }, [userId]);

  if (!user) return null;

  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim();
  const dateStr = date 
    ? (typeof date === 'string' ? date : formatDate(date.toISOString()))
    : formatDate(new Date().toISOString());

  if (compact) {
    return (
      <div className="text-[8px] text-neutral-700">
        <span className="font-bold">{label} :</span> {fullName}
        {user.fonction && <span> ({user.fonction})</span>}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-4 mt-4">
      <div className="text-[9px] text-neutral-700">
        <div className="font-bold mb-1">{label} :</div>
        <div>{fullName}</div>
        {user.fonction && (
          <div className="italic text-neutral-600">{user.fonction}</div>
        )}
        <div className="text-neutral-500 mt-0.5">{dateStr}</div>
      </div>

      <div className="text-center">
        <div className="text-[9px] text-neutral-700 mb-1">Signature</div>
        <div className="w-32 h-12 border-b border-dotted border-neutral-400 relative flex items-end justify-center">
          {user.signatureUrl ? (
            <img
              src={user.signatureUrl}
              alt="Signature"
              className="max-h-12 object-contain mb-1"
            />
          ) : (
            <span className="text-[8px] text-neutral-400 mb-1">Non signé</span>
          )}
        </div>
      </div>
    </div>
  );
};