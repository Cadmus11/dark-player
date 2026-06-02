import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { lifecycleManager } from './LifecycleManager';
import { permissionService } from './PermissionService';
import { eventBus, AppEvents } from './EventBus';
import { getQueryClient } from '../hooks/queries/QueryProvider';
import { queryKeys } from '../hooks/queries/queryKeys';

type HydrationPhase = (() => Promise<void>)[];

const HYDRATION_PHASES: HydrationPhase = [
  // Stage 1: Theme, shell UI, navigation - synchronous
  async () => {
    useSettingsStore.getState().load();
    useMediaStore.getState().setHydrationStage(1);
  },

  // Stage 2: Cached media + playlists
  async () => {
    const mediaState = useMediaStore.getState();
    if (fileEngine.hasCache()) {
      mediaState.loadCache();
      const cached = fileEngine.loadFromCache();
      const qc = getQueryClient();
      qc.setQueryData(queryKeys.media.videos(), cached.videos);
      qc.setQueryData(queryKeys.media.audio(), cached.audio);
    }
    usePlaylistStore.getState().load();
    useMediaStore.getState().setHydrationStage(2);
  },

  // Stage 3: Playback restoration + permission request + initial scan
  async () => {
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
    useMediaStore.getState().setHydrationStage(3);
  },

  // Stage 4: Background scan if needed (skips if already loading)
  async () => {
    const store = useMediaStore.getState();
    if (!store.loading && fileEngine.shouldRescan() && permissionService.isGranted()) {
      useMediaStore.getState().scanMedia();
    }
    useMediaStore.getState().setHydrationStage(4);
  },

  // Stage 5: Artwork preloading, recommendations (deferred)
  async () => {
    await new Promise((r) => setTimeout(r, 2000));
    useMediaStore.getState().setHydrationStage(5);
  },
];

let _hydrationPromise: Promise<void> | null = null;

export function startHydration(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;

  _hydrationPromise = (async () => {
    lifecycleManager.initialize();
    for (let i = 0; i < HYDRATION_PHASES.length; i++) {
      try {
        await HYDRATION_PHASES[i]();
        eventBus.emit(AppEvents.HYDRATION_PHASE, i + 1);
      } catch {}
    }
  })();

  return _hydrationPromise;
}

export function useHydrationStage(): number {
  return useMediaStore((s) => s.hydrationStage);
}

export function isFullyHydrated(): boolean {
  return useMediaStore.getState().hydrationStage >= 5;
}
