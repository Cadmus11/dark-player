import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from './PermissionService';
import { eventBus, AppEvents } from './EventBus';
import { DatabaseService } from './DatabaseService';
import { getQueryClient } from '../hooks/queries/QueryProvider';
import { queryKeys } from '../hooks/queries/queryKeys';

type HydrationPhase = (() => Promise<void>)[];

const HYDRATION_PHASES: HydrationPhase = [
  // Stage 1: Settings, cached media, playlists — all parallel
  async () => {
    await Promise.all([
      (async () => {
        useSettingsStore.getState().load();
      })(),
      (async () => {
        if (fileEngine.hasCache()) {
          useMediaStore.getState().loadCache();
          const cached = fileEngine.loadFromCache();
          const qc = getQueryClient();
          qc.setQueryData(queryKeys.media.videos(), cached.videos);
          qc.setQueryData(queryKeys.media.audio(), cached.audio);
        }
        usePlaylistStore.getState().load();
      })(),
      DatabaseService.prewarm().catch(() => {}),
    ]);
    useMediaStore.getState().setHydrationStage(1);
  },

  // Stage 2: Permission check + initial scan (if no cache)
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
    useMediaStore.getState().setHydrationStage(2);
  },

  // Stage 3: Background scan if stale cache (fast, non-blocking if cached)
  async () => {
    const store = useMediaStore.getState();
    if (!store.loading && fileEngine.shouldRescan() && permissionService.isGranted()) {
      useMediaStore.getState().scanMedia();
    }
    useMediaStore.getState().setHydrationStage(3);
  },

  // Stage 4: Deferred — artwork preloading, recommendations (after idle)
  async () => {
    await new Promise<void>((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => resolve(), { timeout: 3000 });
      } else {
        setTimeout(resolve, 500);
      }
    });
    useMediaStore.getState().setHydrationStage(4);
  },
];

let _hydrationPromise: Promise<void> | null = null;

export function startHydration(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;

  _hydrationPromise = (async () => {
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
  return useMediaStore.getState().hydrationStage >= 4;
}
