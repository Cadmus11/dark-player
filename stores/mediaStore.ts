import { create } from 'zustand';
import type { FileItem, HiddenFilesSettings } from '../types';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from '../services/PermissionService';
import { taskManager, isCancelled } from '../services/Cancellation';
import { eventBus, AppEvents } from '../services/EventBus';
import { mediaRepository } from '../services/MediaRepository';
import { searchIndex } from '../services/SearchIndex';
import { collectionsIndex } from '../services/CollectionsIndex';

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
    mediaRepository.setAll(cached.videos, cached.audio);
    set({
      videos: cached.videos,
      audio: cached.audio,
      loading: false,
      permissionsGranted: permissionService.isGranted(),
      hydrationStage: 2,
    });
    searchIndex.buildChunked([...cached.audio, ...cached.videos]);
    collectionsIndex.buildChunked(cached.audio, cached.videos);
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

eventBus.on(AppEvents.ARTWORK_LOADED, (uri: string, artworkPath: string) => {
  const state = useMediaStore.getState();
  const findInArray = (files: FileItem[]): number => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].uri === uri) return i;
    }
    return -1;
  };

  const audioIdx = findInArray(state.audio);
  const videoIdx = findInArray(state.videos);
  const inAudio = audioIdx !== -1 && state.audio[audioIdx].thumbnail !== artworkPath;
  const inVideo = videoIdx !== -1 && state.videos[videoIdx].thumbnail !== artworkPath;

  if (!inAudio && !inVideo) return;

  if (inAudio) {
    const audio = state.audio.slice();
    audio[audioIdx] = { ...audio[audioIdx], thumbnail: artworkPath };
    useMediaStore.setState({ audio });
  }
  if (inVideo) {
    const videos = state.videos.slice();
    videos[videoIdx] = { ...videos[videoIdx], thumbnail: artworkPath };
    useMediaStore.setState({ videos });
  }
  fileEngine.setThumbnail(uri, artworkPath);
  mediaRepository.updateThumbnail(uri, artworkPath);
});

eventBus.on(AppEvents.METADATA_PARSED, (uri: string, metadata: any) => {
  mediaRepository.updateMetadata(uri, metadata);
  searchIndex.updateFile(mediaRepository.getByUri(uri)!);
  collectionsIndex.updateFile(mediaRepository.getByUri(uri)!);
});

eventBus.on(AppEvents.FILE_UPDATED, (uri: string, file: FileItem) => {
  if (file) {
    searchIndex.updateFile(file);
    collectionsIndex.updateFile(file);
  }
});
