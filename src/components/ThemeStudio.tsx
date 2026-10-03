// ============================================================
// COMPOSANT — ThemeStudio (panneau premium de personnalisation)
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor, Palette, Check, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme, ACCENTS, type Theme, type Accent } from '../hooks/useTheme';

interface ThemeStudioProps {
  onOpenPreview?: () => void;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = ({ onOpenPreview }) => {
  const { themeSetting, theme, isDark, accent, setTheme, setAccent } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Raccourci clavier : Ctrl+Shift+L
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Animation de rotation de l'icône au changement de thème
  const handleToggleTheme = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Cycle entre sombre ? clair ? système ? sombre
  const cycleTheme = (): Theme => {
    if (themeSetting === 'dark') return 'light';
    if (themeSetting === 'light') return 'system';
    return 'dark';
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton déclencheur */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          handleToggleTheme();
        }}
        className="relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px] hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--accent-soft, rgba(201, 169, 110, 0.15))',
          borderColor: 'var(--accent-border, rgba(201, 169, 110, 0.35))',
          borderWidth: '1px',
          color: 'var(--accent)',
        }}
        title="Personnaliser l'apparence (Ctrl+Shift+L)"
        aria-label="Personnaliser l'apparence"
      >
        <div
          className={`transition-transform duration-500 ${isAnimating ? 'rotate-[360deg] scale-110' : ''}`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </div>
      </button>

      {/* Panneau */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[320px] rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
          style={{
            backgroundColor: isDark ? '#162133' : '#FFFFFF',
            borderColor: 'var(--accent-border, rgba(201, 169, 110, 0.35))',
            borderWidth: '1px',
            color: isDark ? '#F0EDE8' : '#1A1A1A',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold">Apparence</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 opacity-40" style={{ color: 'var(--accent)' }} />
          </div>

          {/* Section Thème */}
          <div className="p-4 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
                Thème
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ThemeButton
                  icon={<Sun className="w-4 h-4" />}
                  label="Clair"
                  active={themeSetting === 'light'}
                  onClick={() => setTheme('light')}
                  isDark={isDark}
                />
                <ThemeButton
                  icon={<Moon className="w-4 h-4" />}
                  label="Sombre"
                  active={themeSetting === 'dark'}
                  onClick={() => setTheme('dark')}
                  isDark={isDark}
                />
                <ThemeButton
                  icon={<Monitor className="w-4 h-4" />}
                  label="Système"
                  active={themeSetting === 'system'}
                  onClick={() => setTheme('system')}
                  isDark={isDark}
                />
              </div>
            </div>

            {/* Section Accent */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
                Couleur d'accent
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ACCENTS.map((a) => (
                  <AccentDot
                    key={a.id}
                    accent={a}
                    active={accent === a.id}
                    onClick={() => setAccent(a.id)}
                  />
                ))}
              </div>
              <div className="mt-2 text-[10px] opacity-60 text-center">
                {ACCENTS.find((a) => a.id === accent)?.label}
              </div>
            </div>

            {/* Aperçu live */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
                Aperçu
              </div>
              <div
                className="p-3 rounded-xl border space-y-2"
                style={{
                  backgroundColor: isDark ? '#141E30' : '#F8F8F5',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] opacity-60">Encaissé ce mois</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    +12.4%
                  </span>
                </div>
                <div className="text-lg font-bold tracking-tight">145 000 FCFA</div>
                <div className="flex gap-1.5">
                  <button
                    className="flex-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    Encaisser
                  </button>
                  <button
                    className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent)',
                    }}
                  >
                    Détail
                  </button>
                </div>
              </div>
            </div>
          </div>

            {/* Bouton vers la page preview (si fourni) */}
            {onOpenPreview && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPreview();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] group"
                  style={{
                    borderColor: 'var(--accent-border, rgba(201,169,110,0.35))',
                    backgroundColor: 'var(--accent-soft, rgba(201,169,110,0.08))',
                    color: 'var(--accent)',
                  }}
                >
                  <span className="text-[11px] font-bold">Voir tous les thèmes</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}

          {/* Footer */}
          <div
            className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-[10px] opacity-40"
            style={{
              borderTop: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <span>Raccourci :</span>
            <kbd
              className="px-1.5 py-0.5 rounded border font-mono text-[9px]"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              }}
            >
              Ctrl
            </kbd>
            <span>+</span>
            <kbd
              className="px-1.5 py-0.5 rounded border font-mono text-[9px]"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              }}
            >
              Shift
            </kbd>
            <span>+</span>
            <kbd
              className="px-1.5 py-0.5 rounded border font-mono text-[9px]"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              }}
            >
              L
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Sous-composant : bouton de thème
// ============================================================
const ThemeButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}> = ({ icon, label, active, onClick, isDark }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
    style={{
      backgroundColor: active
        ? 'var(--accent-soft)'
        : isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(0,0,0,0.02)',
      borderColor: active
        ? 'var(--accent)'
        : isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.08)',
      color: active ? 'var(--accent)' : 'inherit',
    }}
    aria-pressed={active}
  >
    {icon}
    <span className="text-[10px] font-semibold">{label}</span>
  </button>
);

// ============================================================
// Sous-composant : pastille de couleur
// ============================================================
const AccentDot: React.FC<{
  accent: (typeof ACCENTS)[number];
  active: boolean;
  onClick: () => void;
}> = ({ accent, active, onClick }) => (
  <button
    onClick={onClick}
    className="relative w-full aspect-square rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
    style={{
      backgroundColor: accent.color,
      boxShadow: active ? `0 0 0 2px var(--accent), 0 0 0 4px var(--accent-soft)` : 'none',
    }}
    title={accent.label}
    aria-label={accent.label}
    aria-pressed={active}
  >
    {active && <Check className="w-3.5 h-3.5" style={{ color: accent.textColor }} strokeWidth={3} />}
  </button>
);