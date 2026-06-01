import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'nativewind';
import { getThemeSettings, saveThemeSettings } from '../services/StorageService';
import type { ThemeSettings, ColorThemePreset, LayoutSize } from '../types';
import { THEME_PRESETS } from '../types';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isColorDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (settings: Partial<ThemeSettings>) => Promise<void>;
  setColorTheme: (key: string) => Promise<void>;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  primaryColor: string;
  backgroundColor: string;
  backgroundOverlayColor: string;
  setBackgroundImage: (uri: string) => Promise<void>;
  clearBackgroundImage: () => Promise<void>;
  setBackgroundBlur: (blur: number) => Promise<void>;
  setBackgroundFit: (fit: 'cover' | 'contain') => Promise<void>;
  setBackgroundMode: (mode: 'fill' | 'wallpaper' | 'spotlight') => Promise<void>;
  setBackgroundBrightness: (brightness: number) => Promise<void>;
  setSizeMode: (mode: LayoutSize) => Promise<void>;
  getAccentWithOpacity: (alpha: number) => string;
  currentThemeKey: string;
  themePresets: ColorThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeSettings = {
  colorThemeKey: 'obsidian',
  backgroundBlur: 20,
  backgroundImageFit: 'cover',
  backgroundMode: 'fill',
  backgroundBrightness: 50,
  sizeMode: 'medium',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [currentThemeKey, setCurrentThemeKey] = useState('obsidian');

  useEffect(() => {
    (async () => {
      const settings = await getThemeSettings();
      if (settings) {
        setTheme(settings);
        setCurrentThemeKey(settings.colorThemeKey || 'obsidian');
        const preset = THEME_PRESETS.find((t) => t.key === (settings.colorThemeKey || 'obsidian'));
        if (preset) {
          const dark = isColorDark(preset.background);
          setColorScheme(dark ? 'dark' : 'light');
        }
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

  async function setColorTheme(key: string) {
    const preset = THEME_PRESETS.find((t) => t.key === key);
    if (!preset) return;
    setCurrentThemeKey(preset.key);
    const dark = isColorDark(preset.background);
    setColorScheme(dark ? 'dark' : 'light');
    await applyThemeSettings({ ...theme, colorThemeKey: preset.key });
  }

  async function setBackgroundImage(uri: string) {
    await updateTheme({ backgroundImageUri: uri });
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

  async function setBackgroundMode(mode: 'fill' | 'wallpaper' | 'spotlight') {
    await updateTheme({ backgroundMode: mode });
  }

  async function setBackgroundBrightness(brightness: number) {
    await updateTheme({ backgroundBrightness: Math.max(0, Math.min(100, brightness)) });
  }

  async function setSizeMode(mode: LayoutSize) {
    await updateTheme({ sizeMode: mode });
  }

  const preset = THEME_PRESETS.find((t) => t.key === currentThemeKey) || THEME_PRESETS[0];
  const dark = isColorDark(preset.background);
  const textColor = preset.text;
  const mutedColor = hexToRgba(preset.text, 0.5);
  const cardBg = preset.surface;
  const borderColor = hexToRgba(preset.text, 0.08);
  const primaryColor = preset.accent;
  const backgroundColor = preset.background;
  const backgroundOverlayColor = hexToRgba(preset.accent, 0.7);

  function getAccentWithOpacity(alpha: number): string {
    return hexToRgba(preset.accent, alpha);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        setColorTheme,
        setBackgroundImage,
        clearBackgroundImage,
        setBackgroundBlur,
        setBackgroundFit,
        setBackgroundMode,
        setBackgroundBrightness,
        setSizeMode,
        isDarkMode: dark,
        textColor,
        mutedColor,
        cardBg,
        borderColor,
        primaryColor,
        backgroundColor,
        backgroundOverlayColor,
        getAccentWithOpacity,
        currentThemeKey,
        themePresets: THEME_PRESETS,
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
