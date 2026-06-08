import { useMemo } from 'react';
import { searchIndex } from '../services/SearchIndex';
import type { FileItem } from '../types';

export function useSearchQuery(query: string): FileItem[] {
  const trimmed = query.trim();

  return useMemo(() => {
    if (!trimmed) return [];
    return searchIndex.search(trimmed);
  }, [trimmed]);
}
