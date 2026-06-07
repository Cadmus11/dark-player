import { useCallback, useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import type { SortField, SortDirection, FileItem } from '../types';
import { formatFileSize, formatDuration } from '../utils/format';

export function useMediaFiles() {
  const store = useMediaStore();

  const sortedBy = useCallback((field: SortField, direction: SortDirection, items: FileItem[]) => {
    const arr = [...items];
    const dir = direction === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = (a.modifiedAt || 0) - (b.modifiedAt || 0);
          break;
        case 'size':
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case 'duration':
          cmp = (a.duration || 0) - (b.duration || 0);
          break;
        case 'type': {
          const ta = a.mimeType || a.name.split('.').pop() || '';
          const tb = b.mimeType || b.name.split('.').pop() || '';
          cmp = ta.localeCompare(tb);
          break;
        }
        case 'artist':
          cmp = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'album':
          cmp = (a.album || '').localeCompare(b.album || '');
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, []);

  const formatSize = useCallback((bytes?: number) => formatFileSize(bytes), []);
  const formatDurationFn = useCallback((ms?: number) => formatDuration(ms), []);

  const allFiles = useMemo(() => [...store.videos, ...store.audio], [store.videos, store.audio]);

  return {
    videos: store.videos,
    audio: store.audio,
    allFiles,
    loading: store.loading,
    scanProgress: store.scanProgress,
    scanStage: store.scanStage,
    permissionsGranted: store.permissionsGranted,
    error: store.error,

    scanMedia: store.scanMedia,
    loadCache: store.loadCache,
    sortedBy,
    formatSize,
    formatDuration: formatDurationFn,
  };
}
