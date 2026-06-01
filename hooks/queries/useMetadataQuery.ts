import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { MetadataService } from '../../services/Metadata/MetadataService';
import { staleTimes } from './QueryProvider';
import type { MediaMetadata } from '../../types';

export function useMetadataQuery(uri: string, fileName: string) {
  return useQuery({
    queryKey: queryKeys.metadata.byUri(uri),
    queryFn: async (): Promise<MediaMetadata> => {
      const cached = await MetadataService.getCached(uri);
      if (cached) return cached;
      return MetadataService.extract(uri, fileName);
    },
    staleTime: staleTimes.metadata,
    gcTime: staleTimes.metadata * 2,
    enabled: !!uri,
  });
}
