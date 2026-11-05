// ============================================================
// COMPOSANT — Bloc signature utilisateur (traçabilité)
// Affiche : "Encaissé par : Nom (Fonction) + signature"
// ============================================================
import React, { useState, useEffect } from "react";
import { getUserSignatureInfo } from "../lib/supabase/signatureService";
import { formatDate } from "../lib/utils";

interface UserSignatureBlockProps {
  userId?: string;
  label?: string;
  date?: string | Date;
  compact?: boolean;
  cachetUrl?: string;
}

export const UserSignatureBlock: React.FC<UserSignatureBlockProps> = ({
  userId,
  label = "Créé par",
  date,
  compact = false,
  cachetUrl,
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

  if (!user && !cachetUrl) return null;

  const fullName = user ? `${user.prenom || ""} ${user.nom || ""}`.trim() : "";
  const dateStr = date
    ? typeof date === "string"
      ? date
      : formatDate(date.toISOString())
    : formatDate(new Date().toISOString());

  if (compact) {
    return (
      <div className="text-[8px] text-neutral-700">
        <span className="font-bold">{label} :</span> {fullName || "Agence"}
        {user?.fonction && <span> ({user.fonction})</span>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-end justify-between gap-2 px-4">
      <div className="min-w-0 flex-1 text-[8.5px] text-neutral-800 leading-tight">
        <div className="font-bold mb-0.5">{label} :</div>
        <div className="font-medium">{fullName || "L’Agence"}</div>
        {user?.fonction && (
          <div className="italic text-neutral-600 text-[8px]">
            {user.fonction}
          </div>
        )}
        <div className="text-neutral-500 text-[7.5px] mt-0.5">{dateStr}</div>
      </div>

      <div
        className={`text-center ${
          cachetUrl ? "w-44" : "w-36"
        } flex-shrink-0`}
      >
        <div className="text-[8px] text-neutral-700 font-semibold mb-0.5">
          Signature & Cachet
        </div>
        <div
          className={`${
            cachetUrl ? "h-24" : "h-16"
          } w-full border-b border-dotted border-neutral-400 relative flex items-center justify-center mx-auto`}
        >
          {cachetUrl && (
            <img
              src={cachetUrl}
              alt="Cachet agence"
              className="absolute inset-0 m-auto max-h-20 max-w-[90%] object-contain pointer-events-none"
            />
          )}
          {user?.signatureUrl ? (
            <img
              src={user.signatureUrl}
              alt="Signature"
              className="relative z-10 max-h-16 max-w-full object-contain"
            />
          ) : (
            <span className="relative z-10 text-[7.5px] text-neutral-400">
              Pour Acquit
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
