import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { queueEngine } from '../../engine/QueueEngine';
import { staleTimes } from './QueryProvider';
import type { PlaylistData } from '../../types';

export function usePlaylistsQuery() {
  return useQuery({
    queryKey: queryKeys.playlists.all,
    queryFn: (): PlaylistData[] => queueEngine.getAll(),
    staleTime: staleTimes.playlists,
  });
}
