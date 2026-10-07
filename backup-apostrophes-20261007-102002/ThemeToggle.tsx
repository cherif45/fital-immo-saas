// ============================================================
// COMPOSANT — Sélecteur de thème (pill segmentée)
// 3 modes : Sombre (🌙), Clair (☀️), Auto (⚙️)
// Style compact, inspiré iPhoneAddict
// ============================================================
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../hooks/useTheme';

interface ThemeOption {
  id: Theme;
  label: string;
  icon: React.ReactNode;
}

export const ThemeToggle: React.FC = () => {
  const { themeSetting, setTheme } = useTheme();

  const OPTIONS: ThemeOption[] = [
    { id: 'dark',   label: 'Sombre', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'light',  label: 'Clair',  icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'Auto',   icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full p-1 gap-0.5"
      style={{
        backgroundColor: 'var(--bg-card-hover)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-primary)',
      }}
      role="group"
      aria-label="Sélecteur de thème"
    >
      {OPTIONS.map((opt) => {
        const isActive = themeSetting === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            title={`Thème : ${opt.label}`}
            aria-pressed={isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
