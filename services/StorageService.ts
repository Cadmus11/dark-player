import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  copyAsync,
} from 'expo-file-system/legacy';
import type {
  ThemeSettings,
  FileItem,
  Playlist,
  RecentlyPlayed,
  SavedSearch,
  RecentlyDeleted,
  PlaybackSettings,
  NotificationSettings,
  SleepTimerSettings,
  HiddenFilesSettings,
} from '../types';

const settingsStorage = new MMKV({ id: 'settings' });
const TRASH_DIR = (cacheDirectory || '') + 'trash/';

const KEYS = {
  THEME: '@lumora_theme',
  RECENT: '@lumora_recent',
  RECENTLY_PLAYED: '@lumora_recently_played',
  FAVORITES: '@lumora_favorites',
  PLAYLISTS: '@lumora_playlists',
  SEARCH_HISTORY: '@lumora_search_history',
  PERMISSIONS: '@lumora_permissions_granted',
  RECENTLY_DELETED: '@lumora_recently_deleted',
  TRASH_FILES: '@lumora_trash_files',
} as const;

export const StorageService = {
  // Theme
  async getThemeSettings(): Promise<ThemeSettings> {
    try {
      const stored = await AsyncStorage.getItem(KEYS.THEME);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      colorThemeKey: 'obsidian',
      backgroundBlur: 20,
      backgroundImageFit: 'cover',
      backgroundMode: 'fill',
      backgroundBrightness: 50,
      sizeMode: 'medium',
    };
  },
  async saveThemeSettings(settings: ThemeSettings): Promise<void> {
    await AsyncStorage.setItem(KEYS.THEME, JSON.stringify(settings));
  },

  // Recent Files
  async getRecentFiles(): Promise<FileItem[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.RECENT);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
  async addToRecentFiles(file: FileItem): Promise<void> {
    const recent = await this.getRecentFiles();
    const updated = [file, ...recent.filter((f) => f.uri !== file.uri)].slice(0, 50);
    await AsyncStorage.setItem(KEYS.RECENT, JSON.stringify(updated));
  },

  // Recently Played
  async getRecentlyPlayed(): Promise<RecentlyPlayed[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.RECENTLY_PLAYED);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
  async addToRecentlyPlayed(file: FileItem): Promise<void> {
    const recent = await this.getRecentlyPlayed();
    const existing = recent.find((r) => r.file.uri === file.uri);
    let updated: RecentlyPlayed[];
    if (existing) {
      updated = recent
        .map((r) =>
          r.file.uri === file.uri
            ? { ...r, lastPlayedAt: Date.now(), playCount: r.playCount + 1 }
            : r
        )
        .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    } else {
      updated = [{ file, lastPlayedAt: Date.now(), playCount: 1 }, ...recent].slice(0, 100);
    }
    await AsyncStorage.setItem(KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
  },

  // Favorites
  async getFavorites(): Promise<string[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.FAVORITES);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
  async toggleFavorite(uri: string): Promise<string[]> {
    const favorites = await this.getFavorites();
    const index = favorites.indexOf(uri);
    const updated = index >= 0 ? favorites.filter((_, i) => i !== index) : [...favorites, uri];
    await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  },

  // Search History
  async getSearchHistory(): Promise<SavedSearch[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.SEARCH_HISTORY);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
  async saveSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) return;
    const history = await this.getSearchHistory();
    const existing = history.find((h) => h.query.toLowerCase() === trimmed.toLowerCase());
    let updated: SavedSearch[];
    if (existing) {
      updated = history
        .map((h) =>
          h.query.toLowerCase() === trimmed.toLowerCase() ? { ...h, timestamp: Date.now() } : h
        )
        .sort((a, b) => b.timestamp - a.timestamp);
    } else {
      updated = [
        { id: Date.now().toString(), query: trimmed, timestamp: Date.now() },
        ...history,
      ].slice(0, 30);
    }
    await AsyncStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(updated));
  },
  async removeSearch(id: string): Promise<void> {
    const history = await this.getSearchHistory();
    await AsyncStorage.setItem(
      KEYS.SEARCH_HISTORY,
      JSON.stringify(history.filter((h) => h.id !== id))
    );
  },
  async clearSearchHistory(): Promise<void> {
    await AsyncStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify([]));
  },

  // Permissions
  async getPermissionsGranted(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEYS.PERMISSIONS)) === 'true';
    } catch {
      return false;
    }
  },
  async setPermissionsGranted(value: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.PERMISSIONS, value ? 'true' : 'false');
  },

  // Recently Deleted
  async getRecentlyDeleted(): Promise<RecentlyDeleted[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.RECENTLY_DELETED);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
  async addToRecentlyDeleted(file: FileItem): Promise<void> {
    const deleted = await this.getRecentlyDeleted();
    await AsyncStorage.setItem(
      KEYS.RECENTLY_DELETED,
      JSON.stringify([{ file, deletedAt: Date.now() }, ...deleted].slice(0, 50))
    );
  },
  async removeFromRecentlyDeleted(uri: string): Promise<void> {
    const deleted = await this.getRecentlyDeleted();
    await AsyncStorage.setItem(
      KEYS.RECENTLY_DELETED,
      JSON.stringify(deleted.filter((d) => d.file.uri !== uri))
    );
  },
  async clearRecentlyDeleted(): Promise<void> {
    await AsyncStorage.setItem(KEYS.RECENTLY_DELETED, JSON.stringify([]));
  },

  // Trash operations: backup file before deletion for later restore
  async ensureTrashDir(): Promise<void> {
    try {
      const info = await getInfoAsync(TRASH_DIR);
      if (!info.exists) {
        await makeDirectoryAsync(TRASH_DIR);
      }
    } catch {}
  },

  async moveToTrash(file: FileItem): Promise<string | null> {
    await this.ensureTrashDir();
    const trashName = Date.now() + '_' + file.name;
    const trashUri = TRASH_DIR + trashName;
    try {
      await copyAsync({ from: file.uri, to: trashUri });
      const trashFiles = await this._getTrashFiles();
      trashFiles.push({ originalUri: file.uri, trashUri, fileName: file.name });
      await AsyncStorage.setItem(KEYS.TRASH_FILES, JSON.stringify(trashFiles));
      try {
        await deleteAsync(file.uri, { idempotent: true });
      } catch {}
      return trashUri;
    } catch {
      return null;
    }
  },

  async restoreFromTrash(originalUri: string): Promise<boolean> {
    const trashFiles = await this._getTrashFiles();
    const entry = trashFiles.find((t: any) => t.originalUri === originalUri);
    if (!entry) return false;
    try {
      await copyAsync({ from: entry.trashUri, to: originalUri });
      try {
        await deleteAsync(entry.trashUri, { idempotent: true });
      } catch {}
      const updated = trashFiles.filter((t: any) => t.originalUri !== originalUri);
      await AsyncStorage.setItem(KEYS.TRASH_FILES, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  async permanentlyDeleteTrashFile(originalUri: string): Promise<void> {
    const trashFiles = await this._getTrashFiles();
    const entry = trashFiles.find((t: any) => t.originalUri === originalUri);
    if (entry) {
      try {
        await deleteAsync(entry.trashUri, { idempotent: true });
      } catch {}
    }
    const updated = trashFiles.filter((t: any) => t.originalUri !== originalUri);
    await AsyncStorage.setItem(KEYS.TRASH_FILES, JSON.stringify(updated));
  },

  async _getTrashFiles(): Promise<any[]> {
    try {
      const d = await AsyncStorage.getItem(KEYS.TRASH_FILES);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },
};

// Legacy playback settings (kept for SettingsScreen compatibility)
export async function getPlaybackSettings(): Promise<PlaybackSettings> {
  return {
    playWithOtherApps: false,
    crossFade: false,
    crossFadeDuration: 3,
    gaplessPlayback: true,
  };
}
export async function savePlaybackSettings(s: PlaybackSettings): Promise<void> {
  /* kept for compat */
}
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = settingsStorage.getString('@settings_notifications');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { newMediaNotification: true, pushNotification: true };
}
export async function saveNotificationSettings(s: NotificationSettings): Promise<void> {
  settingsStorage.set('@settings_notifications', JSON.stringify(s));
}
export async function getSleepTimerSettings(): Promise<SleepTimerSettings> {
  return { enabled: false, mode: 'off', minutes: 30, playOneToEnd: false };
}
export async function saveSleepTimerSettings(s: SleepTimerSettings): Promise<void> {
  /* kept for compat */
}
export async function getRemoveAds(): Promise<boolean> {
  return false;
}
export async function setRemoveAds(v: boolean): Promise<void> {
  /* kept for compat */
}

// Backward-compatible named exports
export const getThemeSettings = () => StorageService.getThemeSettings();
export const saveThemeSettings = (s: ThemeSettings) => StorageService.saveThemeSettings(s);
export const getRecentFiles = () => StorageService.getRecentFiles();
export const addToRecentFiles = (f: FileItem) => StorageService.addToRecentFiles(f);
export const getRecentlyPlayed = () => StorageService.getRecentlyPlayed();
export const addToRecentlyPlayed = (f: FileItem) => StorageService.addToRecentlyPlayed(f);
export const getFavorites = () => StorageService.getFavorites();
export const toggleFavorite = (u: string) => StorageService.toggleFavorite(u);
export const getSearchHistory = () => StorageService.getSearchHistory();
export const saveSearch = (q: string) => StorageService.saveSearch(q);
export const removeSearch = (id: string) => StorageService.removeSearch(id);
export const clearSearchHistory = () => StorageService.clearSearchHistory();
export const getPermissionsGranted = () => StorageService.getPermissionsGranted();
export const setPermissionsGranted = (v: boolean) => StorageService.setPermissionsGranted(v);
export const getRecentlyDeleted = () => StorageService.getRecentlyDeleted();
export const addToRecentlyDeleted = (f: FileItem) => StorageService.addToRecentlyDeleted(f);
export const removeFromRecentlyDeleted = (u: string) => StorageService.removeFromRecentlyDeleted(u);
export const restoreFromRecentlyDeleted = (u: string) => StorageService.restoreFromTrash(u);
export const clearRecentlyDeleted = () => StorageService.clearRecentlyDeleted();
export const moveToTrash = (f: FileItem) => StorageService.moveToTrash(f);
export const restoreFromTrash = (u: string) => StorageService.restoreFromTrash(u);
export const permanentlyDeleteTrashFile = (u: string) =>
  StorageService.permanentlyDeleteTrashFile(u);
