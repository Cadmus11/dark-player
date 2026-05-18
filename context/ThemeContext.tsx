import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeSettings, saveThemeSettings } from '../services/StorageService';
import type { ThemeSettings } from '../types';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (settings: Partial<ThemeSettings>) => Promise<void>;
  setBackgroundImage: (uri: string) => Promise<void>;
  clearBackgroundImage: () => Promise<void>;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  primaryColor: string;
  backgroundOverlayColor: string;
  getAccentWithOpacity: (alpha: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeSettings = {
  backgroundType: 'solid',
  backgroundColor: '#06060B',
  gradientColors: ['#06060B', '#1D1D21', '#0a0a0f'],
  primaryColor: '#C2FC4A',
  accentColor: '#C2FC4A',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    const settings = await getThemeSettings();
    setTheme(settings);
  }

  async function updateTheme(settings: Partial<ThemeSettings>) {
    const updated = { ...theme, ...settings };
    setTheme(updated);
    await saveThemeSettings(updated);
  }

  async function setBackgroundImage(uri: string) {
    const updated = {
      ...theme,
      backgroundType: 'image' as const,
      backgroundImageUri: uri,
    };
    setTheme(updated);
    await saveThemeSettings(updated);
  }

  async function clearBackgroundImage() {
    const updated = {
      ...theme,
      backgroundType: 'solid' as const,
      backgroundColor: '#06060B',
      backgroundImageUri: undefined,
    };
    setTheme(updated);
    await saveThemeSettings(updated);
  }

  const isDarkMode = true;

  const textColor = '#ffffff';
  const mutedColor = 'rgba(255, 255, 255, 0.5)';
  const cardBg = 'rgba(255, 255, 255, 0.06)';
  const borderColor = 'rgba(255, 255, 255, 0.08)';
  const primaryColor = theme.primaryColor;
  const backgroundOverlayColor = hexToRgba(theme.primaryColor, 0.7);

  function getAccentWithOpacity(alpha: number): string {
    return hexToRgba(theme.primaryColor, alpha);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        setBackgroundImage,
        clearBackgroundImage,
        isDarkMode,
        textColor,
        mutedColor,
        cardBg,
        borderColor,
        primaryColor,
        backgroundOverlayColor,
        getAccentWithOpacity,
      }}
    >
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
