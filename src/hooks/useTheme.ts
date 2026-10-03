// ============================================================
// HOOK — Gestion du thème + accent (version premium)
// ============================================================
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type Accent = 'gold' | 'blue' | 'emerald' | 'bordeaux' | 'navy' | 'anthracite';

const STORAGE_THEME_KEY  = 'fital_immo_theme';
const STORAGE_ACCENT_KEY = 'fital_immo_accent';

export const ACCENTS: { id: Accent; label: string; color: string; textColor: string }[] = [
  { id: 'gold',       label: 'Or Champagne',  color: '#C9A96E', textColor: '#0F1B2D' },
  { id: 'blue',       label: 'Bleu Royal',    color: '#2563EB', textColor: '#FFFFFF' },
  { id: 'emerald',    label: 'Vert Émeraude', color: '#047857', textColor: '#FFFFFF' },
  { id: 'bordeaux',   label: 'Bordeaux',      color: '#7F1D1D', textColor: '#FFFFFF' },
  { id: 'navy',       label: 'Bleu Notaire',  color: '#1E3A5F', textColor: '#FFFFFF' },
  { id: 'anthracite', label: 'Anthracite',    color: '#374151', textColor: '#FFFFFF' },
];

// Détection du thème OS
function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Lecture des préférences sauvegardées
function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {}
  return 'system';
}

function readStoredAccent(): Accent {
  try {
    const saved = localStorage.getItem(STORAGE_ACCENT_KEY) as Accent | null;
    if (saved && ACCENTS.some(a => a.id === saved)) return saved;
  } catch {}
  return 'gold';
}

// Résolution du thème réel (system → dark/light)
function resolveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useTheme() {
  const [themeSetting, setThemeSetting] = useState<Theme>(readStoredTheme);
  const [accent, setAccentState] = useState<Accent>(readStoredAccent);
  const [resolved, setResolved] = useState<'dark' | 'light'>(() => resolveTheme(readStoredTheme()));

  // Appliquer le thème + accent au DOM
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const realTheme = resolveTheme(themeSetting);
    setResolved(realTheme);

    // Classes de thème
    html.classList.remove('theme-dark', 'theme-light');
    body.classList.remove('theme-dark', 'theme-light');
    html.classList.add(`theme-${realTheme}`);
    body.classList.add(`theme-${realTheme}`);

    // Attribut d'accent (utilisé par CSS custom properties)
    html.setAttribute('data-accent', accent);

    // Fond de body
    if (realTheme === 'light') {
      body.style.backgroundColor = '#F5F5F0';
      body.style.color = '#1A1A1A';
    } else {
      body.style.backgroundColor = '#0F1B2D';
      body.style.color = '#F0EDE8';
    }

    // Sauvegarder
    try {
      localStorage.setItem(STORAGE_THEME_KEY, themeSetting);
      localStorage.setItem(STORAGE_ACCENT_KEY, accent);
    } catch {}
  }, [themeSetting, accent]);

  // Écouter les changements OS si mode "system"
  useEffect(() => {
    if (themeSetting !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeSetting]);

  // Sync entre onglets
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_THEME_KEY && e.newValue) {
        if (e.newValue === 'dark' || e.newValue === 'light' || e.newValue === 'system') {
          setThemeSetting(e.newValue);
        }
      }
      if (e.key === STORAGE_ACCENT_KEY && e.newValue) {
        const a = e.newValue as Accent;
        if (ACCENTS.some(x => x.id === a)) setAccentState(a);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // API exposée
  const setTheme = useCallback((t: Theme) => setThemeSetting(t), []);
  const setAccent = useCallback((a: Accent) => setAccentState(a), []);

  const toggleTheme = useCallback(() => {
    // Cycle : si dark → light, si light → dark, si system → dark
    setThemeSetting(prev => {
      const real = resolveTheme(prev);
      return real === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return {
    // Thème demandé par l'utilisateur (peut être 'system')
    themeSetting,
    // Thème réellement appliqué ('dark' ou 'light')
    theme: resolved,
    isDark: resolved === 'dark',
    accent,
    // Actions
    setTheme,
    setAccent,
    toggleTheme,
  };
}