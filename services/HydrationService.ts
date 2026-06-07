import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { permissionService } from './PermissionService';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useRecentsStore } from '../stores/recentsStore';
import { useSearchHistoryStore } from '../stores/searchHistoryStore';

let _hydrationPromise: Promise<void> | null = null;

export function startHydration(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;

  _hydrationPromise = (async () => {
    await Promise.all([
      useSettingsStore.getState().load(),
      (async () => {
        if (fileEngine.hasCache()) {
          useMediaStore.getState().loadCache();
        }
        usePlaylistStore.getState().load();
      })(),
      useFavoritesStore.getState().load(),
      useRecentsStore.getState().loadRecentFiles(),
      useRecentsStore.getState().loadRecentlyPlayed(),
      useSearchHistoryStore.getState().load(),
    ]);

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

    const store = useMediaStore.getState();
    if (!store.loading && fileEngine.shouldRescan() && permissionService.isGranted()) {
      useMediaStore.getState().scanMedia();
    }
  })();

  return _hydrationPromise;
}
