import { MMKV } from 'react-native-mmkv';
import type { FileItem, HistoryEntry } from '../../types';

const storage = new MMKV({ id: 'play-history' });
const HISTORY_KEY = '@play_history';
const MAX_HISTORY = 200;

export const HistoryService = {
  getAll(): HistoryEntry[] {
    try {
      const data = storage.getString(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  record(file: FileItem, duration: number, source: 'music' | 'video' | 'audio') {
    const history = this.getAll();
    const entry: HistoryEntry = {
      file: { ...file },
      playedAt: Date.now(),
      playDuration: duration,
      source,
    };
    const filtered = history.filter((h) => h.file.uri !== file.uri);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    storage.set(HISTORY_KEY, JSON.stringify(updated));
  },

  getRecentlyPlayed(limit = 20): HistoryEntry[] {
    return this.getAll().slice(0, limit);
  },

  getMostPlayed(limit = 20): { file: FileItem; count: number }[] {
    const history = this.getAll();
    const countMap = new Map<string, { file: FileItem; count: number }>();
    for (const entry of history) {
      const existing = countMap.get(entry.file.uri);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(entry.file.uri, { file: entry.file, count: 1 });
      }
    }
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  getContinueListening(): HistoryEntry[] {
    return this.getAll().filter((h) => h.source === 'music').slice(0, 10);
  },

  getContinueWatching(): HistoryEntry[] {
    return this.getAll().filter((h) => h.source === 'video').slice(0, 10);
  },

  clearHistory() {
    storage.set(HISTORY_KEY, JSON.stringify([]));
  },
};
