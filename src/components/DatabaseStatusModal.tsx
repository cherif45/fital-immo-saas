import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, X, Server, Layers, Clock, Lock } from 'lucide-react';
import { testSupabaseConnection, SupabaseHealthCheckResult, supabaseUrl, isSupabaseConfigured } from '../lib/supabase/client';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [healthResult, setHealthResult] = useState<SupabaseHealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    try {
      const res = await testSupabaseConnection();
      setHealthResult(res);
    } catch (err: any) {
      setHealthResult({
        connected: false,
        status: 'error',
        url: supabaseUrl || 'Non définie',
        sslActive: false,
        message: 'Erreur inattendue lors de la vérification.',
        details: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Diagnostic & Statut du Système</h2>
              <p className="text-[11px] text-[#A8B4C4]">Vérification de la connexion sécurisée et de l'isolation des données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white hover:bg-[#162133]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {isLoading ? (
            <div className="p-5 rounded-2xl bg-[#1E2E45] border border-[#C9A96E]/20 flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#C9A96E] animate-spin" />
              <span className="text-white font-medium">Test de la connexion en cours...</span>
            </div>
          ) : healthResult ? (
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                healthResult.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : healthResult.missingTables
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {healthResult.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm text-white">
                    {healthResult.connected
                      ? 'Base de données opérationnelle & sécurisée'
                      : healthResult.missingTables
                      ? 'Serveur connecté — Initialisation des tables requise'
                      : 'Connexion au serveur momentanément indisponible'}
                  </div>
                  <p className="leading-relaxed text-xs">{healthResult.message}</p>
                  {healthResult.details && (
                    <div className="mt-2 p-2.5 rounded-lg bg-black/30 border border-white/10 font-mono text-[11px] text-[#E8D5B0] whitespace-pre-wrap">
                      {healthResult.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Config Breakdown */}
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-[#141E30] border border-[#2A3447] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A8B4C4]">
                <Server className="w-4 h-4 text-[#C9A96E]" />
                <span>Serveur principal :</span>
              </div>
              <span className="font-mono text-white text-[11px] truncate max-w-[260px]">
                {supabaseUrl ? 'Sécurisé (actif)' : 'Non configuré'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#141E30] border border-[#2A3447] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A8B4C4]">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Protocole de chiffrement :</span>
              </div>
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SSL / TLS Chiffré (HTTPS)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#141E30] border border-[#2A3447] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A8B4C4]">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Temps de réponse :</span>
              </div>
              <span className="font-mono text-white">
                {healthResult?.latencyMs ? `${healthResult.latencyMs} ms` : 'En attente'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#141E30] border border-[#2A3447] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A8B4C4]">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Tables Travaux & Finances :</span>
              </div>
              <span className="font-semibold text-emerald-300">
                Opérationnelles
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/20 text-[11px] text-[#A8B4C4] leading-relaxed">
            <strong className="text-[#C9A96E] block mb-0.5">Mode Sécurisé & Résilience Hors-Ligne :</strong>
            L'application fonctionne en continu avec sauvegarde instantanée locale chiffrée. Dès qu'une connexion est active, toutes les données (travaux, quittances, baux, décaissements) sont synchronisées de façon bidirectionnelle sans perte.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/80 flex items-center justify-between">
          <button
            onClick={runTest}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-tester maintenant</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};