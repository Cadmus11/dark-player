import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import type { FileItem, RecentlyPlayed } from '../types';

interface RecentsState {
  recentFiles: FileItem[];
  recentlyPlayed: RecentlyPlayed[];
  loaded: boolean;
  loadRecentFiles: () => Promise<void>;
  loadRecentlyPlayed: () => Promise<void>;
  addRecentFile: (file: FileItem) => Promise<void>;
  addRecentlyPlayed: (file: FileItem) => Promise<void>;
}

export const useRecentsStore = create<RecentsState>((set, get) => ({
  recentFiles: [],
  recentlyPlayed: [],
  loaded: false,

  loadRecentFiles: async () => {
    const recentFiles = await StorageService.getRecentFiles();
    set({ recentFiles, loaded: true });
  },

  loadRecentlyPlayed: async () => {
    const recentlyPlayed = await StorageService.getRecentlyPlayed();
    set({ recentlyPlayed, loaded: true });
  },

  addRecentFile: async (file: FileItem) => {
    await StorageService.addToRecentFiles(file);
    const recentFiles = await StorageService.getRecentFiles();
    set({ recentFiles });
  },

  addRecentlyPlayed: async (file: FileItem) => {
    await StorageService.addToRecentlyPlayed(file);
    const recentlyPlayed = await StorageService.getRecentlyPlayed();
    set({ recentlyPlayed });
  },
}));
