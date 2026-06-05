import { useMemo } from 'react';
import { useAllFiles } from '../useDomainSelectors';
import { SearchService } from '../../services/Search/SearchService';
import type { FileItem } from '../../types';

export function useSearchQuery(query: string): FileItem[] {
  const allFiles = useAllFiles();
  const trimmed = query.trim();

  return useMemo(() => {
    if (!trimmed) return [];
    return SearchService.search(trimmed, allFiles);
  }, [trimmed, allFiles]);
}
