import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from './queryKeys';
import { useAllFiles } from '../useDomainSelectors';
import { SearchService } from '../../services/Search/SearchService';
import type { FileItem } from '../../types';

export function useSearchQuery(query: string): FileItem[] {
  const allFiles = useAllFiles();

  const results = useQuery({
    queryKey: queryKeys.search.query(query.toLowerCase().trim()),
    queryFn: () => SearchService.search(query, allFiles),
    staleTime: Infinity,
    enabled: query.length > 0,
  });

  return useMemo(() => results.data ?? [], [results.data]);
}
