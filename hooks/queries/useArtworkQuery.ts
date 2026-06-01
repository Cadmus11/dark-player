import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { artworkService } from '../../services/ArtworkService';
import { staleTimes } from './QueryProvider';

export function useArtworkQuery(uri: string, fileName?: string) {
  return useQuery({
    queryKey: queryKeys.artwork.byUri(uri),
    queryFn: () => artworkService.getArtwork(uri, fileName),
    staleTime: staleTimes.artwork,
    gcTime: staleTimes.artwork * 2,
    enabled: !!uri,
  });
}
