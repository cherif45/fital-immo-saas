import { useEffect, useState } from 'react';

type SWStatus = 'loading' | 'ready' | 'offline' | 'unsupported' | 'update-available';

export function CacheManager() {
  const [swStatus, setSwStatus] = useState<SWStatus>('loading');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // 1. Vérifier le support
    if (!('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      return;
    }

    // 2. Statut online/offline
    const updateStatus = () => {
      setSwStatus(navigator.onLine ? 'ready' : 'offline');
    };
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // 3. Détecter une mise à jour du SW disponible
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Si une nouvelle version est en attente
      if (reg.waiting) {
        setSwStatus('update-available');
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwStatus('update-available');
          }
        });
      });
    });

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Appliquer la mise à jour (recharge la page)
  const applyUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
  };

  // Vider le cache manuellement (dépannage)
  const clearCache = async () => {
    if (!confirm('Vider le cache local ? L\'app rechargera les données fraîches.')) return;

    setClearing(true);
    try {
      // Supprimer les caches Workbox (mais garder le SW actif)
      if ('caches' in window) {
        const keys = await caches.keys();
        // On ne supprime QUE les caches applicatifs, pas les caches de build
        const appCaches = keys.filter(k => k.startsWith('supabase-'));
        await Promise.all(appCaches.map(k => caches.delete(k)));
        console.log(`✅ ${appCaches.length} caches applicatifs supprimés`);
      }
      // Recharger pour repartir sur des données fraîches
      window.location.reload();
    } catch (e) {
      console.error('Erreur clear cache:', e);
      setClearing(false);
    }
  };

  // Rendu
  if (swStatus === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Mode hors ligne non supporté
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Indicateur de statut */}
      {swStatus === 'loading' && (
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
          Initialisation…
        </span>
      )}

      {swStatus === 'ready' && (
        <span className="flex items-center gap-1.5 text-green-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          En ligne · PWA active
        </span>
      )}

      {swStatus === 'offline' && (
        <span className="flex items-center gap-1.5 text-orange-500">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          Hors ligne · données en cache
        </span>
      )}

      {swStatus === 'update-available' && (
        <button
          onClick={applyUpdate}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          title="Nouvelle version disponible"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Mettre à jour
        </button>
      )}

      {/* Bouton vider le cache (toujours dispo sauf unsupported) */}
      {swStatus !== 'unsupported' && (
        <button
          onClick={clearCache}
          disabled={clearing}
          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
          title="Vider le cache local (dépannage)"
        >
          {clearing ? '…' : 'Vider cache'}
        </button>
      )}
    </div>
  );
}