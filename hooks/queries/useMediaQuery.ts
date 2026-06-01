import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { queryKeys } from './queryKeys';
import { fileEngine } from '../../engine/FileEngine';
import { useMediaStore } from '../../stores/mediaStore';
import { permissionService } from '../../services/PermissionService';
import { staleTimes, getQueryClient } from './QueryProvider';
import type { FileItem } from '../../types';

const CACHE_FRESH_MS = staleTimes.media;

function isCacheFresh(): boolean {
  if (!fileEngine.hasCache()) return false;
  return !fileEngine.shouldRescan();
}

async function fetchVideos(): Promise<FileItem[]> {
  if (isCacheFresh()) {
    return fileEngine.loadFromCache().videos;
  }
  const result = await fileEngine.scanAll();
  return result.videos;
}

async function fetchAudio(): Promise<FileItem[]> {
  if (isCacheFresh()) {
    return fileEngine.loadFromCache().audio;
  }
  const result = await fileEngine.scanAll();
  return result.audio;
}

function useCacheLoader() {
  useEffect(() => {
    if (fileEngine.hasCache()) {
      const cached = fileEngine.loadFromCache();
      const qc = getQueryClient();
      qc.setQueryData(queryKeys.media.videos(), cached.videos);
      qc.setQueryData(queryKeys.media.audio(), cached.audio);
    }
  }, []);
}

export function useVideosQuery() {
  useCacheLoader();

  return useQuery({
    queryKey: queryKeys.media.videos(),
    queryFn: fetchVideos,
    staleTime: CACHE_FRESH_MS,
    refetchOnMount: false,
  });
}

export function useAudioQuery() {
  useCacheLoader();

  return useQuery({
    queryKey: queryKeys.media.audio(),
    queryFn: fetchAudio,
    staleTime: CACHE_FRESH_MS,
    refetchOnMount: false,
  });
}

export function useMediaScanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await fileEngine.scanAll();
      return result;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.media.videos(), data.videos);
      queryClient.setQueryData(queryKeys.media.audio(), data.audio);
      useMediaStore.setState({
        videos: data.videos,
        audio: data.audio,
        loading: false,
        permissionsGranted: permissionService.isGranted(),
        scanProgress: 1,
      });
    },
  });
}

export function usePrefetchMedia() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (fileEngine.hasCache()) {
      const cached = fileEngine.loadFromCache();
      queryClient.setQueryData(queryKeys.media.videos(), cached.videos);
      queryClient.setQueryData(queryKeys.media.audio(), cached.audio);
      useMediaStore.setState({
        videos: cached.videos,
        audio: cached.audio,
        permissionsGranted: permissionService.isGranted(),
      });
    }
  }, [queryClient]);
}
