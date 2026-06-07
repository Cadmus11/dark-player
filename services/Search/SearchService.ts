import { MMKV } from 'react-native-mmkv';
import type { FileItem, SavedSearch } from '../../types';

const storage = new MMKV({ id: 'search-cache' });
const HISTORY_KEY = '@search_history';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.]+/)
    .filter(Boolean);
}

export const SearchService = {
  search(query: string, files: FileItem[]): FileItem[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const queryTokens = tokenize(q);
    const scored = new Map<string, number>();

    for (const file of files) {
      let score = 0;
      const name = file.name.toLowerCase();
      const artist = (file.artist || '').toLowerCase();
      const album = (file.album || '').toLowerCase();
      const genre = (file.genre || '').toLowerCase();
      const year = file.year ? String(file.year) : '';

      if (name === q) score += 100;
      else if (name.startsWith(q)) score += 50;
      else if (name.includes(q)) score += 25;

      if (artist.includes(q)) score += 15;
      if (album.includes(q)) score += 10;
      if (genre.includes(q)) score += 8;
      if (year === q) score += 12;

      for (const token of queryTokens) {
        if (name.includes(token)) score += 5;
        if (artist.includes(token)) score += 3;
        if (album.includes(token)) score += 2;
        if (genre.includes(token)) score += 2;
        if (year.includes(token)) score += 2;
      }

      if (score > 0) scored.set(file.uri, score);
    }

    return files
      .filter((f) => scored.has(f.uri))
      .sort((a, b) => (scored.get(b.uri) || 0) - (scored.get(a.uri) || 0));
  },

  getHistory(): SavedSearch[] {
    try {
      const data = storage.getString(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHistory(query: string) {
    const history = this.getHistory();
    const trimmed = query.trim();
    if (!trimmed) return;
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
    storage.set(HISTORY_KEY, JSON.stringify(updated));
  },

  removeHistory(id: string) {
    const history = this.getHistory().filter((h) => h.id !== id);
    storage.set(HISTORY_KEY, JSON.stringify(history));
  },

  clearHistory() {
    storage.set(HISTORY_KEY, JSON.stringify([]));
  },
};
