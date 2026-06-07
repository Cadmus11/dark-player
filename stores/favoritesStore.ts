import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

interface FavoritesState {
  favoriteUris: string[];
  loaded: boolean;
  load: () => Promise<void>;
  toggleFavorite: (uri: string) => Promise<void>;
  isFavorite: (uri: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteUris: [],
  loaded: false,

  load: async () => {
    const favorites = await StorageService.getFavorites();
    set({ favoriteUris: favorites, loaded: true });
  },

  toggleFavorite: async (uri: string) => {
    const prev = get().favoriteUris;
    const next = prev.includes(uri) ? prev.filter((u) => u !== uri) : [...prev, uri];
    set({ favoriteUris: next });
    try {
      const updated = await StorageService.toggleFavorite(uri);
      set({ favoriteUris: updated });
    } catch {
      set({ favoriteUris: prev });
    }
  },

  isFavorite: (uri: string) => get().favoriteUris.includes(uri),
}));
