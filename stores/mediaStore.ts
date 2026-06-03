import { create } from 'zustand';
import type { FileItem, HiddenFilesSettings } from '../types';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from '../services/PermissionService';
import { taskManager, isCancelled } from '../services/Cancellation';
import { eventBus, AppEvents } from '../services/EventBus';
import { usePlaybackStore } from './playbackStore';

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
  scanIfGranted: () => Promise<void>;
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

  scanIfGranted: async () => {
    let permStatus = await permissionService.checkMediaLibrary();
    if (permStatus !== 'GRANTED' && permStatus !== 'PARTIAL') {
      permStatus = await permissionService.requestMediaLibrary();
    }
    if (permStatus === 'GRANTED' || permStatus === 'PARTIAL') {
      useMediaStore.setState({ permissionsGranted: true });
      if (!fileEngine.hasCache()) {
        await useMediaStore.getState().scanMedia();
      }
    }
  },

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

// Subscribe to permission changes — trigger scan when newly granted
permissionService.subscribe(() => {
  const granted = permissionService.isGranted();
  const state = useMediaStore.getState();
  if (state.permissionsGranted !== granted) {
    useMediaStore.setState({ permissionsGranted: granted });
    if (granted && !state.loading && !fileEngine.hasCache()) {
      useMediaStore.getState().scanMedia();
    }
  }
});

// Re-check permissions when app returns to foreground
eventBus.on(AppEvents.LIFECYCLE_FOREGROUND, async () => {
  const state = useMediaStore.getState();
  const prevGranted = state.permissionsGranted;
  await permissionService.checkMediaLibrary();
  const nowGranted = permissionService.isGranted();
  if (!prevGranted && nowGranted && !state.loading) {
    useMediaStore.setState({ permissionsGranted: true });
    useMediaStore.getState().scanMedia();
  }
});

// Subscribe to artwork loading to update thumbnails in real-time
eventBus.on(AppEvents.ARTWORK_LOADED, (uri: string, artworkPath: string) => {
  const state = useMediaStore.getState();
  let updated = false;

  const updateOne = (files: FileItem[]): FileItem[] => {
    const idx = files.findIndex((f) => f.uri === uri && f.thumbnail !== artworkPath);
    if (idx === -1) return files;
    updated = true;
    const copy = files.slice();
    copy[idx] = { ...copy[idx], thumbnail: artworkPath };
    return copy;
  };

  const audio = updateOne(state.audio);
  const videos = updateOne(state.videos);

  if (updated) {
    useMediaStore.setState({ audio, videos });
    fileEngine.setThumbnail(uri, artworkPath);
    const playbackState = usePlaybackStore.getState();
    if (playbackState.currentFile?.uri === uri) {
      usePlaybackStore.setState({
        currentFile: { ...playbackState.currentFile, thumbnail: artworkPath },
      });
    }
  }
});
