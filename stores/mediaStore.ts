import { create } from 'zustand';
import type { FileItem, HiddenFilesSettings } from '../types';
import { fileEngine } from '../engine/FileEngine';

interface MediaStoreState {
  videos: FileItem[];
  audio: FileItem[];

  loading: boolean;
  scanProgress: number;
  scanStage: string;
  permissionsGranted: boolean;
  error: string | null;

  scanMedia: () => Promise<void>;
  loadCache: () => void;
  setPermissionsGranted: (granted: boolean) => void;
  setLoading: (loading: boolean) => void;
  getFilteredAudio: (settings: HiddenFilesSettings) => FileItem[];
  getHiddenAudio: (settings: HiddenFilesSettings) => FileItem[];
}

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  videos: [],
  audio: [],
  loading: false,
  scanProgress: 0,
  scanStage: '',
  permissionsGranted: false,
  error: null,

  loadCache: () => {
    const cached = fileEngine.loadFromCache();
    set({
      videos: cached.videos,
      audio: cached.audio,
      loading: false,
    });
  },

  scanMedia: async () => {
    set({ loading: true, error: null });
    try {
      const result = await fileEngine.scanAll((progress, stage) => {
        set({ scanProgress: progress, scanStage: stage });
      });
      set({
        videos: result.videos,
        audio: result.audio,
        loading: false,
        permissionsGranted: true,
        scanProgress: 1,
      });
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message || 'Failed to scan media',
      });
    }
  },

  setPermissionsGranted: (granted) => set({ permissionsGranted: granted }),

  setLoading: (loading) => set({ loading }),

  getFilteredAudio: (hiddenCfg) => {
    const state = get();
    if (!hiddenCfg.hideShortSongs) return state.audio;
    const minMs = (hiddenCfg.minDurationSeconds || 15) * 1000;
    return state.audio.filter((f) => {
      if (f.duration === undefined) return true;
      return f.duration >= minMs;
    });
  },

  getHiddenAudio: (hiddenCfg) => {
    const state = get();
    if (!hiddenCfg.hideShortSongs) return [];
    const minMs = (hiddenCfg.minDurationSeconds || 15) * 1000;
    return state.audio.filter((f) => f.duration !== undefined && f.duration < minMs);
  },
}));
