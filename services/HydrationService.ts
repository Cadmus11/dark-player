import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from './PermissionService';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useRecentsStore } from '../stores/recentsStore';
import { useSearchHistoryStore } from '../stores/searchHistoryStore';
import { cacheManager } from './CacheManager';

let _hydrationPromise: Promise<void> | null = null;

export function startHydration(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;

  _hydrationPromise = (async () => {
    try {
      // Stage 1: Basic stores (settings, search history)
      await Promise.all([
        useSettingsStore.getState().load(),
        useSearchHistoryStore.getState().load(),
      ]);
      useMediaStore.getState().setHydrationStage(1);

      // Stage 2: Media data (cache, playlists, favorites, recents)
      await Promise.all([
        (async () => {
          if (fileEngine.hasCache()) {
            useMediaStore.getState().loadCache();
          }
          await usePlaylistStore.getState().load();
        })(),
        useFavoritesStore.getState().load(),
        useRecentsStore.getState().loadRecentFiles(),
        useRecentsStore.getState().loadRecentlyPlayed(),
      ]);
      useMediaStore.getState().setHydrationStage(2);

      // Stage 3: Post-hydration background tasks (permissions, scan, cleanup)
      // We don't await this block to prevent blocking the UI
      (async () => {
        let permStatus = await permissionService.checkMediaLibrary();
        // If not granted, we don't force request here; it will happen when the user navigates
        // or via the PermissionContainer if implemented.

        if (permStatus === 'GRANTED' || permStatus === 'PARTIAL') {
          useMediaStore.setState({ permissionsGranted: true });
          if (!fileEngine.hasCache()) {
            await useMediaStore.getState().scanMedia();
          } else if (fileEngine.shouldRescan()) {
            useMediaStore.getState().scanMedia();
          }
        }
        useMediaStore.getState().setHydrationStage(3);
        cacheManager.cleanup();
      })().catch((err) => console.error('[HydrationService] Background tasks failed:', err));
    } catch (e) {
      console.warn('[HydrationService] Hydration failed, will retry on next call:', e);
      _hydrationPromise = null;
    }
  })();

  return _hydrationPromise;
}
