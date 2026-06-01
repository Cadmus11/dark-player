import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StorageService } from '../services/StorageService';
import { useFavoritesQuery } from './queries/useStorageQueries';
import { queryKeys } from './queries/queryKeys';
import type { FileItem } from '../types';

export function useFavorites(allFiles: FileItem[]) {
  const queryClient = useQueryClient();
  const { data: favoriteUris = [] } = useFavoritesQuery();

  const toggleFavorite = useCallback(
    async (uri: string) => {
      const updated = await StorageService.toggleFavorite(uri);
      queryClient.setQueryData(queryKeys.storage.favorites(), updated);
      return updated;
    },
    [queryClient]
  );

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const favoriteFiles = allFiles.filter((f) => favoriteUris.includes(f.uri));

  return { favoriteUris, favoriteFiles, toggleFavorite, isFavorite };
}
