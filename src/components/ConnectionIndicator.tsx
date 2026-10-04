import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Database } from 'lucide-react';

interface ConnectionIndicatorProps {
  onClick: () => void;
}

/**
 * Indicateur de connexion réseau temps réel + Supabase.
 * - Vert : en ligne + Supabase OK
 * - Orange : hors ligne (mode PWA)
 * - Rouge : Supabase non configuré
 */
export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ onClick }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const status = isOnline ? 'online' : 'offline';

  const config = {
    online: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      label: 'En ligne',
      Icon: Wifi,
      iconColor: 'text-emerald-400',
    },
    offline: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      dot: 'bg-orange-400',
      label: 'Hors ligne',
      Icon: WifiOff,
      iconColor: 'text-orange-400',
    },
  }[status];

  const { Icon } = config;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border ${config.bg} ${config.border} ${config.text} hover:brightness-125 transition-all cursor-pointer min-h-[40px]`}
      title={
        isOnline
          ? 'Connecté — cliquez pour voir le diagnostic'
          : 'Mode hors ligne — cliquez pour voir le diagnostic'
      }
      aria-label={`Statut : ${config.label}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      <span className="hidden sm:inline font-mono text-[10px] font-semibold">
        {config.label}
      </span>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
    </button>
  );
};