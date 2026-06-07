import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import type { SavedSearch } from '../types';

interface SearchHistoryState {
  searchHistory: SavedSearch[];
  loaded: boolean;
  load: () => Promise<void>;
  saveSearch: (query: string) => Promise<void>;
  removeSearch: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  searchHistory: [],
  loaded: false,

  load: async () => {
    const searchHistory = await StorageService.getSearchHistory();
    set({ searchHistory, loaded: true });
  },

  saveSearch: async (query: string) => {
    await StorageService.saveSearch(query);
    const searchHistory = await StorageService.getSearchHistory();
    set({ searchHistory });
  },

  removeSearch: async (id: string) => {
    const prev = get().searchHistory;
    set({ searchHistory: prev.filter((h) => h.id !== id) });
    try {
      await StorageService.removeSearch(id);
      const searchHistory = await StorageService.getSearchHistory();
      set({ searchHistory });
    } catch {
      set({ searchHistory: prev });
    }
  },

  clearSearchHistory: async () => {
    const prev = get().searchHistory;
    set({ searchHistory: [] });
    try {
      await StorageService.clearSearchHistory();
    } catch {
      set({ searchHistory: prev });
    }
  },
}));
