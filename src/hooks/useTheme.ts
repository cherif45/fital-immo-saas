// ============================================================
// HOOK — Gestion du thème (clair / sombre)
// ============================================================
import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fital_immo_theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1. Vérifier localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    // 2. Défaut : sombre
    return 'dark';
  });

  // Appliquer le thème au DOM
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Retirer les 2 classes
    html.classList.remove('theme-dark', 'theme-light');
    body.classList.remove('theme-dark', 'theme-light');

    // Ajouter la classe correspondante
    html.classList.add(`theme-${theme}`);
    body.classList.add(`theme-${theme}`);

    // Sauvegarder
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}

    // Appliquer couleur de fond body
    if (theme === 'light') {
      body.style.backgroundColor = '#F5F5F0';
      body.style.color = '#1A1A1A';
    } else {
      body.style.backgroundColor = '#0F1B2D';
      body.style.color = '#F0EDE8';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}