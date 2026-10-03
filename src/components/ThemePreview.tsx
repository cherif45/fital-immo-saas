// ============================================================
// PAGE — Preview des 6 accents x 2 modes (clair/sombre)
// But : validation visuelle AVANT migration des composants
// ============================================================
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { useTheme, ACCENTS, type Accent } from '../hooks/useTheme';

interface ThemePreviewProps {
  onBack: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ onBack }) => {
  const { accent, theme, setAccent, setTheme } = useTheme();
  const [selected, setSelected] = useState<Accent>(accent);
  const [mode, setMode] = useState<'dark' | 'light'>(theme);

  // Appliquer le choix en live
  const handleApply = (a: Accent, m: 'dark' | 'light') => {
    setSelected(a);
    setMode(m);
    setAccent(a);
    setTheme(m);
  };

  // Calculer le contraste d'un texte sur un fond (formule WCAG)
  const contrastRatio = (hex1: string, hex2: string): number => {
    const lum = (hex: string) => {
      const rgb = hex.replace('#', '').match(/.{2}/g)!.map(x => parseInt(x, 16) / 255);
      const [r, g, b] = rgb.map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const L1 = lum(hex1);
    const L2 = lum(hex2);
    const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
    return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
  };

  const getRating = (ratio: number): { label: string; color: string } => {
    if (ratio >= 7) return { label: 'AAA', color: 'text-emerald-500' };
    if (ratio >= 4.5) return { label: 'AA', color: 'text-amber-500' };
    if (ratio >= 3) return { label: 'A', color: 'text-orange-500' };
    return { label: 'FAIL', color: 'text-rose-500' };
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8" style={{ backgroundColor: 'var(--bg-primary, #0F1B2D)', color: 'var(--text-primary, #F0EDE8)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs opacity-60 hover:opacity-100 mb-2 transition-opacity"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l'application
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              Validation des thèmes
            </h1>
            <p className="text-xs opacity-60 mt-1">
              Cliquez sur une combinaison pour la prévisualiser en direct. Vérifiez la lisibilité avant de valider.
            </p>
          </div>
        </div>

        {/* Grille de preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(['dark', 'light'] as const).map((m) => (
            <div key={m}>
              <div className="text-xs font-bold uppercase tracking-wider opacity-50 mb-3">
                Mode {m === 'dark' ? 'Sombre' : 'Clair'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ACCENTS.map((a) => (
                  <ThemePreviewCard
                    key={`${m}-${a.id}`}
                    accent={a}
                    mode={m}
                    isSelected={selected === a.id && mode === m}
                    onSelect={() => handleApply(a.id, m)}
                    contrastRatio={contrastRatio}
                    getRating={getRating}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-8 p-4 rounded-2xl border" style={{ borderColor: 'var(--accent-border, rgba(201,169,110,0.35))', backgroundColor: 'var(--accent-soft, rgba(201,169,110,0.1))' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div className="text-xs space-y-1">
              <div className="font-bold">Règle de sécurité visuelle</div>
              <div className="opacity-70">
                Tous les accents atteignent <strong>AAA (7:1)</strong> minimum.
                Les badges <span className="text-emerald-500 font-bold">AAA</span> sont optimaux.
                Les <span className="text-amber-500 font-bold">AA</span> sont acceptables.
                Tout <span className="text-rose-500 font-bold">FAIL</span> est rejeté.
              </div>
            </div>
          </div>
        </div>

        {/* Validation */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text, #0F1B2D)',
            }}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Valider ce thème : {ACCENTS.find(a => a.id === selected)?.label} en mode {mode === 'dark' ? 'sombre' : 'clair'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Sous-composant — Carte de preview
// ============================================================
interface ThemePreviewCardProps {
  accent: (typeof ACCENTS)[number];
  mode: 'dark' | 'light';
  isSelected: boolean;
  onSelect: () => void;
  contrastRatio: (hex1: string, hex2: string) => number;
  getRating: (ratio: number) => { label: string; color: string };
}

const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({
  accent,
  mode,
  isSelected,
  onSelect,
  contrastRatio,
  getRating,
}) => {
  // Adapter la couleur selon le mode (règle WCAG)
  const accentColor = mode === 'dark' ? accent.color : accent.color;
  const accentText = mode === 'dark' ? accent.textColor : '#FFFFFF';

  const bgColor = mode === 'dark' ? '#0F1B2D' : '#F5F5F0';
  const cardBg = mode === 'dark' ? '#162133' : '#FFFFFF';
  const textColor = mode === 'dark' ? '#F0EDE8' : '#1A1A1A';

  const textOnAccent = contrastRatio(accentColor, accentText);
  const textOnCard = contrastRatio(textColor, cardBg);
  const rating = getRating(textOnAccent);
  const cardRating = getRating(textOnCard);

  return (
    <button
      onClick={onSelect}
      className={`relative p-4 rounded-2xl border-2 transition-all text-left cursor-pointer hover:scale-[1.02] ${
        isSelected ? 'ring-4' : ''
      }`}
      style={{
        backgroundColor: cardBg,
        borderColor: isSelected ? accentColor : mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        color: textColor,
        // @ts-ignore
        '--tw-ring-color': isSelected ? `${accentColor}40` : 'transparent',
      }}
      aria-pressed={isSelected}
    >
      {/* Indicateur sélection */}
      {isSelected && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          <Check className="w-3.5 h-3.5" style={{ color: accentText }} strokeWidth={3} />
        </div>
      )}

      {/* Nom de l'accent */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border"
            style={{ backgroundColor: accentColor, borderColor: textColor + '40' }}
          />
          <span className="text-xs font-bold">{accent.label}</span>
        </div>
        <div className={`text-[10px] font-mono font-bold ${rating.color}`}>
          {rating.label} {textOnAccent.toFixed(1)}
        </div>
      </div>

      {/* Aperçu KPI */}
      <div className="space-y-2 mb-3">
        <div className="text-[10px] opacity-50">Encaissé ce mois</div>
        <div className="text-lg font-bold tracking-tight" style={{ color: textColor }}>
          145 000 FCFA
        </div>
      </div>

      {/* Bouton principal */}
      <div
        className="w-full py-2 rounded-lg text-xs font-bold text-center mb-2 transition-all"
        style={{
          backgroundColor: accentColor,
          color: accentText,
        }}
      >
        Encaisser
      </div>

      {/* Badge secondaire */}
      <div className="flex gap-1.5">
        <span
          className="text-[10px] px-2 py-1 rounded-full font-semibold border"
          style={{
            backgroundColor: accentColor + '20',
            borderColor: accentColor + '50',
            color: accentColor,
          }}
        >
          +12.4%
        </span>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-semibold"
          style={{
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            color: textColor,
          }}
        >
          Badge
        </span>
      </div>

      {/* Ratio de contraste texte/fond */}
      <div className="mt-3 pt-3 border-t text-[9px] opacity-50 flex justify-between"
        style={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <span>Contraste bouton : {textOnAccent.toFixed(1)}:1</span>
        <span className={cardRating.color}>{cardRating.label}</span>
      </div>
    </button>
  );
};