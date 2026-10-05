// ============================================================
// COMPOSANT — Sélecteur de thème (dropdown)
// 3 modes : Clair, Sombre, Auto
// 6 accents : Gold, Blue, Emerald, Bordeaux, Navy, Anthracite
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor, Palette, Check, X, ChevronDown } from 'lucide-react';
import { useTheme, ACCENTS, type Accent } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { themeSetting, theme, accent, setTheme, setAccent } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer au clic exterieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Icône selon le mode
  const getIcon = () => {
    if (themeSetting === 'system') return <Monitor className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  // Label du mode actuel
  const getLabel = () => {
    if (themeSetting === 'system') return 'Auto';
    if (theme === 'dark') return 'Sombre';
    return 'Clair';
  };

  // Thèmes
  const MODES: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
    { id: 'light', label: 'Clair', icon: Sun },
    { id: 'dark', label: 'Sombre', icon: Moon },
    { id: 'system', label: 'Auto', icon: Monitor },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Changer de thème"
        className="p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        style={{
          backgroundColor: 'var(--bg-card-hover)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {getIcon()}
        <span className="text-xs font-semibold hidden sm:inline">{getLabel()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Header */}
          <div
            className="p-3 flex items-center justify-between"
            style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Apparence</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Section Modes */}
          <div className="p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
              Mode
            </div>
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = themeSetting === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setTheme(m.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--accent-text, #FFFFFF)' : 'var(--text-primary)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold flex-1">{m.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Section Accents */}
          <div
            className="p-2"
            style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--border-primary)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
              Couleur d'accent
            </div>
            <div className="grid grid-cols-6 gap-1.5 px-1">
              {ACCENTS.map((a) => {
                const isActive = accent === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id)}
                    title={a.label}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: a.color,
                      borderWidth: isActive ? '2px' : '1px',
                      borderStyle: 'solid',
                      borderColor: isActive ? 'var(--text-primary)' : 'transparent',
                      boxShadow: isActive ? `0 0 0 3px ${a.color}40` : 'none',
                    }}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" style={{ color: a.textColor }} />}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              {ACCENTS.find(x => x.id === accent)?.label}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
