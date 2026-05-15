import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeSettings, saveThemeSettings } from '../services/StorageService';
import type { ThemeSettings } from '../types';

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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeSettings = {
  backgroundType: 'solid',
  backgroundColor: '#0a0a0a',
  gradientColors: ['#1a1a2e', '#16213e', '#0f3460'],
  primaryColor: '#6c5ce7',
  accentColor: '#00cec9',
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
      backgroundColor: '#0a0a0a',
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
