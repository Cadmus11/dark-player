import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'nativewind';
import { getThemeSettings, saveThemeSettings } from '../services/StorageService';
import type { ThemeSettings, ColorTheme, ColorThemeGroup, LayoutSize } from '../types';

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
  setPresetImage: (key: string | null) => Promise<void>;
  setBackgroundBlur: (blur: number) => Promise<void>;
  setBackgroundFit: (fit: 'cover' | 'contain') => Promise<void>;
  setSizeMode: (mode: LayoutSize) => Promise<void>;
  getAccentWithOpacity: (alpha: number) => string;
  availableColorThemes: ColorTheme[];
  availableThemeGroups: ColorThemeGroup[];
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
  sizeMode: 'medium',
};

const LIGHT_THEME: ThemeSettings = {
  backgroundType: 'solid',
  backgroundColor: '#F0F8FF',
  gradientColors: ['#F0F8FF', '#E8F0FE', '#D0E0F8'],
  backgroundBlur: 20,
  backgroundImageFit: 'cover',
  primaryColor: '#F97316',
  accentColor: '#F97316',
  sizeMode: 'medium',
};

const AVAILABLE_THEME_GROUPS: ColorThemeGroup[] = [
  {
    name: 'Dark',
    themes: [
      { name: 'Midnight', group: 'Dark', primary: '#8b5cf6', background: '#0a0a0a', card: '#18181b', border: '#27272a', text: '#ffffff', muted: '#71717a' },
      { name: 'Slate', group: 'Dark', primary: '#64748b', background: '#0a0a0c', card: '#14141a', border: '#1f1f2a', text: '#ffffff', muted: '#6b6b7b' },
      { name: 'Obsidian', group: 'Dark', primary: '#14b8a6', background: '#080c0c', card: '#121a1a', border: '#1f2a2a', text: '#ffffff', muted: '#6b8b85' },
    ],
  },
  {
    name: 'Vibrant',
    themes: [
      { name: 'Rose', group: 'Vibrant', primary: '#e11d48', background: '#120a0a', card: '#1e1414', border: '#2e1f1f', text: '#ffffff', muted: '#8b6b6b' },
      { name: 'Sunset', group: 'Vibrant', primary: '#f472b6', background: '#120a0e', card: '#1e141a', border: '#2e1f26', text: '#ffffff', muted: '#8b6b7b' },
      { name: 'Amber', group: 'Vibrant', primary: '#f59e0b', background: '#0f0d08', card: '#1a1610', border: '#2a2218', text: '#ffffff', muted: '#8b7b5b' },
      { name: 'Gold', group: 'Vibrant', primary: '#eab308', background: '#100d06', card: '#1a1608', border: '#2a2208', text: '#ffffff', muted: '#8b7b4b' },
    ],
  },
  {
    name: 'Nature',
    themes: [
      { name: 'Forest', group: 'Nature', primary: '#22c55e', background: '#0a0f0a', card: '#141a14', border: '#1f2a1f', text: '#ffffff', muted: '#6b7b6b' },
      { name: 'Ocean', group: 'Nature', primary: '#06b6d4', background: '#0a0e12', card: '#141a22', border: '#1f2a36', text: '#ffffff', muted: '#6b7b8b' },
      { name: 'Emerald', group: 'Nature', primary: '#10b981', background: '#080e0a', card: '#121a14', border: '#1f2a22', text: '#ffffff', muted: '#6b8b75' },
    ],
  },
  {
    name: 'Soft',
    themes: [
      { name: 'Lavender', group: 'Soft', primary: '#a78bfa', background: '#0e0a14', card: '#18142a', border: '#221f36', text: '#ffffff', muted: '#7b6b9b' },
      { name: 'Coral', group: 'Soft', primary: '#fb7185', background: '#120a0c', card: '#1a1416', border: '#2a1f22', text: '#ffffff', muted: '#8b6b73' },
    ],
  },
  {
    name: 'Light',
    themes: [
      { name: 'Light', group: 'Light', primary: '#F97316', background: '#F0F8FF', card: '#F4F4F5', border: '#D4D4D8', text: '#18181B', muted: '#71717A' },
      { name: 'Pearl', group: 'Light', primary: '#6366f1', background: '#f8fafc', card: '#f1f5f9', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' },
    ],
  },
];

const AVAILABLE_THEMES: ColorTheme[] = AVAILABLE_THEME_GROUPS.flatMap((g) => g.themes);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme();
  const [theme, setTheme] = useState<ThemeSettings>(DARK_THEME);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentColorThemeName, setCurrentColorThemeName] = useState('Midnight');

  useEffect(() => {
    (async () => {
      const settings = await getThemeSettings();
      if (settings && settings.backgroundType) {
        setTheme(settings);
        const bg = settings.backgroundColor || '#06060B';
        const lightBgs = ['#F0F8FF', '#F5F5F5', '#ffffff'];
        const isLight = lightBgs.some((l) => bg === l) || /^#[FfEeBb].{5}/.test(bg);
        setIsDarkMode(!isLight);
        setColorScheme(isLight ? 'light' : 'dark');
      }
    })();
  }, [setColorScheme]);

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
    await updateTheme({
      backgroundType: 'gradient',
      gradientColors: colors,
      backgroundImageUri: undefined,
      presetImageKey: undefined,
    });
  }

  async function setColorTheme(name: string) {
    const ct = AVAILABLE_THEMES.find((t) => t.name === name);
    if (!ct) return;
    setCurrentColorThemeName(ct.name);
    const isLight = ct.group === 'Light';
    setIsDarkMode(!isLight);
    setColorScheme(isLight ? 'light' : 'dark');
    await applyThemeSettings({
      ...(isLight ? LIGHT_THEME : DARK_THEME),
      primaryColor: ct.primary,
      accentColor: ct.primary,
      backgroundColor: ct.background,
    });
  }

  async function setBackgroundImage(uri: string) {
    await updateTheme({
      backgroundImageUri: uri,
      backgroundType: 'solid',
      gradientColors: undefined,
      presetImageKey: undefined,
    });
  }

  async function clearBackgroundImage() {
    await updateTheme({
      backgroundImageUri: undefined,
      presetImageKey: undefined,
      gradientColors: undefined,
      backgroundBlur: 0,
    });
  }

  async function setPresetImage(key: string | null) {
    if (key) {
      await updateTheme({
        presetImageKey: key,
        backgroundImageUri: undefined,
        gradientColors: undefined,
        backgroundBlur: 20,
      });
    } else {
      await updateTheme({ presetImageKey: undefined, gradientColors: undefined });
    }
  }

  async function setBackgroundBlur(blur: number) {
    await updateTheme({ backgroundBlur: Math.max(0, Math.min(100, blur)) });
  }

  async function setBackgroundFit(fit: 'cover' | 'contain') {
    await updateTheme({ backgroundImageFit: fit });
  }

  async function setSizeMode(mode: LayoutSize) {
    await updateTheme({ sizeMode: mode });
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
        setPresetImage,
        setBackgroundBlur,
        setBackgroundFit,
        setSizeMode,
        isDarkMode,
        textColor,
        mutedColor,
        cardBg,
        borderColor,
        primaryColor,
        backgroundOverlayColor,
        getAccentWithOpacity,
        availableColorThemes: AVAILABLE_THEMES,
        availableThemeGroups: AVAILABLE_THEME_GROUPS,
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
