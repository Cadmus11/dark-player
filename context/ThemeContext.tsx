import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'nativewind';
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
  setBackgroundImage: (uri: string) => Promise<void>;
  clearBackgroundImage: () => Promise<void>;
  setBackgroundBlur: (blur: number) => Promise<void>;
  setBackgroundFit: (fit: 'cover' | 'contain') => Promise<void>;
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
  backgroundColor: '#F0F8FF',
  gradientColors: ['#F0F8FF', '#E8F0FE', '#D0E0F8'],
  backgroundBlur: 20,
  backgroundImageFit: 'cover',
  primaryColor: '#F97316',
  accentColor: '#F97316',
};

const AVAILABLE_THEMES = [
  {
    name: 'Midnight',
    primary: '#8b5cf6',
    background: '#0a0a0a',
    card: '#18181b',
    border: '#27272a',
    text: '#ffffff',
    muted: '#71717a',
  },
  {
    name: 'Forest',
    primary: '#22c55e',
    background: '#0a0f0a',
    card: '#141a14',
    border: '#1f2a1f',
    text: '#ffffff',
    muted: '#6b7b6b',
  },
  {
    name: 'Ocean',
    primary: '#06b6d4',
    background: '#0a0e12',
    card: '#141a22',
    border: '#1f2a36',
    text: '#ffffff',
    muted: '#6b7b8b',
  },
  {
    name: 'Sunset',
    primary: '#f472b6',
    background: '#120a0e',
    card: '#1e141a',
    border: '#2e1f26',
    text: '#ffffff',
    muted: '#8b6b7b',
  },
  {
    name: 'Lavender',
    primary: '#a78bfa',
    background: '#0e0a14',
    card: '#18142a',
    border: '#221f36',
    text: '#ffffff',
    muted: '#7b6b9b',
  },
  {
    name: 'Amber',
    primary: '#f59e0b',
    background: '#0f0d08',
    card: '#1a1610',
    border: '#2a2218',
    text: '#ffffff',
    muted: '#8b7b5b',
  },
  {
    name: 'Rose',
    primary: '#e11d48',
    background: '#120a0a',
    card: '#1e1414',
    border: '#2e1f1f',
    text: '#ffffff',
    muted: '#8b6b6b',
  },
  {
    name: 'Slate',
    primary: '#64748b',
    background: '#0a0a0c',
    card: '#14141a',
    border: '#1f1f2a',
    text: '#ffffff',
    muted: '#6b6b7b',
  },
  {
    name: 'Light',
    primary: '#F97316',
    background: '#F0F8FF',
    card: '#F4F4F5',
    border: '#D4D4D8',
    text: '#18181B',
    muted: '#71717A',
  },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
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
      const lightBgs = ['#F0F8FF', '#F5F5F5', '#ffffff'];
      const isLight = lightBgs.some((l) => bg === l) || /^#[FfEeBb].{5}/.test(bg);
      setIsDarkMode(!isLight);
      setColorScheme(isLight ? 'light' : 'dark');
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
      setColorScheme('light');
      await applyThemeSettings({
        ...LIGHT_THEME,
        primaryColor: ct.primary,
        accentColor: ct.primary,
        backgroundColor: ct.background,
      });
    } else {
      setIsDarkMode(true);
      setColorScheme('dark');
      await applyThemeSettings({
        ...DARK_THEME,
        primaryColor: ct.primary,
        accentColor: ct.primary,
        backgroundColor: ct.background,
      });
    }
  }

  async function setBackgroundImage(uri: string) {
    await updateTheme({ backgroundImageUri: uri, backgroundType: 'solid' });
  }

  async function clearBackgroundImage() {
    await updateTheme({ backgroundImageUri: undefined, backgroundBlur: 0 });
  }

  async function setBackgroundBlur(blur: number) {
    await updateTheme({ backgroundBlur: Math.max(0, Math.min(100, blur)) });
  }

  async function setBackgroundFit(fit: 'cover' | 'contain') {
    await updateTheme({ backgroundImageFit: fit });
  }

  async function setDarkMode(dark: boolean) {
    setIsDarkMode(dark);
    setColorScheme(dark ? 'dark' : 'light');
    if (dark) {
      await applyThemeSettings({ ...DARK_THEME, ...theme, backgroundColor: '#06060B' });
    } else {
      await applyThemeSettings({ ...LIGHT_THEME, ...theme, backgroundColor: '#F0F8FF' });
    }
  }

  const textColor = isDarkMode ? '#ffffff' : '#18181B';
  const mutedColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#71717A';
  const cardBg = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#F4F4F5';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#D4D4D8';
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
        setAccentColor,
        setGradient,
        setColorTheme,
        setDarkMode,
        setBackgroundImage,
        clearBackgroundImage,
        setBackgroundBlur,
        setBackgroundFit,
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
      }}>
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
