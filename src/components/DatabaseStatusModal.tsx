import React, { useEffect, useState } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface AppStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<AppStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState<'loading' | 'ready' | 'unsupported'>('loading');
  const [clearing, setClearing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwStatus('ready'))
        .catch(() => setSwStatus('unsupported'));
    } else {
      setSwStatus('unsupported');
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);
  }, []);

  // Supprime uniquement les anciens caches de réponses Supabase.
  // Les caches Workbox nécessaires à la PWA sont conservés.
  const clearCache = async () => {
    const confirmed = window.confirm(
      'Supprimer les anciens caches de données Supabase ? Les fichiers de l’application seront conservés.'
    );

    if (!confirmed) return;

    setClearing(true);

    try {
      if ('caches' in window) {
        const keys = await caches.keys();

        const obsoleteCaches = keys.filter(
          (key) =>
            key === 'supabase-get-v1' ||
            key === 'supabase-rpc-v1'
        );

        await Promise.all(
          obsoleteCaches.map((key) => caches.delete(key))
        );
      }

      window.location.reload();
    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens caches :', error);
      window.alert('Le nettoyage du cache a échoué. Réessayez plus tard.');
      setClearing(false);
    }
  };

  const reload = () => {
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
          <div>
            <h2 className="text-sm font-bold text-white">
              État de l'application
            </h2>
            <p className="text-[11px] text-[#A8B4C4] mt-0.5">
              Vérifiez la connexion et gérez les données locales
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white hover:bg-[#162133]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-orange-500/10 border-orange-500/30'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div
                className={`font-bold text-sm ${
                  isOnline ? 'text-emerald-300' : 'text-orange-300'
                }`}
              >
                {isOnline ? 'Connecté' : 'Hors ligne'}
              </div>

              <p className="text-[11px] text-[#A8B4C4] mt-0.5 leading-relaxed">
                {isOnline
                  ? 'Connexion internet active. Les données sont chargées depuis le serveur.'
                  : 'Connexion internet indisponible. Certaines fonctionnalités peuvent être limitées.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141E30] border border-[#2A3447] flex items-start gap-3">
            <Download className="w-5 h-5 text-[#C9A96E] flex-shrink-0 mt-0.5" />

            <div className="flex-1">
              <div className="font-bold text-sm text-white">
                Application progressive (PWA)
              </div>

              <p className="text-[11px] text-[#A8B4C4] mt-0.5 leading-relaxed">
                {swStatus === 'ready'
                  ? "Le Service Worker de l'application est opérationnel."
                  : swStatus === 'loading'
                    ? 'Initialisation en cours…'
                    : "Le Service Worker n'est pas disponible sur ce navigateur."}
              </p>

              {isStandalone && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Application installée
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Recharger l'application"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={clearCache}
              disabled={clearing}
              className="px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Supprimer les anciens caches Supabase"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {clearing ? 'Nettoyage…' : 'Nettoyer les anciens caches'}
              </span>
            </button>
          </div>

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
