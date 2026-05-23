import { create } from 'zustand';
import type { FileItem, HiddenFilesSettings } from '../types';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from '../services/PermissionService';
import { taskManager, isCancelled } from '../services/Cancellation';

interface MediaStoreState {
  videos: FileItem[];
  audio: FileItem[];

  loading: boolean;
  scanProgress: number;
  scanStage: string;
  permissionsGranted: boolean;
  error: string | null;
  hydrationStage: number;

  scanMedia: () => Promise<void>;
  loadCache: () => void;
  setPermissionsGranted: (granted: boolean) => void;
  setLoading: (loading: boolean) => void;
  setHydrationStage: (stage: number) => void;
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
  hydrationStage: 0,

  setHydrationStage: (stage) => set({ hydrationStage: stage }),

  loadCache: () => {
    const cached = fileEngine.loadFromCache();
    set({
      videos: cached.videos,
      audio: cached.audio,
      loading: false,
      permissionsGranted: permissionService.isGranted(),
      hydrationStage: 2,
    });
  },

  scanMedia: async () => {
    taskManager.cancelScope('media-scan');
    const token = taskManager.createScope('media-scan');
    set({ loading: true, error: null, scanProgress: 0 });
    try {
      const result = await fileEngine.scanAll((progress, stage) => {
        set({ scanProgress: progress, scanStage: stage });
      }, token);
      set({
        videos: result.videos,
        audio: result.audio,
        loading: false,
        permissionsGranted: permissionService.isGranted(),
        scanProgress: 1,
        hydrationStage: 3,
      });
    } catch (e: any) {
      if (isCancelled(e)) {
        set({ loading: false });
        return;
      }
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

// Subscribe to permission changes
permissionService.subscribe(() => {
  const granted = permissionService.isGranted();
  const current = useMediaStore.getState().permissionsGranted;
  if (current !== granted) {
    useMediaStore.setState({ permissionsGranted: granted });
  }
});
