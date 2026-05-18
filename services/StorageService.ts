import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeSettings, FileItem, Playlist, RecentlyPlayed, SavedSearch } from '../types';

const STORAGE_KEYS = {
  THEME_SETTINGS: '@lumora_theme',
  RECENT_FILES: '@lumora_recent',
  RECENTLY_PLAYED: '@lumora_recently_played',
  FAVORITES: '@lumora_favorites',
  PLAYLISTS: '@lumora_playlists',
  SEARCH_HISTORY: '@lumora_search_history',
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

export async function getRecentlyPlayed(): Promise<RecentlyPlayed[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function addToRecentlyPlayed(file: FileItem): Promise<void> {
  const recent = await getRecentlyPlayed();
  const existing = recent.find((r) => r.file.uri === file.uri);
  let updated: RecentlyPlayed[];
  if (existing) {
    updated = recent
      .map((r) =>
        r.file.uri === file.uri ? { ...r, lastPlayedAt: Date.now(), playCount: r.playCount + 1 } : r
      )
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  } else {
    updated = [{ file, lastPlayedAt: Date.now(), playCount: 1 }, ...recent].slice(0, 100);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
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

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
}

export async function createPlaylist(name: string, coverUri?: string): Promise<Playlist> {
  const playlists = await getPlaylists();
  const newPlaylist: Playlist = {
    id: Date.now().toString(),
    name,
    coverUri,
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const updated = [...playlists, newPlaylist];
  await savePlaylists(updated);
  return newPlaylist;
}

export async function updatePlaylistCover(playlistId: string, coverUri: string): Promise<Playlist[]> {
  const playlists = await getPlaylists();
  const updated = playlists.map((p) =>
    p.id === playlistId ? { ...p, coverUri, updatedAt: Date.now() } : p
  );
  await savePlaylists(updated);
  return updated;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const playlists = await getPlaylists();
  const updated = playlists.filter((p) => p.id !== playlistId);
  await savePlaylists(updated);
}

export async function getSearchHistory(): Promise<SavedSearch[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = await getSearchHistory();
  const existing = history.find((h) => h.query.toLowerCase() === trimmed.toLowerCase());
  let updated: SavedSearch[];
  if (existing) {
    updated = history
      .map((h) =>
        h.query.toLowerCase() === trimmed.toLowerCase() ? { ...h, timestamp: Date.now() } : h
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  } else {
    updated = [{ id: Date.now().toString(), query: trimmed, timestamp: Date.now() }, ...history].slice(0, 30);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
}

export async function removeSearch(searchId: string): Promise<void> {
  const history = await getSearchHistory();
  const updated = history.filter((h) => h.id !== searchId);
  await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify([]));
}
