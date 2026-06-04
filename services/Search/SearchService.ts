import { MMKV } from 'react-native-mmkv';
import type { FileItem, SavedSearch } from '../../types';

const storage = new MMKV({ id: 'search-cache' });
const HISTORY_KEY = '@search_history';
const INDEX_KEY = '@search_index';

interface SearchIndex {
  terms: Record<string, string[]>; // term -> file URIs
}

let searchIndex: SearchIndex = { terms: {} };
let searchIndexLoaded = false;

function loadIndex() {
  if (searchIndexLoaded) return;
  try {
    const data = storage.getString(INDEX_KEY);
    if (data) searchIndex = JSON.parse(data);
  } catch (e) { console.warn('[SearchService]', e); }
  searchIndexLoaded = true;
}

function saveIndex() {
  storage.set(INDEX_KEY, JSON.stringify(searchIndex));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.]+/)
    .filter(Boolean);
}

export const SearchService = {
  buildIndex(files: FileItem[]) {
    loadIndex();
    searchIndex = { terms: {} };
    for (const file of files) {
      const tokens = tokenize(file.name);
      if (file.artist) tokens.push(...tokenize(file.artist));
      if (file.album) tokens.push(...tokenize(file.album));
      if (file.genre) tokens.push(...tokenize(file.genre));
      if (file.year) tokens.push(...tokenize(String(file.year)));
      for (const token of tokens) {
        if (!searchIndex.terms[token]) searchIndex.terms[token] = [];
        if (!searchIndex.terms[token].includes(file.uri)) {
          searchIndex.terms[token].push(file.uri);
        }
      }
    }
    saveIndex();
  },

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

  // Search history
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

  clearIndex() {
    searchIndex = { terms: {} };
    storage.delete(INDEX_KEY);
    searchIndexLoaded = false;
  },
};
