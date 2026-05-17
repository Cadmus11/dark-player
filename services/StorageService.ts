import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeSettings, FileItem } from '../types';

const STORAGE_KEYS = {
  THEME_SETTINGS: '@dark_manager_theme',
  RECENT_FILES: '@dark_manager_recent',
  FAVORITES: '@dark_manager_favorites',
  PLAYLISTS: '@dark_manager_playlists',
  MUSIC_QUEUE: '@dark_manager_music_queue',
} as const;

export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.THEME_SETTINGS);
    if (stored) return JSON.parse(stored);
  } catch {}

  return {
    backgroundType: 'solid',
    backgroundColor: '#06060B',
    gradientColors: ['#06060B', '#1D1D21'],
    primaryColor: '#C2FC4A',
    accentColor: '#C2FC4A',
  };
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.THEME_SETTINGS, JSON.stringify(settings));
}

export async function getRecentFiles(): Promise<FileItem[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function addToRecentFiles(file: FileItem): Promise<void> {
  const recent = await getRecentFiles();
  const filtered = recent.filter((f) => f.uri !== file.uri);
  const updated = [file, ...filtered].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated));
}

export async function getFavorites(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(uri: string): Promise<string[]> {
  const favorites = await getFavorites();
  const index = favorites.indexOf(uri);
  const updated =
    index >= 0 ? favorites.filter((_, i) => i !== index) : [...favorites, uri];
  await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

export async function isFavorite(uri: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(uri);
}
