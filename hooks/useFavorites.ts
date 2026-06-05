import { useCallback, useMemo } from 'react';
import { useFavoritesQuery, useToggleFavoriteMutation } from './queries/useStorageQueries';
import type { FileItem } from '../types';

export function useFavorites(allFiles: FileItem[]) {
  const { data: favoriteUris = [] } = useFavoritesQuery();
  const toggleMutation = useToggleFavoriteMutation();

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const favoriteFiles = useMemo(
    () => allFiles.filter((f) => favoriteUris.includes(f.uri)),
    [allFiles, favoriteUris]
  );

  return {
    favoriteUris,
    favoriteFiles,
    isFavorite,
    toggleFavorite: toggleMutation.mutate,
    toggleFavoriteAsync: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
