import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { lifecycleManager } from './LifecycleManager';
import { permissionService } from './PermissionService';
import { taskManager } from './Cancellation';
import { eventBus } from './EventBus';

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
    }
    usePlaylistStore.getState().load();
    useMediaStore.getState().setHydrationStage(2);
  },

  // Stage 3: Playback restoration + permission check
  async () => {
    await permissionService.checkMediaLibrary();
    if (status === 'GRANTED' || status === 'PARTIAL') {
      useMediaStore.setState({ permissionsGranted: true });
      if (!fileEngine.hasCache()) {
        useMediaStore.getState().scanMedia();
      }
    }
    useMediaStore.getState().setHydrationStage(3);
  },

  // Stage 4: Background scan if needed
  async () => {
    if (fileEngine.shouldRescan() && permissionService.isGranted()) {
      taskManager.createScope('background-scan');
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
        eventBus.emit('hydration:phase' as any, i + 1);
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
