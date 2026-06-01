import { useCallback, useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { fileEngine } from '../engine/FileEngine';
import { useVideosQuery, useAudioQuery, useMediaScanMutation } from './queries/useMediaQuery';
import type { SortField, SortDirection, FileItem } from '../types';

export function useMediaFiles() {
  const store = useMediaStore();

  const videosQuery = useVideosQuery();
  const audioQuery = useAudioQuery();
  const scanMutation = useMediaScanMutation();

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

  const formatSize = useCallback((bytes?: number) => fileEngine.formatFileSize(bytes), []);
  const formatDuration = useCallback((ms?: number) => fileEngine.formatDuration(ms), []);

  const allFiles = useMemo(
    () => [...(videosQuery.data ?? store.videos), ...(audioQuery.data ?? store.audio)],
    [videosQuery.data, audioQuery.data, store.videos, store.audio]
  );

  return {
    videos: videosQuery.data ?? store.videos,
    audio: audioQuery.data ?? store.audio,
    allFiles,
    loading: store.loading || videosQuery.isLoading || audioQuery.isLoading,
    scanProgress: store.scanProgress,
    scanStage: store.scanStage,
    permissionsGranted: store.permissionsGranted,
    error: store.error || videosQuery.error?.message || audioQuery.error?.message || null,

    scanMedia: scanMutation.mutateAsync as unknown as () => Promise<void>,
    loadCache: store.loadCache,
    sortedBy,
    formatSize,
    formatDuration,
  };
}
