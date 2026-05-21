import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeSettings, saveThemeSettings } from '../services/StorageService';
import type { ThemeSettings, ColorTheme } from '../types';

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
  setBackgroundBlur: (blur: number) => Promise<void>;
  setBackgroundImageFit: (fit: 'cover' | 'contain') => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setGradient: (colors: string[]) => Promise<void>;
  setColorTheme: (name: string) => Promise<void>;
  setDarkMode: (dark: boolean) => Promise<void>;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  primaryColor: string;
  backgroundOverlayColor: string;
  getAccentWithOpacity: (alpha: number) => string;
  availableColorThemes: ColorTheme[];
  currentColorThemeName: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_THEME: ThemeSettings = {
  backgroundType: 'solid',
  backgroundColor: '#06060B',
  gradientColors: ['#06060B', '#1D1D21', '#0a0a0f'],
  backgroundBlur: 20,
  backgroundImageFit: 'cover',
  primaryColor: '#C2FC4A',
  accentColor: '#C2FC4A',
};

const LIGHT_THEME: ThemeSettings = {
  backgroundType: 'solid',
  backgroundColor: '#F5F5F5',
  gradientColors: ['#E8E8E8', '#FFFFFF', '#F0F0F0'],
  backgroundBlur: 20,
  backgroundImageFit: 'cover',
  primaryColor: '#7C3AED',
  accentColor: '#7C3AED',
};

const AVAILABLE_THEMES = [
  { name: 'Midnight', primary: '#8b5cf6', background: '#0a0a0a', card: '#18181b', border: '#27272a', text: '#ffffff', muted: '#71717a' },
  { name: 'Forest', primary: '#22c55e', background: '#0a0f0a', card: '#141a14', border: '#1f2a1f', text: '#ffffff', muted: '#6b7b6b' },
  { name: 'Ocean', primary: '#06b6d4', background: '#0a0e12', card: '#141a22', border: '#1f2a36', text: '#ffffff', muted: '#6b7b8b' },
  { name: 'Sunset', primary: '#f472b6', background: '#120a0e', card: '#1e141a', border: '#2e1f26', text: '#ffffff', muted: '#8b6b7b' },
  { name: 'Lavender', primary: '#a78bfa', background: '#0e0a14', card: '#18142a', border: '#221f36', text: '#ffffff', muted: '#7b6b9b' },
  { name: 'Amber', primary: '#f59e0b', background: '#0f0d08', card: '#1a1610', border: '#2a2218', text: '#ffffff', muted: '#8b7b5b' },
  { name: 'Rose', primary: '#e11d48', background: '#120a0a', card: '#1e1414', border: '#2e1f1f', text: '#ffffff', muted: '#8b6b6b' },
  { name: 'Slate', primary: '#64748b', background: '#0a0a0c', card: '#14141a', border: '#1f1f2a', text: '#ffffff', muted: '#6b6b7b' },
  { name: 'Light', primary: '#7C3AED', background: '#F5F5F5', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', muted: '#6B7280' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DARK_THEME);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentColorThemeName, setCurrentColorThemeName] = useState('Midnight');

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    const settings = await getThemeSettings();
    if (settings && settings.backgroundType) {
      setTheme(settings);
      const bg = settings.backgroundColor || '#06060B';
      const isLight = bg === '#F5F5F5' || bg === '#ffffff' || bg.startsWith('#F') || bg.startsWith('#E8') || bg.startsWith('#f') || bg.startsWith('#e8');
      setIsDarkMode(!isLight);
    }
  }

  async function applyThemeSettings(settings: ThemeSettings) {
    setTheme(settings);
    await saveThemeSettings(settings);
  }

  async function updateTheme(settings: Partial<ThemeSettings>) {
    const updated = { ...theme, ...settings };
    await applyThemeSettings(updated);
  }

  async function setBackgroundImage(uri: string) {
    await updateTheme({ backgroundType: 'image', backgroundImageUri: uri });
  }

  async function clearBackgroundImage() {
    await updateTheme({ backgroundType: 'solid', backgroundColor: isDarkMode ? '#06060B' : '#F5F5F5', backgroundImageUri: undefined });
  }

  async function setBackgroundBlur(blur: number) {
    const clamped = Math.max(0, Math.min(100, blur));
    await updateTheme({ backgroundBlur: clamped });
  }

  async function setBackgroundImageFit(fit: 'cover' | 'contain') {
    await updateTheme({ backgroundImageFit: fit });
  }

  async function setAccentColor(color: string) {
    await updateTheme({ primaryColor: color, accentColor: color });
  }

  async function setGradient(colors: string[]) {
    await updateTheme({ backgroundType: 'gradient', gradientColors: colors });
  }

  async function setColorTheme(name: string) {
    const ct = AVAILABLE_THEMES.find((t) => t.name === name);
    if (!ct) return;
    setCurrentColorThemeName(ct.name);
    if (name === 'Light') {
      setIsDarkMode(false);
      await applyThemeSettings({
        ...LIGHT_THEME,
        primaryColor: ct.primary,
        accentColor: ct.primary,
        backgroundColor: ct.background,
      });
    } else {
      setIsDarkMode(true);
      await applyThemeSettings({
        ...DARK_THEME,
        primaryColor: ct.primary,
        accentColor: ct.primary,
        backgroundColor: ct.background,
      });
    }
  }

  async function setDarkMode(dark: boolean) {
    setIsDarkMode(dark);
    if (dark) {
      await applyThemeSettings({ ...DARK_THEME, ...theme, backgroundColor: '#06060B' });
    } else {
      await applyThemeSettings({ ...LIGHT_THEME, ...theme, backgroundColor: '#F5F5F5' });
    }
  }

  const textColor = isDarkMode ? '#ffffff' : '#111827';
  const mutedColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const cardBg = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
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
        setBackgroundBlur,
        setBackgroundImageFit,
        setAccentColor,
        setGradient,
        setColorTheme,
        setDarkMode,
        isDarkMode,
        textColor,
        mutedColor,
        cardBg,
        borderColor,
        primaryColor,
        backgroundOverlayColor,
        getAccentWithOpacity,
        availableColorThemes: AVAILABLE_THEMES,
        currentColorThemeName,
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
