import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark',
    '--bg-primary': '#0f1419',
    '--bg-secondary': '#15202b',
    '--bg-tertiary': '#1c2938',
    '--bg-card': '#192734',
    '--bg-hover': '#22303c',
    '--text-primary': '#f7f9f9',
    '--text-secondary': '#8b98a5',
    '--text-muted': '#6e767d',
    '--border-color': '#2f3b47',
    '--border-light': '#38444d',
    '--accent-color': '#1d9bf0',
    '--accent-hover': '#1a8cd8',
    '--accent-subtle': 'rgba(29, 155, 240, 0.1)',
  },
  medium: {
    name: 'Dim',
    '--bg-primary': '#1e2732',
    '--bg-secondary': '#273340',
    '--bg-tertiary': '#313d4b',
    '--bg-card': '#2c3844',
    '--bg-hover': '#3a4854',
    '--text-primary': '#f7f9f9',
    '--text-secondary': '#a4b1bd',
    '--text-muted': '#8594a3',
    '--border-color': '#3d4d5c',
    '--border-light': '#4a5c6b',
    '--accent-color': '#1d9bf0',
    '--accent-hover': '#1a8cd8',
    '--accent-subtle': 'rgba(29, 155, 240, 0.12)',
  },
  light: {
    name: 'Light',
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f7f9fa',
    '--bg-tertiary': '#eff3f4',
    '--bg-card': '#ffffff',
    '--bg-hover': '#e7ebec',
    '--text-primary': '#0f1419',
    '--text-secondary': '#536471',
    '--text-muted': '#8899a6',
    '--border-color': '#e1e8ed',
    '--border-light': '#cfd9de',
    '--accent-color': '#1d9bf0',
    '--accent-hover': '#1a8cd8',
    '--accent-subtle': 'rgba(29, 155, 240, 0.08)',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('taskflow-theme');
    return saved || 'dark';
  });

  useEffect(() => {
    const themeVars = themes[theme];
    const root = document.documentElement;

    Object.entries(themeVars).forEach(([key, value]) => {
      if (key.startsWith('--')) {
        root.style.setProperty(key, value);
      }
    });

    localStorage.setItem('taskflow-theme', theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
