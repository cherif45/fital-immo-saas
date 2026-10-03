// ============================================================
// COMPOSANT — Bouton de changement de thème
// ============================================================
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      className="p-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#C9A96E] transition-all cursor-pointer flex items-center justify-center"
      style={{
        backgroundColor: 'var(--bg-card-hover)',
        borderColor: 'var(--border-primary)',
        color: 'var(--accent)',
      }}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
};