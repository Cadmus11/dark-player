import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fileEngine } from '../../engine/FileEngine';
import { useMediaStore } from '../../stores/mediaStore';
import { permissionService } from '../../services/PermissionService';
import { staleTimes } from './QueryProvider';
import type { FileItem } from '../../types';

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

export function useVideosQuery() {
  return useQuery({
    queryKey: queryKeys.media.videos(),
    queryFn: fetchVideos,
    staleTime: staleTimes.media,
    refetchOnMount: false,
  });
}

export function useAudioQuery() {
  return useQuery({
    queryKey: queryKeys.media.audio(),
    queryFn: fetchAudio,
    staleTime: staleTimes.media,
    refetchOnMount: false,
  });
}

export function useMediaScanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return fileEngine.scanAll();
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
